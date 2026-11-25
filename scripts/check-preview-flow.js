#!/usr/bin/env node
// 草稿预览流程静态检查。
//
// 守住三条不变量，防止后续改动把「预览」变成「发布」：
//   1. 预览接口必须是 GET 且只读，不得出现 writeDraft / writePublished / 上传调用；
//   2. 预览必须编译「草稿」（readDraft），而不是「发布稿」（readPublished）；
//   3. 编辑器必须存在草稿预览入口，且入口文案明确「草稿 / 未上线」。
//
// 用法：node scripts/check-preview-flow.js
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const ROUTES_FILE = path.join(ROOT, 'admin/server/routes/design.js')
const EDITOR_APP = path.join(ROOT, 'admin/editor/src/App.vue')
const EDITOR_PREVIEW = path.join(ROOT, 'admin/editor/src/views/DraftPreview.vue')
const EDITOR_TEMPLATE = path.join(ROOT, 'admin/editor/src/views/TemplateCenter.vue')
const RESOLVER_FILE = path.join(ROOT, 'admin/server/services/content-resolver.js')

const failures = []
const checks = []

function check(name, condition, detail) {
  checks.push(name)
  if (!condition) {
    failures.push(`${name}${detail ? ` —— ${detail}` : ''}`)
  }
}

function read(file) {
  if (!fs.existsSync(file)) {
    failures.push(`缺少文件：${path.relative(ROOT, file)}`)
    return ''
  }
  return fs.readFileSync(file, 'utf-8')
}

const routes = read(ROUTES_FILE)
const app = read(EDITOR_APP)
const previewView = read(EDITOR_PREVIEW)
const templateCenter = read(EDITOR_TEMPLATE)
const resolver = read(RESOLVER_FILE)

// 1. 预览路由存在且为 GET
check('存在 GET /preview 预览路由', /router\.get\(['"]\/preview['"]/.test(routes))

// 2. 预览路由体只读：不得写草稿 / 写发布稿 / 上传
const previewMatch = routes.match(/router\.get\(['"]\/preview['"][\s\S]*?\n  \}\)/)
if (previewMatch) {
  const body = previewMatch[0]
  check('预览不写草稿', !/writeDraft\s*\(/.test(body), '预览路由内出现 writeDraft')
  check('预览不写发布稿', !/writePublished\s*\(/.test(body), '预览路由内出现 writePublished')
  check('预览不上传 COS', !/(putJson|upload|publish\s*\()/i.test(body), '预览路由内出现上传/发布调用')
} else {
  failures.push('未找到 /preview 路由体，无法校验只读性')
}

// 3. 预览编译的是草稿
check(
  '预览编译草稿而非发布稿',
  /router\.get\(['"]\/preview['"][\s\S]*?readDraft\(\)[\s\S]*?publishedDesign:\s*draft/.test(routes),
  '预览应使用 readDraft() 得到的草稿作为 publishedDesign'
)

// 4. 预览与发布共用同一个 compiler
check(
  '预览与发布共用同一 compiler',
  /compiler\.compileRuntime\s*\(/.test(routes),
  '预览路由未调用 compiler.compileRuntime'
)

// 5. 编辑器存在草稿预览入口
check('编辑器存在草稿预览视图', previewView.includes('草稿预览'))
check('编辑器已挂载草稿预览页签', app.includes('DraftPreview'))
check('导航包含草稿预览入口', /key:\s*'preview'/.test(app))

// 6. 入口文案必须区分草稿与线上
check('预览页明确标注草稿未上线', previewView.includes('草稿') && previewView.includes('未上线'))
check(
  '预览页说明不影响线上用户',
  previewView.includes('不会影响线上用户') || previewView.includes('不会影响线上')
)
check('顶栏存在草稿/线上状态徽章', app.includes('draft-state'))

// 7. 模板中心提供预览 → 应用两段式，且措辞不含"应用即上线"
check('模板中心提供预览入口', templateCenter.includes('预览页面'))
check('模板中心按钮标注为应用到草稿', templateCenter.includes('应用到草稿'))
check(
  '模板中心说明应用不影响线上',
  templateCenter.includes('线上用户访问不受影响') || templateCenter.includes('不影响线上')
)

// 8. 内容解析器存在且不依赖小程序 API
check('存在 Admin 侧内容解析器', resolver.length > 0)
// 只看代码行，忽略注释（注释里会说明与小程序口径的差异）。
const resolverCode = resolver
  .split('\n')
  .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
  .join('\n')
check(
  '内容解析器不依赖 wx API',
  !/\bwx\.\w+|getApp\s*\(/.test(resolverCode),
  'content-resolver.js 出现 wx./getApp 依赖'
)

if (failures.length) {
  console.error('✗ 草稿预览流程检查未通过：')
  for (const item of failures) {
    console.error(`  - ${item}`)
  }
  console.error(`\n共 ${checks.length} 项检查，${failures.length} 项失败。`)
  process.exit(1)
}

console.log(`✓ 草稿预览流程检查通过（${checks.length} 项）`)
