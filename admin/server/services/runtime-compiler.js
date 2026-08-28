// Runtime Compiler：内容配置 + 已发布装修 + 模板 + Registry = 运行时配置（方案 §9.3）。
// 输出保持 v2.5 字段完整（未迁移页面照常渲染），同时附加 blocks-v3 运行时字段。
const { DESIGN_SCHEMA_VERSION, DESIGN_ENGINE, deepClone } = require('./design-workspace')

const NAV_TEXT_KEYS = {
  portfolio: 'portfolioText',
  about: 'aboutText',
  booking: 'bookingText',
  packages: 'packagesText'
}

function createRuntimeCompiler({ registry, blockSchemas }) {
  const dataSourceTypes = new Set(registry.dataSourceTypes || [])

  // 内容可用性：空内容区块在编译期自动关闭（方案 §9.3 “空模块自动关闭”）。
  function isDataSourceAvailable(contentConfig, type) {
    switch (type) {
      case 'none':
        return true
      case 'brand':
        return Boolean(contentConfig.theme?.brandName)
      case 'featured-series':
      case 'categories':
        return (contentConfig.themes || []).some((theme) => Array.isArray(theme?.series))
      case 'current-series':
        // 详情数据取决于运行时页面参数，编译期视为可用。
        return true
      case 'packages':
        return (contentConfig.packages || []).length > 0
      case 'team':
        return (contentConfig.photographers || []).length > 0
      case 'testimonials':
        return (contentConfig.testimonials || []).length > 0
      case 'service-flow': {
        const flow = contentConfig.serviceFlow || {}
        return flow.enabled !== false && (flow.steps || []).length > 0
      }
      case 'contact':
        return (contentConfig.stores || []).length > 0 || Boolean(contentConfig.consultation)
      default:
        return false
    }
  }

  function fillSettingsDefaults(blockType, settings) {
    const schema = blockSchemas?.[blockType]
    const filled = {}
    const props = schema?.properties || {}
    for (const [key, prop] of Object.entries(props)) {
      filled[key] = settings?.[key] !== undefined ? settings[key] : prop.default
    }
    return filled
  }

  function compilePageBlocks(pageKey, blocks, contentConfig, warnings) {
    const compiled = []
    for (const block of blocks || []) {
      if (!block || block.enabled === false) continue
      const meta = registry.blocks?.[block.type]
      if (!meta) {
        // 未知区块：记录并跳过，不影响整页（方案 §7.2）。
        warnings.push(`页面 ${pageKey} 跳过未注册区块: ${block.id || block.type}`)
        continue
      }
      const sourceType = block.dataSource?.type
      if (!dataSourceTypes.has(sourceType)) {
        warnings.push(`页面 ${pageKey} 区块 ${block.id} 数据源类型非法，已跳过`)
        continue
      }
      if (sourceType !== 'none' && !isDataSourceAvailable(contentConfig, sourceType)) {
        warnings.push(`页面 ${pageKey} 区块 ${block.id}（${block.type}）因内容缺失自动关闭`)
        continue
      }
      compiled.push({
        id: block.id,
        type: block.type,
        variant: block.variant,
        rendererKey: meta.rendererKey,
        enabled: true,
        dataSource: deepClone(block.dataSource || { type: 'none' }),
        settings: fillSettingsDefaults(block.type, block.settings)
      })
    }
    return compiled
  }

  function applyBrandOverrides(runtime, design) {
    const brand = design.brand || {}
    if (!runtime.theme) runtime.theme = { enabled: true }
    if (typeof brand.name === 'string' && brand.name.trim()) {
      runtime.theme.brandName = brand.name.trim()
    }
    if (design.tokens?.accentColor) {
      runtime.theme.accentColor = design.tokens.accentColor
    }
  }

  function applyNavigationOverrides(runtime, design) {
    const entries = design.navigation?.entries
    if (!Array.isArray(entries) || entries.length === 0) return
    if (!runtime.decoration) runtime.decoration = {}
    if (!runtime.decoration.navigation) runtime.decoration.navigation = {}
    const navigation = runtime.decoration.navigation
    for (const entry of entries) {
      const textKey = NAV_TEXT_KEYS[entry?.pageKey]
      if (!textKey) continue
      if (typeof entry.label === 'string' && entry.label.trim()) {
        navigation[textKey] = entry.label.trim()
      }
      if (Array.isArray(navigation.items)) {
        const item = navigation.items.find((candidate) => candidate?.key === entry.pageKey)
        if (item && typeof entry.visible === 'boolean') {
          item.enabled = entry.visible
        }
      }
    }
  }

  /**
   * 合并出运行时配置。
   * - 无已发布装修时，输出与内容配置一致（保持现有行为）。
   * - 有已发布装修时，附加 blocks-v3 字段；未迁移页面仍走原 theme + decoration。
   */
  function compileRuntime({ contentConfig, publishedDesign, templateManifest }) {
    if (!contentConfig || typeof contentConfig !== 'object') {
      throw new Error('内容配置为空，无法编译运行时配置')
    }
    const runtime = deepClone(contentConfig)
    const warnings = []

    if (!publishedDesign || publishedDesign.engine !== DESIGN_ENGINE) {
      return { runtime, warnings, compiledPages: [] }
    }
    if (templateManifest && templateManifest.id !== publishedDesign.templateId) {
      warnings.push(`模板不一致: 发布稿 ${publishedDesign.templateId} / 提供 ${templateManifest.id}`)
    }

    // 模板 Token 打底，发布稿 Token 覆盖（受控档位已由校验器保证）。
    const designTokens = {
      ...(templateManifest?.tokens || {}),
      ...(publishedDesign.tokens || {})
    }

    runtime.configVersion = runtime.configVersion || '2.5.0'
    runtime.engine = DESIGN_ENGINE
    runtime.designSchemaVersion = DESIGN_SCHEMA_VERSION
    runtime.templateId = publishedDesign.templateId
    runtime.designTokens = designTokens
    runtime.mediaMeta = deepClone(publishedDesign.mediaMeta || {})

    const v3Pages = {}
    const compiledPages = []
    for (const [pageKey, pageDesign] of Object.entries(publishedDesign.pages || {})) {
      if (!registry.pages?.[pageKey]) {
        warnings.push(`忽略未开放装修的页面: ${pageKey}`)
        continue
      }
      const blocks = compilePageBlocks(pageKey, pageDesign.blocks, contentConfig, warnings)
      v3Pages[pageKey] = { blocks }
      compiledPages.push(pageKey)
    }
    runtime.v3Pages = v3Pages

    applyBrandOverrides(runtime, publishedDesign)
    applyNavigationOverrides(runtime, publishedDesign)

    return { runtime, warnings, compiledPages }
  }

  return { compileRuntime, isDataSourceAvailable }
}

module.exports = { createRuntimeCompiler }
