// 装修 v3 发布流程集成测试（方案 §13.3），使用内存假 COS Publisher。
// 运行：node --test tests/design-publish-flow.test.js
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
const { createFakePublisher } = require(path.join(ROOT, 'admin/server/services/cos-publisher'))
const { createReleaseService, FIXED_CONFIG_KEY, RELEASE_KEY_PREFIX } = require(path.join(ROOT, 'admin/server/services/release-service'))

const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/decoration/registry.json'), 'utf-8'))
const blockSchemas = Object.fromEntries(
  Object.entries(registry.blocks).map(([blockType, meta]) => [
    blockType,
    JSON.parse(fs.readFileSync(path.join(ROOT, 'shared/decoration', meta.settingsSchema), 'utf-8'))
  ])
)
const fixtureConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/v25/default-v25.json'), 'utf-8'))

// 给空内容 Fixture 注入最小内容，让区块通过“内容可用性”检查。
function makeContentConfig() {
  const config = deepClone(fixtureConfig)
  config.themes = [{ id: 'theme-1', name: '人像', series: [{ id: 'series-1', title: '测试系列', photos: [] }] }]
  config.packages = [{ id: 'pkg-1', name: '体验套餐' }]
  config.photographers = [{ id: 'p-1', name: '摄影师' }]
  config.testimonials = [{ id: 't-1', content: '好评' }]
  config.serviceFlow = { enabled: true, steps: [{ title: '咨询' }] }
  config.stores = [{ id: 's-1', name: '总店' }]
  return config
}

function makeEnv({ failKeys = [] } = {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'decoration-v3-test-'))
  const workspace = createDesignWorkspace({
    workspaceDir: path.join(base, 'workspace'),
    templatesDir: path.join(ROOT, 'shared/decoration/templates'),
    backupsDir: path.join(base, 'backups')
  })
  const validator = createDesignValidator({ registry, blockSchemas })
  const compiler = createRuntimeCompiler({ registry, blockSchemas })
  const publisher = createFakePublisher({ failKeys })
  const releaseService = createReleaseService({
    releasesDir: path.join(base, 'releases'),
    publisher,
    workspace,
    validator,
    compiler
  })
  return { base, workspace, validator, compiler, publisher, releaseService }
}

async function cleanup(base) {
  await fsp.rm(base, { recursive: true, force: true })
}

test('草稿保存只写本地，绝不上传 COS', async () => {
  const env = makeEnv()
  try {
    const draft = await env.workspace.createDraftFromTemplate('legacy-editorial-v3')
    await env.workspace.writeDraft(draft)
    assert.equal(env.publisher.uploads.length, 0)
    const saved = await env.workspace.readDraft()
    assert.equal(saved.templateId, 'legacy-editorial-v3')
    assert.equal(saved.engine, 'blocks-v3')
  } finally {
    await cleanup(env.base)
  }
})

test('校验失败阻止发布，且不产生任何上传', async () => {
  const env = makeEnv()
  try {
    const draft = await env.workspace.createDraftFromTemplate('legacy-editorial-v3')
    draft.pages.portfolio.blocks[0].variant = 'not-a-real-variant'
    await assert.rejects(
      () => env.releaseService.publish({ contentConfig: makeContentConfig(), design: draft }),
      (error) => error.name === 'DesignValidationError'
    )
    assert.equal(env.publisher.uploads.length, 0)
    assert.equal(await env.workspace.readPublished(), null)
  } finally {
    await cleanup(env.base)
  }
})

test('发布按原子顺序上传：release 快照先于固定配置路径', async () => {
  const env = makeEnv()
  try {
    const draft = await env.workspace.createDraftFromTemplate('legacy-editorial-v3')
    const result = await env.releaseService.publish({ contentConfig: makeContentConfig(), design: draft })
    assert.ok(result.releaseId)
    const keys = env.publisher.uploads.map((item) => item.key)
    assert.equal(keys.length, 2)
    assert.ok(keys[0].startsWith(RELEASE_KEY_PREFIX), 'release 快照应先上传')
    assert.equal(keys[1], FIXED_CONFIG_KEY)
    const published = await env.workspace.readPublished()
    assert.equal(published.templateId, 'legacy-editorial-v3')
    const releases = await env.releaseService.listReleases()
    assert.equal(releases[0].status, 'published')
    assert.equal(releases[0].current, true)
  } finally {
    await cleanup(env.base)
  }
})

