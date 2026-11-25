// 小程序多租户配置加载逻辑测试（SaaS Sprint1 任务 1.1 / PRD C-01 C-05）。
//
// 核心保证：
//   1. AppID 识别成功 → 请求 tenants/{appId}/config.json，未迁移自动回退 legacy key；
//   2. draft 模式仅拉 draft.json（实时预览，不读不写缓存）；
//   3. 服务状态熔断：expired/suspended → reLaunch 维护页；存量配置与 draft 模式豁免；
//   4. 缓存 key 按租户隔离；
//   5. AppID 识别失败 → 兼容存量小程序（legacy 路径）。
//
// 注意：直接加载 miniprogram 编译产物（.js，已 gitignore、本地 tsc 生成）。
// 运行：node --test tests/miniprogram-tenant-loader.test.js
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const UTILS = path.join(ROOT, 'miniprogram/utils')

function setupWxMocks(overrides = {}) {
  const state = {
    requests: [],
    store: {},
    appId: overrides.appId !== undefined ? overrides.appId : 'wxTest123',
    mode: overrides.mode || 'published',
    responses: overrides.responses || {}
  }
  global.wx = {
    getAccountInfoSync: () => {
      if (state.appId === null) throw new Error('not available')
      return { miniProgram: { appId: state.appId } }
    },
    getLaunchOptionsSync: () => ({ query: state.mode === 'draft' ? { mode: 'draft' } : {} }),
    getEnterOptionsSync: () => ({ query: state.mode === 'draft' ? { mode: 'draft' } : {} }),
    getStorageSync: (k) => state.store[k] || null,
    setStorageSync: (k, v) => { state.store[k] = v },
    request: (opts) => {
      state.requests.push(opts.url.split('?')[0])
      const key = opts.url.slice('https://example.cos.test/'.length).split('?')[0]
      const r = state.responses[key]
      setTimeout(() => {
        if (!r || r.status !== 200) return opts.fail && opts.fail({ errMsg: 'HTTP ' + (r ? r.status : 404) })
        opts.success({ statusCode: 200, data: r.body })
      }, 0)
    },
    reLaunch: (o) => { state.store.__relaunch = o.url }
  }
  global.getApp = () => ({ globalData: { cos: { baseUrl: 'https://example.cos.test' } } })
  return state
}

function freshModule(rel) {
  delete require.cache[require.resolve(path.join(UTILS, rel))]
  return require(path.join(UTILS, rel))
}

test('T1 AppID 识别成功时解析租户路径（config/draft/legacy）', () => {
  setupWxMocks()
  const resolver = freshModule('tenant-resolver')
  const paths = resolver.resolveTenantPaths()
  assert.equal(paths.appId, 'wxTest123')
  assert.equal(paths.isTenantMode, true)
  assert.equal(paths.configKey, 'tenants/wxTest123/config.json')
  assert.equal(paths.draftKey, 'tenants/wxTest123/draft.json')
  assert.equal(paths.legacyKey, 'config/portfolio-config.json')
})

test('T2 租户路径未迁移时正式模式自动回退 legacy', async () => {
  const state = setupWxMocks({
    responses: { 'config/portfolio-config.json': { status: 200, body: { themes: [{ id: 't1', series: [] }] } } }
  })
  freshModule('tenant-resolver')
  const loader = freshModule('config-loader')
  const result = await loader.fetchRemoteTenantConfig()
  assert.equal(result.sourceKey, 'config/portfolio-config.json')
  assert.deepEqual(state.requests, [
    'https://example.cos.test/tenants/wxTest123/config.json',
    'https://example.cos.test/config/portfolio-config.json'
  ])
})

test('T3 租户配置存在时不回退 legacy', async () => {
  const state = setupWxMocks({
    responses: { 'tenants/wxTest123/config.json': { status: 200, body: { themes: [], meta: { serviceStatus: 'active' } } } }
  })
  freshModule('tenant-resolver')
  const loader = freshModule('config-loader')
  const result = await loader.fetchRemoteTenantConfig()
  assert.equal(result.sourceKey, 'tenants/wxTest123/config.json')
  assert.equal(state.requests.length, 1)
})

