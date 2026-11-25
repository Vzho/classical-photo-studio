// 逐模板列出全部契约违规（契约脚本 assert 遇错即停，只暴露首个失败模板）
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SHARED = path.join(ROOT, 'shared/decoration')

const registry = JSON.parse(fs.readFileSync(path.join(SHARED, 'registry.json'), 'utf-8'))
const { createDesignValidator } = require(path.join(ROOT, 'admin/server/validation/design-validator'))

const blockSchemas = {}
for (const [type, meta] of Object.entries(registry.blocks)) {
  blockSchemas[type] = JSON.parse(fs.readFileSync(path.join(SHARED, meta.settingsSchema), 'utf-8'))
}
const validator = createDesignValidator({ registry, blockSchemas })

const templatesDir = path.join(SHARED, 'templates')
let total = 0
for (const entry of fs.readdirSync(templatesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const manifest = JSON.parse(fs.readFileSync(path.join(templatesDir, entry.name, 'manifest.json'), 'utf-8'))
  const result = validator.validateTemplate(manifest)
  console.log(`\n${'='.repeat(70)}`)
  console.log(`模板 ${manifest.id}  → ${result.valid ? '✅ 通过' : `❌ ${result.errors.length} 项错误`}`)
  console.log('='.repeat(70))
  if (result.warnings.length) {
    console.log('warnings:')
    result.warnings.forEach((w) => console.log(`  ⚠️  ${w}`))
  }
  if (!result.valid) {
    result.errors.forEach((e) => { console.log(`  ✖ ${e}`); total += 1 })
  }
}
console.log(`\n合计错误: ${total}`)
