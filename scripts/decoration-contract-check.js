// 装修 v3 合约检查（方案 §5.3、§13.2）。
// - Registry 中每个 Block 必须有可解析的 settings Schema；
// - design-v3.schema.json 必须可解析且字段合约稳定；
// - 每个模板只允许引用已注册 Block、合法 variant 与 allowedPages；
// - 小程序 section-renderer 存在时，检查 Registry 与组件注册一致（M2 后生效）。
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SHARED_DIR = path.join(ROOT, 'shared/decoration')

const registry = JSON.parse(fs.readFileSync(path.join(SHARED_DIR, 'registry.json'), 'utf-8'))
const { createDesignValidator } = require(path.join(ROOT, 'admin/server/validation/design-validator'))

let failures = 0

function check(name, fn) {
  try {
    fn()
    console.log(`✅ ${name}`)
  } catch (error) {
    failures += 1
    console.error(`❌ ${name}\n   ${error.message}`)
  }
}

const blockSchemas = {}
check('Registry 每个区块都有可解析的设置 Schema', () => {
  for (const [blockType, meta] of Object.entries(registry.blocks)) {
    const schemaPath = path.join(SHARED_DIR, meta.settingsSchema)
    assert.ok(fs.existsSync(schemaPath), `${blockType} 缺少 Schema 文件: ${meta.settingsSchema}`)
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'))
    assert.equal(schema.type, 'object', `${blockType} Schema 必须是对象类型`)
    assert.equal(schema.additionalProperties, false, `${blockType} Schema 必须禁止未知字段`)
    blockSchemas[blockType] = schema
  }
  assert.equal(Object.keys(registry.blocks).length, 10, 'V1 必须定义 10 个核心区块')
})

check('design-v3.schema.json 可解析且锁定 3.1.0 / blocks-v3', () => {
  const schema = JSON.parse(fs.readFileSync(path.join(SHARED_DIR, 'schemas/design-v3.schema.json'), 'utf-8'))
  assert.equal(schema.properties.schemaVersion.const, '3.1.0')
  assert.equal(schema.properties.engine.const, 'blocks-v3')
})

check('每个区块至少 2 个受控变体且声明 allowedPages 与 rendererKey', () => {
  for (const [blockType, meta] of Object.entries(registry.blocks)) {
    assert.ok(meta.variants.length >= 2, `${blockType} 变体少于 2 个`)
    assert.ok(meta.allowedPages.length >= 1, `${blockType} 未声明 allowedPages`)
    assert.ok(meta.rendererKey, `${blockType} 未声明 rendererKey`)
    assert.ok(meta.requiredData.length >= 1, `${blockType} 未声明 requiredData`)
  }
})

const validator = createDesignValidator({ registry, blockSchemas })

const templatesDir = path.join(SHARED_DIR, 'templates')
check('每个模板 Manifest 通过合约校验（区块、变体、页面约束）', () => {
  const entries = fs.existsSync(templatesDir)
    ? fs.readdirSync(templatesDir, { withFileTypes: true }).filter((entry) => entry.isDirectory())
    : []
  assert.ok(entries.length >= 1, '至少应存在内部兼容模板 legacy-editorial-v3')
  for (const entry of entries) {
    const manifest = JSON.parse(fs.readFileSync(path.join(templatesDir, entry.name, 'manifest.json'), 'utf-8'))
    assert.equal(manifest.id, entry.name, `${entry.name} 目录与 Manifest id 不一致`)
    const result = validator.validateTemplate(manifest)
    assert.ok(result.valid, `${manifest.id} 校验失败:\n   ${result.errors.join('\n   ')}`)
  }
})

check('Registry 与小程序 section-renderer 注册一致（M2 后生效）', () => {
  const rendererJson = path.join(ROOT, 'miniprogram/components/v3/section-renderer/index.json')
  const rendererWxml = path.join(ROOT, 'miniprogram/components/v3/section-renderer/index.wxml')
  if (!fs.existsSync(rendererJson)) {
    console.log('   ⏭️ section-renderer 尚未建立（M2），跳过')
    return
  }
  const usingComponents = JSON.parse(fs.readFileSync(rendererJson, 'utf-8')).usingComponents || {}
  const wxml = fs.readFileSync(rendererWxml, 'utf-8')
  for (const [blockType, meta] of Object.entries(registry.blocks)) {
    const tag = meta.rendererKey
    assert.ok(usingComponents[tag], `section-renderer.json 未注册组件 ${tag}（区块 ${blockType}）`)
    assert.ok(wxml.includes(tag), `section-renderer.wxml 缺少 ${tag} 静态分支（区块 ${blockType}）`)
  }
})

if (failures > 0) {
  console.error(`\n合约检查失败: ${failures} 项`)
  process.exit(1)
}
console.log('\n合约检查全部通过')
