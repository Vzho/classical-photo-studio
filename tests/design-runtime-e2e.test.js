// 装修 v3 端到端编译验证（方案 §13.3、M2 退出条件）：
// 服务端（草稿→校验→编译→发布）产出的运行时配置，交给小程序端
// （v25-adapter → config-service → render-service → theme-service）全链路验证。
// 运行：node --test tests/design-runtime-e2e.test.js
const test = require('node:test')
const assert = require('node:assert/strict')
const fsp = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const SHARED = path.join(ROOT, 'shared/decoration')
const MINI = path.join(ROOT, 'miniprogram')

const { createDesignWorkspace } = require(path.join(ROOT, 'admin/server/services/design-workspace'))
const { createDesignValidator } = require(path.join(ROOT, 'admin/server/validation/design-validator'))
const { createRuntimeCompiler } = require(path.join(ROOT, 'admin/server/services/runtime-compiler'))
const { createFakePublisher } = require(path.join(ROOT, 'admin/server/services/cos-publisher'))
const { createReleaseService, FIXED_CONFIG_KEY } = require(path.join(ROOT, 'admin/server/services/release-service'))

// 小程序编译产物为 CommonJS，在 Node 中为 wx 全局打桩后直接复用客户端代码。
global.getApp = global.getApp || (() => ({ globalData: { cos: { baseUrl: 'https://example-cdn.cos.ap-shanghai.myqcloud.com' } } }))
global.wx = global.wx || { getStorageSync: () => null, setStorageSync: () => {}, request: () => {} }

const { adaptV25ToRuntime, isV3Runtime } = require(path.join(MINI, 'compatibility/v25-adapter.js'))
const { resolveConfigRuntime, shouldUseBlocksV3 } = require(path.join(MINI, 'services/config-service.js'))
const { preparePageRender } = require(path.join(MINI, 'services/render-service.js'))

const contentRich = JSON.parse(
  require('node:fs').readFileSync(path.join(ROOT, 'tests/fixtures/v25/content-rich-v25.json'), 'utf-8')
)
const emptySkeleton = JSON.parse(
  require('node:fs').readFileSync(path.join(ROOT, 'tests/fixtures/v25/default-v25.json'), 'utf-8')
)

async function buildStack() {
  const registry = JSON.parse(await fsp.readFile(path.join(SHARED, 'registry.json'), 'utf-8'))
  const blockSchemas = {}
  for (const [type, meta] of Object.entries(registry.blocks)) {
    blockSchemas[type] = JSON.parse(await fsp.readFile(path.join(SHARED, meta.settingsSchema), 'utf-8'))
  }
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'v3-e2e-'))
  const workspace = createDesignWorkspace({
    workspaceDir: path.join(tmp, 'workspace'),
    templatesDir: path.join(SHARED, 'templates'),
    backupsDir: path.join(tmp, 'backups')
  })
  const validator = createDesignValidator({ registry, blockSchemas })
  const compiler = createRuntimeCompiler({ registry, blockSchemas })
  const publisher = createFakePublisher()
  const releaseService = createReleaseService({
    releasesDir: path.join(tmp, 'releases'),
    publisher,
    workspace,
    validator,
    compiler
  })
  return { registry, workspace, validator, compiler, publisher, releaseService }
}

async function publishWithContent(contentConfig) {
  const stack = await buildStack()
  const draft = await stack.workspace.createDraftFromTemplate('legacy-editorial-v3')
  await stack.workspace.writeDraft(draft)
  const design = await stack.workspace.readDraft()
  const result = await stack.releaseService.publish({ contentConfig, design })
  const uploaded = stack.publisher.uploads.find((item) => item.key === FIXED_CONFIG_KEY)
  assert.ok(uploaded, '发布必须上传固定运行配置路径')
  return { stack, result, runtime: uploaded.data }
}

test('带内容编译：四页全部产出且区块契约完整', async () => {
  const { result, runtime } = await publishWithContent(contentRich)

  assert.equal(runtime.engine, 'blocks-v3')
  assert.equal(runtime.designSchemaVersion, '3.1.0')
  assert.equal(runtime.templateId, 'legacy-editorial-v3')
  assert.ok(runtime.designTokens.fontPair, '模板 Token 必须进入运行时')
  assert.deepEqual(result.compiledPages.sort(), ['about', 'packages', 'portfolio', 'series'])

  const registeredTypes = new Set(Object.keys(require(path.join(SHARED, 'registry.json')).blocks))
  for (const [pageKey, page] of Object.entries(runtime.v3Pages)) {
    assert.ok(page.blocks.length > 0, `页面 ${pageKey} 必须编译出区块`)
    for (const block of page.blocks) {
      assert.ok(registeredTypes.has(block.type), `${pageKey}/${block.id} 区块类型必须已注册`)
      assert.ok(block.rendererKey, `${pageKey}/${block.id} 必须携带 rendererKey`)
      assert.equal(block.enabled, true)
      assert.ok(block.settings && typeof block.settings === 'object')
    }
  }
  assert.deepEqual(result.warnings, [], '内容完整时不应产生关闭警告')
})