test('T4 draft 模式仅拉 draft.json 且不读不写缓存', async () => {
  const state = setupWxMocks({ mode: 'draft' })
  freshModule('tenant-resolver')
  const loader = freshModule('config-loader')
  await assert.rejects(() => loader.fetchRemoteTenantConfig())
  assert.deepEqual(state.requests, ['https://example.cos.test/tenants/wxTest123/draft.json'])
  assert.equal(loader.readTenantCachedConfig('wxTest123'), null, 'draft 不读缓存')
  loader.rememberTenantConfig('wxTest123', { themes: [] })
  assert.equal(Object.keys(state.store).filter((k) => k.includes('tenant-config-cache')).length, 0, 'draft 不写缓存')
})

test('T5 服务状态熔断：expired/suspended 跳维护页，存量与 draft 豁免', () => {
  const state = setupWxMocks()
  freshModule('tenant-resolver')
  const loader = freshModule('config-loader')
  assert.equal(loader.enforceServiceStatus({ meta: { serviceStatus: 'expired' } }), false)
  assert.equal(state.store.__relaunch, '/pages/suspended/suspended')
  assert.equal(loader.enforceServiceStatus({ meta: { serviceStatus: 'suspended' } }), false)
  // 存量配置（无 meta）不熔断，避免误伤未迁移租户
  assert.equal(loader.enforceServiceStatus({ themes: [] }), true)
  // draft 预览模式不熔断（需要看到真实状态）
  state.mode = 'draft'
  assert.equal(loader.enforceServiceStatus({ meta: { serviceStatus: 'expired' } }), true)
})

test('T6 缓存 key 按租户隔离', () => {
  const state = setupWxMocks()
  freshModule('tenant-resolver')
  const loader = freshModule('config-loader')
  loader.rememberTenantConfig('wxTest123', { themes: [] })
  assert.ok(state.store['tenant-config-cache-wxTest123'])
})

test('T7 AppID 识别失败时兼容存量小程序（legacy 路径）', () => {
  setupWxMocks({ appId: null })
  const resolver = freshModule('tenant-resolver')
  const paths = resolver.resolveTenantPaths()
  assert.equal(paths.isTenantMode, false)
  assert.equal(paths.configKey, 'config/portfolio-config.json')
})

test('T8 image-optimizer：WebP 缩略与文字水印参数拼接', () => {
  setupWxMocks()
  freshModule('tenant-resolver')
  const img = freshModule('image-optimizer')
  const thumb = img.withThumb('photos/a.jpg', 400)
  assert.ok(thumb.startsWith('https://example.cos.test/photos/a.jpg?imageMogr2/format/webp/thumbnail/400x'), thumb)
  const wm = img.withWatermark('https://example.cos.test/photos/a.jpg', '山海影像')
  assert.ok(wm.includes('watermark/1/text/'), wm)
  assert.equal(img.withThumb('', 400), '', '空 URL 容错')
  assert.equal(img.withWatermark('https://example.cos.test/a.jpg', ''), 'https://example.cos.test/a.jpg', '空文本容错')
})

test('T9 normalizeConfigV3：字段缺失防御性兜底', () => {
  setupWxMocks()
  const { normalizeConfigV3 } = require(path.join(ROOT, 'miniprogram/services/config-service'))
  const raw = { themes: [], v3Pages: { portfolio: { blocks: [{ type: 'hero' }, null, 'bad'] }, broken: 42 } }
  const out = normalizeConfigV3(raw)
  assert.equal(out.meta.serviceStatus, 'active', 'meta 缺失补默认')
  assert.equal(out.v3Pages.portfolio.blocks.length, 1, '剔除非对象区块')
  assert.ok(!('broken' in out.v3Pages), '剔除非对象页面')
  assert.deepEqual(out.designTokens, {}, 'designTokens 兜底')
})