test('固定配置上传失败时不更新 published design', async () => {
  const env = makeEnv({ failKeys: [FIXED_CONFIG_KEY] })
  try {
    const draft = await env.workspace.createDraftFromTemplate('legacy-editorial-v3')
    await assert.rejects(
      () => env.releaseService.publish({ contentConfig: makeContentConfig(), design: draft }),
      /未更新线上与 published design/
    )
    assert.equal(await env.workspace.readPublished(), null)
    const releases = await env.releaseService.listReleases()
    assert.equal(releases[0].status, 'failed')
  } finally {
    await cleanup(env.base)
  }
})

test('回滚把指定 release 的运行配置重新写回固定路径', async () => {
  const env = makeEnv()
  try {
    const contentConfig = makeContentConfig()
    const draftA = await env.workspace.createDraftFromTemplate('legacy-editorial-v3')
    const first = await env.releaseService.publish({ contentConfig, design: draftA })

    const draftB = deepClone(draftA)
    draftB.brand = { name: '第二版品牌名' }
    await env.releaseService.publish({ contentConfig, design: draftB })
    let published = await env.workspace.readPublished()
    assert.equal(published.brand.name, '第二版品牌名')

    await env.releaseService.rollback(first.releaseId)
    published = await env.workspace.readPublished()
    assert.equal(published.brand?.name, undefined, '回滚后 published 应恢复第一版')

    const fixedUploads = env.publisher.uploads.filter((item) => item.key === FIXED_CONFIG_KEY)
    const lastFixed = fixedUploads[fixedUploads.length - 1].data
    assert.equal(lastFixed.theme.brandName, fixtureConfig.theme.brandName, '固定路径应恢复第一版内容')
  } finally {
    await cleanup(env.base)
  }
})

test('编译器：空内容区块自动关闭并记录警告', async () => {
  const env = makeEnv()
  try {
    const draft = await env.workspace.createDraftFromTemplate('legacy-editorial-v3')
    const emptyContent = deepClone(fixtureConfig)
    const { runtime, warnings } = env.compiler.compileRuntime({
      contentConfig: emptyContent,
      publishedDesign: draft,
      templateManifest: await env.workspace.readTemplate(draft.templateId)
    })
    assert.equal(runtime.engine, 'blocks-v3')
    const portfolioTypes = runtime.v3Pages.portfolio.blocks.map((block) => block.type)
    assert.ok(!portfolioTypes.includes('package-list'), '套餐为空时套系区块应自动关闭')
    assert.ok(!portfolioTypes.includes('testimonials'), '评价为空时评价区块应自动关闭')
    assert.ok(warnings.some((warning) => warning.includes('自动关闭')))
    // 未迁移页面仍保留 v2.5 兼容字段
    assert.equal(runtime.configVersion, '2.5.0')
    assert.ok(runtime.decoration?.pages, '旧装修字段必须保留')
  } finally {
    await cleanup(env.base)
  }
})

test('v25 适配器只读：不改写入参且能映射旧装修页面', async () => {
  const adapter = require(path.join(ROOT, 'miniprogram/compatibility/v25-adapter.js'))
  const raw = deepClone(fixtureConfig)
  const before = JSON.stringify(raw)
  const runtime = adapter.adaptV25ToRuntime(raw)
  assert.equal(JSON.stringify(raw), before, '适配器不得修改入参')
  assert.equal(runtime.engine, 'blocks-v3')
  assert.equal(runtime.adaptedFrom, 'v2.5')
  assert.ok(runtime.v3Pages.portfolio, 'home 页应映射为 portfolio')
  const portfolioTypes = runtime.v3Pages.portfolio.blocks.map((block) => block.type)
  assert.ok(portfolioTypes.includes('portfolio-grid'), 'portfolio 模块应映射为 portfolio-grid 区块')
  assert.ok(runtime.navigation.length >= 3, '导航应完成映射')
  // v3 运行时配置再次进入适配器时保持原样识别
  const v3Runtime = { engine: 'blocks-v3', templateId: 'x', v3Pages: {} }
  assert.equal(adapter.isV3Runtime(v3Runtime), true)
})
