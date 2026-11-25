// 装修 v3 草稿预览集成测试（方案 §13.3）。
//
// 核心保证：预览是纯只读操作 ——
//   1. 预览编译的是「草稿」，线上跑的是「发布稿」，两者互不干扰；
//   2. 预览不写任何文件（draft / published 都不变）；
//   3. 预览不上传 COS（用户访问完全不受影响）；
//   4. 预览所用 compiler 与发布完全相同，保证「预览所见 = 发布所得」。
//
// 运行：node --test tests/design-preview-flow.test.js
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const { createDesignWorkspace, deepClone } = require(path.join(ROOT, 'admin/server/services/design-workspace'))
const { createDesignValidator } = require(path.join(ROOT, 'admin/server/validation/design-validator'))
const { createRuntimeCompiler } = require(path.join(ROOT, 'admin/server/services/runtime-compiler'))
const { createContentResolver } = require(path.join(ROOT, 'admin/server/services/content-resolver'))
const { createFakePublisher } = require(path.join(ROOT, 'admin/server/services/cos-publisher'))
const { createReleaseService } = require(path.join(ROOT, 'admin/server/services/release-service'))

const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/decoration/registry.json'), 'utf-8'))
const blockSchemas = Object.fromEntries(
  Object.entries(registry.blocks).map(([blockType, meta]) => [
    blockType,
    JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/decoration', meta.settingsSchema), 'utf-8'))
  ])
)
const fixtureConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/v25/default-v25.json'), 'utf-8'))

function makeContentConfig() {
  const config = deepClone(fixtureConfig)
  config.theme = { brandName: '测试影棚', slogan: '记录光与影' }
  config.themes = [{
    id: 'theme-1',
    name: '人像',
    series: [{ id: 'series-1', title: '测试系列', photos: ['a.jpg', 'b.jpg'] }]
  }]
  config.packages = [{ id: 'pkg-1', name: '体验套餐', price: '¥ 6,800' }]
  config.photographers = [{ id: 'p-1', name: '摄影师' }]
  config.testimonials = [{ id: 't-1', content: '好评' }]
  config.serviceFlow = { enabled: true, steps: [{ title: '咨询' }] }
  config.stores = [{ id: 's-1', name: '总店' }]
  return config
}

function makeEnv() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'decoration-preview-test-'))
  const workspace = createDesignWorkspace({
    workspaceDir: path.join(base, 'workspace'),
    templatesDir: path.join(ROOT, 'shared/decoration/templates'),
    backupsDir: path.join(base, 'backups')
  })
  const validator = createDesignValidator({ registry, blockSchemas })
  const compiler = createRuntimeCompiler({ registry, blockSchemas })
  const contentResolver = createContentResolver()
  const publisher = createFakePublisher({ failKeys: [] })
  const releaseService = createReleaseService({
    releasesDir: path.join(base, 'releases'),
    publisher,
    workspace,
    validator,
    compiler
  })
  return { base, workspace, validator, compiler, contentResolver, publisher, releaseService }
}

/**
 * 复刻 admin/server/routes/design.js 中 GET /api/design/preview 的核心逻辑。
 * 保持与真实路由同源，避免测试通过但线上行为不同。
 */
async function buildPreview(env, contentConfig) {
  const draft = await env.workspace.readDraft()
  if (!draft) return null

  const template = await env.workspace.readTemplate(draft.templateId)
  const { runtime, warnings, compiledPages } = env.compiler.compileRuntime({
    contentConfig,
    publishedDesign: draft,
    templateManifest: template
  })
  env.contentResolver.attachBlockContent(runtime, contentConfig, { cosBaseUrl: 'https://example.cos.test' })

  const published = await env.workspace.readPublished()
  return {
    runtime,
    warnings,
    compiledPages,
    published,
    hasUnpublishedChanges: published
      ? JSON.stringify({ ...published, updatedAt: null }) !== JSON.stringify({ ...draft, updatedAt: null })
      : true
  }
}

async function cleanup(base) {
  await fsp.rm(base, { recursive: true, force: true })
}

test('预览不上传 COS，也不写 published', async () => {
  const env = makeEnv()
  try {
    const draft = await env.workspace.createDraftFromTemplate('legacy-editorial-v3')
    await env.workspace.writeDraft(draft)

    const preview = await buildPreview(env, makeContentConfig())

    assert.ok(preview, '预览应成功产出')
    assert.equal(env.publisher.uploads.length, 0, '预览不得产生任何 COS 上传')
    assert.equal(await env.workspace.readPublished(), null, '预览不得写入 published')
  } finally {
    await cleanup(env.base)
  }
})

test('预览不修改草稿内容', async () => {
  const env = makeEnv()
  try {
    const draft = await env.workspace.createDraftFromTemplate('legacy-editorial-v3')
    await env.workspace.writeDraft(draft)
    const before = await env.workspace.readDraft()

    await buildPreview(env, makeContentConfig())

    const after = await env.workspace.readDraft()
    assert.deepEqual(after, before, '预览是只读的，草稿不应被修改')
  } finally {
    await cleanup(env.base)
  }
})