test('客户端全链路：portfolio 页渲染模型', async () => {
  const { runtime } = await publishWithContent(contentRich)
  assert.equal(isV3Runtime(runtime), true)

  const v3Runtime = resolveConfigRuntime(runtime)
  assert.equal(v3Runtime.adaptedFrom, 'v3-runtime')
  assert.equal(shouldUseBlocksV3(v3Runtime, 'portfolio'), true)
  assert.equal(shouldUseBlocksV3(v3Runtime, 'booking'), false, 'booking 未区块化，走主题跟随')

  const prepared = preparePageRender(v3Runtime, contentRich, 'portfolio')
  assert.ok(prepared && prepared.useV3)
  assert.ok(prepared.theme.style.includes('--v3-color-accent:#111111'))
  assert.ok(prepared.theme.tokens.buttonStyle)
  assert.ok(prepared.blocks.length > 0)

  const byType = {}
  for (const item of prepared.blocks) {
    byType[item.block.type] = byType[item.block.type] || []
    byType[item.block.type].push(item)
  }
  assert.ok(byType.hero?.[0]?.available, 'hero 精选数据可用')
  assert.ok(Array.isArray(byType['portfolio-grid']?.[0]?.content), 'portfolio-grid 内容为列表')
  for (const item of prepared.blocks) {
    if (item.block.dataSource.type !== 'current-series') {
      assert.equal(item.available, true, `区块 ${item.block.type} 内容应可用`)
    }
  }
})

test('客户端全链路：series 页 current-series 依赖运行时参数', async () => {
  const { runtime } = await publishWithContent(contentRich)
  const v3Runtime = resolveConfigRuntime(runtime)

  const withoutCtx = preparePageRender(v3Runtime, contentRich, 'series')
  const heroNoCtx = withoutCtx.blocks.find((item) => item.block.dataSource.type === 'current-series')
  assert.equal(heroNoCtx.available, false, '无 seriesId 时 current-series 不可用')

  const withCtx = preparePageRender(v3Runtime, contentRich, 'series', { seriesId: 'series-gufeng-hanfu' })
  const hero = withCtx.blocks.find((item) => item.block.dataSource.type === 'current-series')
  assert.ok(hero.available)
  assert.equal(hero.content.title, '汉服正装')
  assert.equal(hero.content.photos.length, 3)

  const gallery = withCtx.blocks.find((item) => item.block.type === 'series-gallery')
  assert.ok(gallery?.available, 'series-gallery 与 hero 共享 current-series 数据')
})

test('空内容骨架：内容缺失区块编译期自动关闭且不白屏', async () => {
  const { result, runtime } = await publishWithContent(emptySkeleton)

  const closedTypes = new Set()
  for (const warning of result.warnings) {
    if (warning.includes('因内容缺失自动关闭')) closedTypes.add(warning)
  }
  assert.ok(closedTypes.size > 0, '空内容必须触发自动关闭警告')

  for (const page of Object.values(runtime.v3Pages)) {
    for (const block of page.blocks) {
      assert.notEqual(block.dataSource.type, 'packages', '套餐为空时 package-list 必须关闭')
      assert.notEqual(block.dataSource.type, 'team', '团队为空时 team 必须关闭')
      assert.notEqual(block.dataSource.type, 'testimonials', '评价为空时 testimonials 必须关闭')
    }
  }

  // 客户端侧：剩余区块解析不抛错，页面仍可渲染。
  const v3Runtime = resolveConfigRuntime(runtime)
  const prepared = preparePageRender(v3Runtime, emptySkeleton, 'portfolio')
  assert.ok(prepared, '空内容页面仍应有渲染模型')
  for (const item of prepared.blocks) assert.equal(typeof item.available, 'boolean')
})

test('v2.5 存量配置：只读适配且双引擎可判断', () => {
  const legacy = JSON.parse(JSON.stringify(emptySkeleton))
  legacy.decoration = {
    pages: {
      home: {
        skeleton: 'editorial',
        modules: [
          { id: 'm1', type: 'hero', enabled: true },
          { id: 'm2', type: 'portfolio', enabled: true },
          { id: 'm3', type: 'mystery-widget', enabled: true }
        ]
      }
    },
    navigation: { items: [{ key: 'portfolio', enabled: true }], portfolioText: '作品' }
  }
  const snapshot = JSON.stringify(legacy)

  const runtime = adaptV25ToRuntime(legacy)
  assert.equal(runtime.adaptedFrom, 'v2.5')
  assert.equal(runtime.templateId, 'legacy-editorial-studio')
  assert.ok(runtime.v3Pages.portfolio, 'home → portfolio 映射')
  assert.equal(JSON.stringify(legacy), snapshot, '适配必须只读，不修改入参')

  const blocks = runtime.v3Pages.portfolio.blocks
  assert.equal(blocks[0].type, 'hero')
  assert.equal(blocks[2].legacy, true, '未知模块降级为 legacy 占位')
  assert.equal(shouldUseBlocksV3(runtime, 'portfolio'), true)

  const prepared = preparePageRender(runtime, contentRich, 'portfolio')
  assert.ok(prepared.useV3, 'v2.5 存量配置适配后也能走 v3 渲染')
})
