// v2.5 → blocks-v3 只读适配器（方案 §7.1、§7.2、§10.2）。
// 原则：
// - 纯函数，绝不修改入参；
// - 绝不写回 COS、绝不更改 configVersion、绝不提示客户重新上传；
// - 未知区块记录并跳过，不影响整页渲染。
export const V3_ENGINE = 'blocks-v3'
export const V3_SCHEMA_VERSION = '3.1.0'

export interface V3DataSource {
  type: string
  ref?: string
  limit?: number
}

export interface V3RuntimeBlock {
  id: string
  type: string
  variant: string
  enabled: boolean
  dataSource: V3DataSource
  settings: Record<string, unknown>
  legacy?: boolean
}

export interface V3RuntimePage {
  blocks: V3RuntimeBlock[]
  legacySkeleton?: string
}

export interface V3RuntimeConfig {
  engine: typeof V3_ENGINE
  designSchemaVersion: string
  templateId: string
  designTokens: Record<string, unknown>
  v3Pages: Record<string, V3RuntimePage>
  navigation: Array<{ pageKey: string; label: string; visible: boolean }>
  mediaMeta: Record<string, unknown>
  adaptedFrom: 'v2.5' | 'v3-runtime'
}

interface LooseRecord {
  [key: string]: any
}

// 旧装修页面键 → v3 页面键（booking/packageDetail/success 暂只跟随主题，不做区块化）。
const PAGE_KEY_MAP: Record<string, string> = {
  home: 'portfolio',
  series: 'series',
  about: 'about',
  packages: 'packages'
}

// 旧模块类型 → v3 区块；无法映射的模块降级为 legacy 占位，由旧渲染路径继续处理。
const MODULE_BLOCK_MAP: Record<string, { type: string; variant: string; dataSource: string }> = {
  hero: { type: 'hero', variant: 'full-bleed-carousel', dataSource: 'featured-series' },
  categories: { type: 'category-nav', variant: 'text-tabs', dataSource: 'categories' },
  shortcuts: { type: 'category-nav', variant: 'circle-thumbnails', dataSource: 'categories' },
  portfolio: { type: 'portfolio-grid', variant: 'editorial-mixed', dataSource: 'featured-series' },
  gallery: { type: 'series-gallery', variant: 'natural-flow', dataSource: 'current-series' },
  team: { type: 'team', variant: 'horizontal-cards', dataSource: 'team' },
  packages: { type: 'package-list', variant: 'cards', dataSource: 'packages' },
  list: { type: 'package-list', variant: 'minimal-list', dataSource: 'packages' },
  testimonials: { type: 'testimonials', variant: 'quotes', dataSource: 'testimonials' },
  serviceFlow: { type: 'service-flow', variant: 'numbered', dataSource: 'service-flow' },
  contact: { type: 'contact-footer', variant: 'minimal', dataSource: 'contact' },
  stores: { type: 'contact-footer', variant: 'minimal', dataSource: 'contact' },
  profile: { type: 'brand-intro', variant: 'editorial-left', dataSource: 'brand' },
  bio: { type: 'brand-intro', variant: 'centered', dataSource: 'brand' }
}

const THEME_TOKEN_FIELDS = [
  'preset',
  'primaryColor',
  'accentColor',
  'backgroundColor',
  'surfaceColor',
  'textColor',
  'mutedTextColor',
  'cardStyle',
  'buttonStyle',
  'fontStyle',
  'imageRadius',
  'layoutDensity'
] as const

export function isV3Runtime(raw: unknown): boolean {
  return Boolean(raw) && (raw as LooseRecord).engine === V3_ENGINE
}

