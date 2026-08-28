// Design Validator：装修配置与模板 Manifest 的受控校验（方案 §9.3、§16）。
// errors 阻止发布；warnings 仅为建议优化。不引入 Ajv，保持客户零额外依赖安装。
const { DESIGN_SCHEMA_VERSION, DESIGN_ENGINE } = require('../services/design-workspace')

const TOKEN_ENUMS = {
  fontPair: ['modern-sans', 'editorial-serif', 'soft-lifestyle'],
  density: ['compact', 'standard', 'relaxed'],
  radiusMood: ['sharp', 'light', 'soft'],
  buttonStyle: ['solid', 'outline', 'text'],
  overlayMask: ['none', 'light', 'medium', 'dark']
}
const NAV_PAGE_KEYS = ['portfolio', 'about', 'booking', 'packages']
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/

function createDesignValidator({ registry, blockSchemas }) {
  const blockTypes = Object.keys(registry.blocks || {})
  const pageKeys = Object.keys(registry.pages || {})
  const dataSourceTypes = new Set(registry.dataSourceTypes || [])

  function validateDesign(design, { allowEmpty = false } = {}) {
    const errors = []
    const warnings = []

    if (!design || typeof design !== 'object') {
      return finish(errors, warnings, ['装修配置为空'])
    }
    if (!allowEmpty) {
      if (design.schemaVersion !== DESIGN_SCHEMA_VERSION) {
        errors.push(`schemaVersion 必须为 ${DESIGN_SCHEMA_VERSION}，当前为 ${design.schemaVersion}`)
      }
      if (design.engine !== DESIGN_ENGINE) {
        errors.push(`engine 必须为 ${DESIGN_ENGINE}，当前为 ${design.engine}`)
      }
      if (!design.templateId || typeof design.templateId !== 'string') {
        errors.push('缺少 templateId')
      }
    }

    validateTokens(design.tokens, errors, warnings)
    validateBrand(design.brand, errors)
    validateNavigation(design.navigation, errors, warnings)

    const pages = design.pages || {}
    const unknownPages = Object.keys(pages).filter((key) => !pageKeys.includes(key))
    for (const pageKey of unknownPages) {
      errors.push(`未知页面: ${pageKey}（允许: ${pageKeys.join(', ')}）`)
    }
    for (const pageKey of pageKeys) {
      if (!pages[pageKey]) continue
      validatePageBlocks(pageKey, pages[pageKey].blocks, errors, warnings)
    }

    return finish(errors, warnings)
  }

  function validateTokens(tokens, errors, warnings) {
    if (!tokens || typeof tokens !== 'object') return
    for (const [key, allowed] of Object.entries(TOKEN_ENUMS)) {
      if (tokens[key] !== undefined && !allowed.includes(tokens[key])) {
        errors.push(`tokens.${key} 取值非法: ${tokens[key]}（允许: ${allowed.join(' / ')}）`)
      }
    }
    if (tokens.accentColor !== undefined && !HEX_COLOR.test(tokens.accentColor)) {
      errors.push(`tokens.accentColor 必须为 #RRGGBB 格式: ${tokens.accentColor}`)
    }
    if (tokens.accentColor && warnings.length === 0) {
      warnings.push('自定义品牌色请在真机上确认与模板配色的对比度')
    }
  }

  function validateBrand(brand, errors) {
    if (!brand || typeof brand !== 'object') return
    const limits = { name: 20, englishName: 40, slogan: 60 }
    for (const [key, max] of Object.entries(limits)) {
      const value = brand[key]
      if (value !== undefined && (typeof value !== 'string' || value.length > max)) {
        errors.push(`brand.${key} 必须为不超过 ${max} 字的字符串`)
      }
    }
  }

  function validateNavigation(navigation, errors, warnings) {
    if (!navigation || typeof navigation !== 'object') return
    const entries = navigation.entries
    if (!Array.isArray(entries)) {
      errors.push('navigation.entries 必须为数组')
      return
    }
    if (entries.length < 3 || entries.length > 4) {
      errors.push(`导航入口数量必须为 3~4 个，当前 ${entries.length} 个`)
    }
    const seen = new Set()
    entries.forEach((entry, index) => {
      const label = `导航第 ${index + 1} 项`
      if (!NAV_PAGE_KEYS.includes(entry?.pageKey)) {
        errors.push(`${label} 指向未预编译页面: ${entry?.pageKey}（允许: ${NAV_PAGE_KEYS.join(', ')}）`)
      } else if (seen.has(entry.pageKey)) {
        errors.push(`${label} 重复指向页面: ${entry.pageKey}`)
      } else {
        seen.add(entry.pageKey)
      }
      if (typeof entry?.label !== 'string' || !entry.label.trim()) {
        errors.push(`${label} 缺少名称`)
      } else if (entry.label.length > 8) {
        errors.push(`${label} 名称超过 8 字: ${entry.label}`)
      }
      if (typeof entry?.visible !== 'boolean') {
        errors.push(`${label} 缺少显示状态`)
      }
    })
    if (entries.length > 0 && entries.every((entry) => entry?.visible === false)) {
      warnings.push('所有导航入口均被隐藏，小程序将无法切换页面')
    }
  }

  function validatePageBlocks(pageKey, blocks, errors, warnings) {
    if (!Array.isArray(blocks)) {
      errors.push(`页面 ${pageKey} 的 blocks 必须为数组`)
      return
    }
    const seenIds = new Set()
    const typeCounts = {}
    blocks.forEach((block, index) => {
      const where = `页面 ${pageKey} 第 ${index + 1} 个区块`
      if (!block || typeof block !== 'object') {
        errors.push(`${where} 不是对象`)
        return
      }
      if (!block.id || typeof block.id !== 'string') {
        errors.push(`${where} 缺少 id`)
      } else if (seenIds.has(block.id)) {
        errors.push(`${where} id 重复: ${block.id}`)
      } else {
        seenIds.add(block.id)
      }
      const meta = registry.blocks?.[block.type]
      if (!meta) {
        errors.push(`${where} 使用未注册区块类型: ${block.type}`)
        return
      }
      typeCounts[block.type] = (typeCounts[block.type] || 0) + 1
      if (!meta.allowedPages.includes(pageKey)) {
        errors.push(`${where}（${block.type}）不允许出现在该页面（允许: ${meta.allowedPages.join(', ')}）`)
      }
      if (!meta.variants.includes(block.variant)) {
        errors.push(`${where}（${block.type}）变体非法: ${block.variant}（允许: ${meta.variants.join(' / ')}）`)
      }
      if (typeof block.enabled !== 'boolean') {
        errors.push(`${where}（${block.type}）缺少 enabled 布尔字段`)
      }
      validateDataSource(where, block, meta, errors)
      validateSettings(where, block, errors, warnings)
    })
    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > 1 && !registry.blocks[type].allowMultiple) {
        errors.push(`页面 ${pageKey} 出现 ${count} 个 ${type} 区块，该区块不允许重复`)
      }
    }
  }

  function validateDataSource(where, block, meta, errors) {
    const dataSource = block.dataSource
    if (!dataSource || typeof dataSource !== 'object') {
      errors.push(`${where}（${block.type}）缺少 dataSource`)
      return
    }
    if (!dataSourceTypes.has(dataSource.type)) {
      errors.push(`${where}（${block.type}）数据源类型非法: ${dataSource.type}`)
      return
    }
    if (!meta.requiredData.includes(dataSource.type) && dataSource.type !== 'none') {
      errors.push(`${where}（${block.type}）不允许使用数据源: ${dataSource.type}（允许: ${meta.requiredData.join(' / ')}）`)
    }
    if (dataSource.limit !== undefined) {
      if (!Number.isInteger(dataSource.limit) || dataSource.limit < 1 || dataSource.limit > 24) {
        errors.push(`${where}（${block.type}）dataSource.limit 必须为 1~24 的整数`)
      }
    }
  }

  function validateSettings(where, block, errors, warnings) {
    const schema = blockSchemas?.[block.type]
    const settings = block.settings || {}
    if (!schema) {
      if (Object.keys(settings).length > 0) {
        warnings.push(`${where}（${block.type}）缺少设置 Schema，已忽略 settings`)
      }
      return
    }
    const props = schema.properties || {}
    for (const [key, value] of Object.entries(settings)) {
      const prop = props[key]
      if (!prop) {
        errors.push(`${where}（${block.type}）包含未受控设置: ${key}`)
        continue
      }
      if (prop.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`${where}（${block.type}）设置 ${key} 必须为布尔值`)
      }
      if (prop.type === 'string' && typeof value !== 'string') {
        errors.push(`${where}（${block.type}）设置 ${key} 必须为字符串`)
      }
      if (prop.enum && !prop.enum.includes(value)) {
        errors.push(`${where}（${block.type}）设置 ${key} 取值非法: ${value}（允许: ${prop.enum.join(' / ')}）`)
      }
    }
  }

  // 模板 Manifest 走同一套区块规则，另校验清单元数据。
  function validateTemplate(manifest) {
    const errors = []
    const warnings = []
    if (!manifest || typeof manifest !== 'object') {
      return finish(errors, warnings, ['模板 Manifest 为空'])
    }
    if (!manifest.id || !manifest.version) errors.push('Manifest 缺少 id 或 version')
    if (!manifest.preview?.cover) warnings.push('模板缺少封面截图，模板中心无法展示真机效果')
    const designLike = {
      schemaVersion: DESIGN_SCHEMA_VERSION,
      engine: DESIGN_ENGINE,
      templateId: manifest.id,
      tokens: manifest.tokens,
      navigation: manifest.navigation,
      pages: manifest.pages
    }
    const inner = validateDesign(designLike)
    return finish([...errors, ...inner.errors], [...warnings, ...inner.warnings])
  }

  function finish(errors, warnings, extraErrors = []) {
    const allErrors = [...errors, ...extraErrors]
    return { valid: allErrors.length === 0, errors: allErrors, warnings }
  }

  return { validateDesign, validateTemplate, blockTypes, pageKeys }
}

module.exports = { createDesignValidator }
