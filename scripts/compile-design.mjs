#!/usr/bin/env node
// 命令行编译与发布装修（方案 M1 退出条件：可用命令行将内容 + v3 Design 编译并发布、可回滚）。
// 用法：
//   node scripts/compile-design.mjs                      # 编译并输出到 output/design-runtime.json
//   node scripts/compile-design.mjs --template legacy-editorial-v3 --out out.json
//   node scripts/compile-design.mjs --publish            # 走完整发布流程（需 admin/.env 配置 COS）
//   node scripts/compile-design.mjs --rollback <releaseId>
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const args = process.argv.slice(2)
function getArg(name) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}
const wantPublish = args.includes('--publish')
const rollbackId = getArg('--rollback')

// 复用 admin 的依赖（dotenv、cos-nodejs-sdk-v5）。
require(path.join(ROOT, 'admin/node_modules/dotenv')).config({ path: path.join(ROOT, 'admin/.env') })
const COS = require(path.join(ROOT, 'admin/node_modules/cos-nodejs-sdk-v5'))

const { createDesignWorkspace } = require(path.join(ROOT, 'admin/server/services/design-workspace'))
const { createDesignValidator } = require(path.join(ROOT, 'admin/server/validation/design-validator'))
const { createRuntimeCompiler } = require(path.join(ROOT, 'admin/server/services/runtime-compiler'))
const { createCosPublisher } = require(path.join(ROOT, 'admin/server/services/cos-publisher'))
const { createReleaseService } = require(path.join(ROOT, 'admin/server/services/release-service'))

const SHARED_DIR = path.join(ROOT, 'shared/decoration')
const registry = JSON.parse(fs.readFileSync(path.join(SHARED_DIR, 'registry.json'), 'utf-8'))
const blockSchemas = Object.fromEntries(
  Object.entries(registry.blocks).map(([blockType, meta]) => [
    blockType,
    JSON.parse(fs.readFileSync(path.join(SHARED_DIR, meta.settingsSchema), 'utf-8'))
  ])
)

const workspace = createDesignWorkspace({
  workspaceDir: path.join(ROOT, 'admin/workspace'),
  templatesDir: path.join(SHARED_DIR, 'templates'),
  backupsDir: path.join(ROOT, 'admin/workspace/backups')
})
const validator = createDesignValidator({ registry, blockSchemas })
const compiler = createRuntimeCompiler({ registry, blockSchemas })

const contentPath = getArg('--content') || path.join(ROOT, 'miniprogram/data/portfolio-config.json')
const contentConfig = JSON.parse(fs.readFileSync(contentPath, 'utf-8'))
const templateId = getArg('--template') || 'legacy-editorial-v3'

function buildPublisher() {
  const cos = new COS({
    SecretId: process.env.COS_SECRET_ID,
    SecretKey: process.env.COS_SECRET_KEY
  })
  return createCosPublisher({
    provider: () => ({ cos, bucket: process.env.COS_BUCKET, region: process.env.COS_REGION })
  })
}

async function resolveDesign() {
  // 优先使用已保存草稿；没有草稿时从模板生成一份。
  const draft = await workspace.readDraft()
  if (draft) return draft
  return workspace.createDraftFromTemplate(templateId)
}

async function main() {
  const releaseService = createReleaseService({
    releasesDir: path.join(ROOT, 'admin/releases'),
    publisher: buildPublisher(),
    workspace,
    validator,
    compiler
  })

  if (rollbackId) {
    const result = await releaseService.rollback(rollbackId)
    console.log(`✅ 已回滚到 ${result.rolledBackTo}（模板: ${result.templateId}）`)
    return
  }

  const design = await resolveDesign()
  const validation = validator.validateDesign(design)
  if (!validation.valid) {
    console.error('❌ 装修校验未通过:')
    validation.errors.forEach((error) => console.error(`   - ${error}`))
    process.exit(1)
  }
  validation.warnings.forEach((warning) => console.warn(`⚠️ ${warning}`))

  if (wantPublish) {
    const publisher = buildPublisher()
    if (!publisher.available()) {
      console.error('❌ COS 未配置（检查 admin/.env），无法发布。去掉 --publish 可只做本地编译。')
      process.exit(1)
    }
    const result = await releaseService.publish({ contentConfig, design })
    console.log(`✅ 发布成功 ${result.releaseId}（模板: ${result.templateId}，编译页面: ${result.compiledPages.join(', ')}）`)
    result.warnings.forEach((warning) => console.warn(`⚠️ ${warning}`))
    return
  }

  const template = await workspace.readTemplate(design.templateId)
  const { runtime, warnings, compiledPages } = compiler.compileRuntime({
    contentConfig,
    publishedDesign: design,
    templateManifest: template
  })
  const outPath = getArg('--out') || path.join(ROOT, 'output/design-runtime.json')
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, JSON.stringify(runtime, null, 2), 'utf-8')
  console.log(`✅ 编译完成: ${outPath}`)
  console.log(`   引擎: ${runtime.engine} / 模板: ${runtime.templateId} / 页面: ${compiledPages.join(', ') || '（无）'}`)
  warnings.forEach((warning) => console.warn(`⚠️ ${warning}`))
}

main().catch((error) => {
  console.error('❌ 执行失败:', error.message || error)
  process.exit(1)
})
