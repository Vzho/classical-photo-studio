// 模板收敛脚本：把 3 套商业模板的 settings 迁移到 schema 声明的受控词汇表。
//
// 依据（scripts/settings-crosscheck.js 交叉核对结论）：
//   1. registry → settingsSchema 与小程序 section-renderer 的 10 个区块 100% 对齐；
//   2. runtime-compiler.fillSettingsDefaults 只保留 schema 声明的属性，
//      模板中 schema 外的键在编译期即被丢弃 —— 属于死配置，不影响当前渲染结果；
//   3. 因此本脚本做「收敛 + 语义映射」，不扩张 schema（扩张只会制造新死配置）。
//
// 映射策略：
//   - 有同名受控键            → 保留
//   - 有语义等价的受控键      → 重命名映射（如 textWidth → textWidthTier）
//   - 已由 block.variant 表达 → 丢弃（如 layout / cardStyle / frameStyle）
//   - 渲染器无条件渲染        → 丢弃（如 hero.showTitle，WXML 中标题恒显示）
//   - 无对应受控键且 variant 未表达 → 丢弃
//
// 用法：node scripts/template-settings-migrate.js [--dry]
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SHARED = path.join(ROOT, 'shared/decoration')
const DRY = process.argv.includes('--dry')

const registry = JSON.parse(fs.readFileSync(path.join(SHARED, 'registry.json'), 'utf-8'))

// 每个区块类型的键映射表：{ 旧键: 新键 | null(丢弃) }
const KEY_MAP = {
  hero: {
    overlay: 'overlayMask', // 深色遮罩 → 受控遮罩档位（gradient 无对应值，映射时校验）
    // 以下丢弃：showTitle / showDescription / textPosition / imagePosition / splitRatio
    //            showTags / interval / transition（variant 或 WXML 已覆盖）
  },
  'brand-intro': {
    textWidth: 'textWidthTier', // 文本宽度档位：narrow/normal/wide 一一对应
    // 丢弃：showLogo / showDescription / alignment / textColor
  },
  'category-nav': {
    // 丢弃：layout / thumbnailSize（variant 已表达）
  },
  'portfolio-grid': {
    // 丢弃：hoverEffect
    // textPosition 受控（overlay/below），保留
  },
  'series-gallery': {
    enableLightbox: 'fullscreenPreview', // 灯箱开关 → 受控的全屏预览开关
    // 丢弃：columns / frameStyle / fullBleed
  },
  'package-list': {
    // 丢弃：layout / dividerStyle / showIncludes / columns / cardStyle
    //            bannerHeight / highlightRecommended（variant 已表达）
  },
  team: {
    imageRatio: 'mediaRatio', // 图片比例：square/portrait 一一对应
    // 丢弃：columns / cardStyle
  },
  testimonials: {
    // 丢弃：layout / showRating / showAvatar / quoteStyle / showDate / columns
  },
  'service-flow': {
    // 丢弃：layout / lineStyle / showIcons（variant 已表达）
  },
  'contact-footer': {
    // 丢弃：showMap / showSocial / backgroundColor / showWorkingHours
  }
}

// 值域不一致时不做映射（丢弃该键），避免产出非法枚举值
const VALUE_GUARD = {
  hero: { overlayMask: ['none', 'light', 'medium', 'dark'] }
}

// tokens 枚举修正：模板沿用 v2.5 词汇，v3 受控枚举不同
const TOKEN_FIX = { filled: 'solid', outlined: 'outline' }

// 导航标签 ≤8 字（v3 硬约束）。editorial-gray 是纯英文调性模板，保留英文风格；
// 仅缩短超限项，其余保持原样。其余模板本就使用中文短标签。
const NAV_LABEL_FIX = {
  'editorial-gray': {
    Portfolio: 'Selected' // 9 字 → 8 字，保留英文调性（精选作品）
  }
}

const schemaProps = {}
for (const [type, meta] of Object.entries(registry.blocks)) {
  const s = JSON.parse(fs.readFileSync(path.join(SHARED, meta.settingsSchema), 'utf-8'))
  schemaProps[type] = Object.keys(s.properties || {})
}

const templatesDir = path.join(SHARED, 'templates')
const report = []

for (const entry of fs.readdirSync(templatesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const file = path.join(templatesDir, entry.name, 'manifest.json')
  const manifest = JSON.parse(fs.readFileSync(file, 'utf-8'))
  const changed = []

  // 1. tokens 枚举修正
  if (manifest.tokens && manifest.tokens.buttonStyle) {
    const mapped = TOKEN_FIX[manifest.tokens.buttonStyle]
    if (mapped) {
      changed.push(`tokens.buttonStyle: ${manifest.tokens.buttonStyle} → ${mapped}`)
      manifest.tokens.buttonStyle = mapped
    }
  }

  // 2. 导航标签修正
  const navFix = NAV_LABEL_FIX[entry.name]
  if (navFix && manifest.navigation?.entries) {
    manifest.navigation.entries.forEach((e) => {
      const mapped = navFix[e.label]
      if (mapped && mapped.length <= 8) {
        changed.push(`navigation "${e.label}" → "${mapped}"`)
        e.label = mapped
      }
    })
  }

  // 3. settings 收敛
  for (const [pageKey, page] of Object.entries(manifest.pages || {})) {
    for (const block of page.blocks || []) {
      const type = block.type
      const allowed = schemaProps[type] || []
      const map = KEY_MAP[type] || {}
      const guard = VALUE_GUARD[type] || {}
      if (!block.settings) continue

      const next = {}
      for (const [key, value] of Object.entries(block.settings)) {
        if (allowed.includes(key)) {
          next[key] = value
          continue
        }
        const mappedKey = map[key]
        if (mappedKey && allowed.includes(mappedKey)) {
          const allowedValues = guard[mappedKey]
          if (allowedValues && !allowedValues.includes(value)) {
            changed.push(`${pageKey}/${type}.${key}=${JSON.stringify(value)} → 丢弃（值域不符 ${allowedValues.join('/')}）`)
            continue
          }
          changed.push(`${pageKey}/${type}.${key} → ${mappedKey}=${JSON.stringify(value)}`)
          next[mappedKey] = value
          continue
        }
        changed.push(`${pageKey}/${type}.${key}=${JSON.stringify(value)} → 丢弃（无受控对应）`)
      }
      block.settings = next
    }
  }

  if (changed.length) {
    report.push({ template: manifest.id, changes: changed })
    if (!DRY) {
      fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n', 'utf-8')
    }
  }
}

console.log(DRY ? '=== DRY RUN（未写盘）===' : '=== 已写盘 ===')
for (const { template, changes } of report) {
  console.log(`\n[${template}]  ${changes.length} 处变更`)
  changes.forEach((c) => console.log(`  · ${c}`))
}
console.log(`\n合计: ${report.reduce((n, r) => n + r.changes.length, 0)} 处`)
