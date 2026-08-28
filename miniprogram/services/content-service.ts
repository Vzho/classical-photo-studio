// Content Service（方案 §7.1）：按 dataSource 类型把内容配置解析为区块数据。
// 只读：纯函数，不修改入参；内容缺失时返回 available: false，由渲染层安全降级（§16）。
import {
  buildPortfolioImagesFromConfig,
  buildConfiguredPackages,
  buildConfiguredTestimonials,
  PortfolioItem
} from '../utils/cos'
import { V3DataSource } from '../compatibility/v25-adapter'

export interface BrandContent {
  brandName: string
  slogan: string
  englishName: string
  description: string
  logoUrl: string
}

export interface CategoryItem {
  name: string
  count: number
}

export interface ContactContent {
  stores: any[]
  consultation: any
  consultButton: any
}

export interface BlockContentResult {
  available: boolean
  data: any
}

export interface ContentResolveContext {
  // series 页运行时参数（方案 §9.3 current-series 数据源）
  seriesId?: string
  // packages/packageDetail 页运行时参数
  packageId?: string
}

function toLimit(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function resolveBrand(config: any): BlockContentResult {
  const theme = config?.theme || {}
  const brandName = String(theme.brandName || '').trim()
  if (!brandName) return { available: false, data: null }
  const brand: BrandContent = {
    brandName,
    slogan: String(theme.slogan || theme.subtitle || ''),
    englishName: String(theme.englishName || theme.brandEnglish || ''),
    description: String(theme.description || ''),
    logoUrl: String(theme.logoUrl || '')
  }
  return { available: true, data: brand }
}

function featuredPortfolioItems(config: any): PortfolioItem[] {
  const all = buildPortfolioImagesFromConfig(config)
  const featured = all.filter(item => item.featuredOnHome)
  return featured.length ? featured : all.filter(item => item.isSeriesCover)
}

function resolveFeaturedSeries(config: any, dataSource: V3DataSource): BlockContentResult {
  let items = featuredPortfolioItems(config)
  if (dataSource.ref) {
    const ref = String(dataSource.ref)
    const filtered = items.filter(item => item.category === ref)
    if (filtered.length) items = filtered
  }
  items = items.slice(0, toLimit(dataSource.limit, items.length || 6))
  return { available: items.length > 0, data: items }
}

function resolveCategories(config: any): BlockContentResult {
  const items = buildPortfolioImagesFromConfig(config).filter(item => item.isSeriesCover)
  const counts = new Map<string, number>()
  for (const item of items) {
    const name = String(item.category || '').trim()
    if (!name) continue
    counts.set(name, (counts.get(name) || 0) + 1)
  }
  const categories: CategoryItem[] = Array.from(counts.entries()).map(([name, count]) => ({ name, count }))
  return { available: categories.length > 0, data: categories }
}

function resolveCurrentSeries(config: any, ctx: ContentResolveContext): BlockContentResult {
  if (!ctx.seriesId) return { available: false, data: null }
  const all = buildPortfolioImagesFromConfig(config)
  const photos = all.filter(item => item.seriesId === ctx.seriesId)
  if (!photos.length) return { available: false, data: null }
  const cover = photos.find(item => item.isSeriesCover) || photos[0]
  return {
    available: true,
    data: {
      seriesId: ctx.seriesId,
      title: cover.title,
      category: cover.category,
      likes: cover.likes,
      photoCount: cover.photoCount ?? photos.length,
      photos
    }
  }
}

function resolvePackages(config: any, dataSource: V3DataSource, ctx: ContentResolveContext): BlockContentResult {
  let packages = buildConfiguredPackages(config)
  if (dataSource.ref) {
    const filtered = packages.filter((pkg: any) => String(pkg.id) === String(dataSource.ref))
    if (filtered.length) packages = filtered
  }
  if (ctx.packageId) {
    const filtered = packages.filter((pkg: any) => String(pkg.id) === String(ctx.packageId))
    if (filtered.length) packages = filtered
  }
  packages = packages.slice(0, toLimit(dataSource.limit, packages.length || 10))
  return { available: packages.length > 0, data: packages }
}

function resolveTeam(config: any, dataSource: V3DataSource): BlockContentResult {
  let team = (config?.photographers || []).filter((p: any) => p?.enabled !== false)
  if (dataSource.ref) {
    const filtered = team.filter((p: any) => String(p.id) === String(dataSource.ref))
    if (filtered.length) team = filtered
  }
  team = team.slice(0, toLimit(dataSource.limit, team.length || 10))
  return { available: team.length > 0, data: team }
}

function resolveTestimonials(config: any, dataSource: V3DataSource): BlockContentResult {
  const items = buildConfiguredTestimonials(config)
  const limited = items.slice(0, toLimit(dataSource.limit, items.length || 6))
  return { available: limited.length > 0, data: limited }
}

function resolveServiceFlow(config: any): BlockContentResult {
  const flow = config?.serviceFlow || {}
  const steps = flow.steps || []
  if (flow.enabled === false || !steps.length) return { available: false, data: [] }
  return { available: true, data: steps }
}

function resolveContact(config: any): BlockContentResult {
  const stores = config?.stores || []
  const consultation = config?.consultation || null
  const consultButton = config?.consultButton || null
  if (!stores.length && !consultation) return { available: false, data: null }
  const data: ContactContent = { stores, consultation, consultButton }
  return { available: true, data }
}

/**
 * 解析区块数据源（与 admin 编译期 isDataSourceAvailable 口径一致）：
 * 编译期关闭空区块，运行期再次兜底，保证客户删空内容后页面不白屏。
 */
export function resolveBlockContent(
  config: any,
  dataSource: V3DataSource | undefined,
  ctx: ContentResolveContext = {}
): BlockContentResult {
  const source = dataSource || { type: 'none' }
  switch (source.type) {
    case 'brand':
      return resolveBrand(config)
    case 'featured-series':
      return resolveFeaturedSeries(config, source)
    case 'categories':
      return resolveCategories(config)
    case 'current-series':
      return resolveCurrentSeries(config, ctx)
    case 'packages':
      return resolvePackages(config, source, ctx)
    case 'team':
      return resolveTeam(config, source)
    case 'testimonials':
      return resolveTestimonials(config, source)
    case 'service-flow':
      return resolveServiceFlow(config)
    case 'contact':
      return resolveContact(config)
    case 'none':
      return { available: true, data: null }
    default:
      // 未知数据源：跳过区块而非整页失败（方案 §7.2）
      return { available: false, data: null }
  }
}
