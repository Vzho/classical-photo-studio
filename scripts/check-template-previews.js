// 模板预览图完整性检查：manifest 声明的预览图必须真实存在。
//
// 背景：manifest 的 preview.cover 与 preview.pages 指向 /editor/templates/{id}/preview-*.jpg，
// 但这些文件一度完全缺失，导致模板中心所有 <img> 裂图。此脚本把该约束固化为可执行检查。
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const TEMPLATES_DIR = path.join(ROOT, 'shared/decoration/templates')

const failures = []

const entries = fs.existsSync(TEMPLATES_DIR)
  ? fs.readdirSync(TEMPLATES_DIR, { withFileTypes: true }).filter((e) => e.isDirectory())
  : []

for (const entry of entries) {
  const manifestPath = path.join(TEMPLATES_DIR, entry.name, 'manifest.json')
  if (!fs.existsSync(manifestPath)) {
    failures.push(`${entry.name}: 缺少 manifest.json`)
    continue
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  const preview = manifest.preview
  if (!preview) {
    console.log(`⏭️  ${entry.name}: 未声明预览图（内部兼容模板可跳过）`)
    continue
  }

  // manifest 用的是 URL 路径（/editor/templates/{id}/x.jpg），需转回磁盘路径
  const toDisk = (urlPath) => {
    const rel = String(urlPath).replace(/^\/editor\/templates\//, '')
    return path.join(TEMPLATES_DIR, rel)
  }

  const targets = []
  if (preview.cover) targets.push(['cover', preview.cover])
  for (const [pageKey, urlPath] of Object.entries(preview.pages || {})) {
    targets.push([`page:${pageKey}`, urlPath])
  }

  let ok = 0
  for (const [label, urlPath] of targets) {
    const disk = toDisk(urlPath)
    if (!fs.existsSync(disk)) {
      failures.push(`${entry.name} ${label}: 缺少预览图 ${urlPath}（磁盘路径 ${path.relative(ROOT, disk)}）`)
      continue
    }
    const size = fs.statSync(disk).size
    if (size < 1024) {
      failures.push(`${entry.name} ${label}: 预览图过小（${size}B），可能是占位空文件`)
      continue
    }
    ok += 1
  }
  console.log(`✅ ${entry.name}: ${ok}/${targets.length} 张预览图就位`)
}

if (failures.length > 0) {
  console.error(`\n预览图检查失败 ${failures.length} 项:`)
  failures.forEach((f) => console.error(`  ✖ ${f}`))
  process.exit(1)
}
console.log('\n预览图检查全部通过')