test('预览编译的是草稿，与线上发布稿互不干扰', async () => {
  const env = makeEnv()
  try {
    const contentConfig = makeContentConfig()

    // 先发布 A 版，线上锁定 A。
    const draftA = await env.workspace.createDraftFromTemplate('legacy-editorial-v3')
    await env.releaseService.publish({ contentConfig, design: draftA })
    const uploadsAfterPublish = env.publisher.uploads.length

    // 再把草稿改成 B 版（只保存，不发布）。
    const draftB = deepClone(draftA)
    draftB.brand = { name: '第二版品牌名' }
    await env.workspace.writeDraft(draftB)

    const preview = await buildPreview(env, contentConfig)

    // 预览看到的是 B（草稿）
    assert.equal(preview.runtime.theme.brandName, '第二版品牌名', '预览应反映最新草稿')
    // 线上仍然是 A（published）
    const published = await env.workspace.readPublished()
    assert.equal(published.brand.name, undefined, 'published 不应被草稿污染')
    assert.equal(env.publisher.uploads.length, uploadsAfterPublish, '预览不得新增 COS 上传')
  } finally {
    await cleanup(env.base)
  }
})

test('预览结果与发布编译结果结构一致（预览所见 = 发布所得）', async () => {
  const env = makeEnv()
  try {
    const contentConfig = makeContentConfig()
    const draft = await env.workspace.createDraftFromTemplate('legacy-editorial-v3')
    await env.workspace.writeDraft(draft)

    const template = await env.workspace.readTemplate(draft.templateId)
    const previewCompile = env.compiler.compileRuntime({
      contentConfig,
      publishedDesign: draft,
      templateManifest: template
    })
    const publishCompile = env.compiler.compileRuntime({
      contentConfig,
      publishedDesign: draft,
      templateManifest: template
    })

    // 同一 compiler、同一输入 → 结构完全一致（内容字段由 resolver 追加，忽略即可）
    const strip = (runtime) => {
      const copy = deepClone(runtime)
      for (const page of Object.values(copy.v3Pages || {})) {
        for (const block of page.blocks || []) {
          delete block.content
          delete block.contentAvailable
        }
      }
      delete copy.__previewPages
      return copy
    }
    assert.deepEqual(strip(previewCompile.runtime), strip(publishCompile.runtime))
  } finally {
    await cleanup(env.base)
  }
})

test('预览带出真实内容，区块内容与小程序口径一致', async () => {
  const env = makeEnv()
  try {
    const contentConfig = makeContentConfig()
    const draft = await env.workspace.createDraftFromTemplate('legacy-editorial-v3')
    await env.workspace.writeDraft(draft)

    const preview = await buildPreview(env, contentConfig)
    const pages = preview.runtime.v3Pages || {}
    assert.ok(Object.keys(pages).length > 0, '预览应产出页面')

    // 找出有内容的区块，验证内容非空且图片 URL 用了注入的 COS 前缀。
    let checkedBlocks = 0
    let checkedImages = 0
    for (const page of Object.values(pages)) {
      for (const block of page.blocks || []) {
        if (!block.contentAvailable || !block.content) continue
        checkedBlocks += 1
        // 只有作品列表型数据源才带图片地址（hero 的数据源可能是 brand，属对象）。
        if (block.dataSource?.type === 'featured-series') {
          const list = Array.isArray(block.content) ? block.content : []
          assert.ok(list.length > 0, `${block.type} 应有作品内容`)
          assert.ok(
            String(list[0].imageUrl || '').startsWith('https://example.cos.test/'),
            '图片地址应使用注入的 COS 前缀'
          )
          checkedImages += 1
        }
      }
    }
    assert.ok(checkedBlocks > 0, '至少应有区块带出真实内容')
    assert.ok(checkedImages > 0, '至少应有带图片的区块（featured-series 数据源）')
  } finally {
    await cleanup(env.base)
  }
})

test('内容解析器遵循 modules 开关（与小程序一致）', async () => {
  const env = makeEnv()
  try {
    const contentConfig = makeContentConfig()
    contentConfig.modules = { ...(contentConfig.modules || {}), packages: false }

    const result = env.contentResolver.resolveBlockContent(contentConfig, { type: 'packages' })
    assert.equal(result.available, false, 'packages 模块关闭时应判定内容不可用')
  } finally {
    await cleanup(env.base)
  }
})

test('预览接口在无草稿时返回可识别的错误', async () => {
  const env = makeEnv()
  try {
    const preview = await buildPreview(env, makeContentConfig())
    assert.equal(preview, null, '无草稿时预览应返回空')
  } finally {
    await cleanup(env.base)
  }
})