function adaptModule(module: LooseRecord, pageIndex: number, index: number): V3RuntimeBlock {
  const mapping = MODULE_BLOCK_MAP[module?.type]
  if (!mapping) {
    return {
      id: `legacy-${pageIndex}-${index}-${module?.id || module?.type || 'module'}`,
      type: module?.type || 'unknown',
      variant: module?.variant || 'default',
      enabled: module?.enabled !== false,
      dataSource: { type: 'none' },
      settings: {},
      legacy: true
    }
  }
  return {
    id: module?.id || `adapted-${mapping.type}-${index}`,
    type: mapping.type,
    variant: mapping.variant,
    enabled: module?.enabled !== false,
    dataSource: { type: mapping.dataSource },
    settings: {},
    legacy: false
  }
}

function adaptLegacyPage(pageKey: string, legacyPage: LooseRecord, pageIndex: number): V3RuntimePage {
  const modules: LooseRecord[] = Array.isArray(legacyPage?.modules) ? legacyPage.modules : []
  return {
    blocks: modules.map((module, index) => adaptModule(module, pageIndex, index)),
    legacySkeleton: legacyPage?.skeleton
  }
}

function adaptNavigation(decoration: LooseRecord): V3RuntimeConfig['navigation'] {
  const navigation = decoration?.navigation || {}
  const items: LooseRecord[] = Array.isArray(navigation.items) ? navigation.items : []
  const labelKeys: Record<string, string> = {
    portfolio: 'portfolioText',
    about: 'aboutText',
    booking: 'bookingText',
    packages: 'packagesText'
  }
  const entries: V3RuntimeConfig['navigation'] = []
  for (const item of items) {
    const pageKey = item?.key
    if (!pageKey || !(pageKey in labelKeys)) continue
    entries.push({
      pageKey,
      label: String(navigation[labelKeys[pageKey]] || ''),
      visible: item?.enabled !== false
    })
  }
  return entries
}

/**
 * 把 v2.5 配置适配为 v3 运行时视图。只读：不修改入参，也不产生任何副作用。
 */
export function adaptV25ToRuntime(raw: unknown): V3RuntimeConfig {
  if (isV3Runtime(raw)) {
    const runtime = raw as LooseRecord
    return {
      engine: V3_ENGINE,
      designSchemaVersion: String(runtime.designSchemaVersion || V3_SCHEMA_VERSION),
      templateId: String(runtime.templateId || ''),
      designTokens: { ...(runtime.designTokens || {}) },
      v3Pages: { ...(runtime.v3Pages || {}) },
      navigation: [],
      mediaMeta: { ...(runtime.mediaMeta || {}) },
      adaptedFrom: 'v3-runtime'
    }
  }

  const config = (raw || {}) as LooseRecord
  const theme: LooseRecord = config.theme || {}
  const decoration: LooseRecord = config.decoration || {}
  const legacyPages: LooseRecord = decoration.pages || {}

  const designTokens: Record<string, unknown> = {}
  for (const field of THEME_TOKEN_FIELDS) {
    if (theme[field] !== undefined) designTokens[field] = theme[field]
  }

  const v3Pages: Record<string, V3RuntimePage> = {}
  let pageIndex = 0
  for (const [legacyKey, v3Key] of Object.entries(PAGE_KEY_MAP)) {
    const legacyPage = legacyPages[legacyKey]
    if (!legacyPage) continue
    v3Pages[v3Key] = adaptLegacyPage(v3Key, legacyPage, pageIndex)
    pageIndex += 1
  }

  return {
    engine: V3_ENGINE,
    designSchemaVersion: V3_SCHEMA_VERSION,
    templateId: `legacy-${String(theme.preset || 'v25')}`,
    designTokens,
    v3Pages,
    navigation: adaptNavigation(decoration),
    mediaMeta: {},
    adaptedFrom: 'v2.5'
  }
}

/**
 * 运行端统一入口（方案 §7.2）：
 *   const runtime = isV3Runtime(raw) ? asV3Runtime(raw) : adaptV25ToRuntime(raw)
 */
export function resolveRuntime(raw: unknown): V3RuntimeConfig {
  return adaptV25ToRuntime(raw)
}
