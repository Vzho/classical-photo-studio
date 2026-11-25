// Content Resolver（Admin 侧）：把内容配置解析为 v3 区块数据。
//
// 口径与小程序完全一致（镜像 miniprogram/services/content-service.ts +
// miniprogram/utils/cos.ts 的 generateImagesFromConfig / getConfiguredPackages /
// getConfiguredTestimonials），目的是让「草稿预览」看到的结构与用户线上看到的完全相同。
//
// 与小程序的差异只有一处：小程序通过 getApp().globalData.cos.baseUrl 拼 COS 地址，
// Admin 侧改为由调用方注入 cosBaseUrl，避免依赖 wx API。
//
// 纯函数，只读，不修改入参。
const { deepClone } = require('./design-workspace')

function normalizeStringList(value) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
}

function isModuleEnabled(config, moduleName) {
  return config?.modules?.[moduleName] !== false
}

function getEnabledSortedItems(items) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => item && item.enabled !== false)
    .sort((a, b) => (a.sort || 999) - (b.sort || 999))
}

function toLimit(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

/**
 * COS 图片地址。与小程序 getCosUrl 同口径（含数据万象缩放参数）。
 */
function makeCosUrl(cosBaseUrl, path, options = {}) {
  const base = String(cosBaseUrl || '').replace(/\/+$/, '')
  if (!path) return ''
  if (!base && !String(path).startsWith('http')) return ''

  let url = String(path).startsWith('http') ? String(path) : `${base}/${path}`

  const params = ['imageMogr2']
  if (options.format) params.push(`format/${options.format}`)
  if (options.width) params.push(`thumbnail/${options.width}x`)
  if (options.quality) params.push(`quality/${options.quality}`)
  if (params.length > 1) {
    url += (url.includes('?') ? '&' : '?') + params.join('/')
  }
  return url
}

/**
 * 作品项列表。镜像小程序 generateImagesFromConfig。
 */
function buildPortfolioImages(config, cosBaseUrl) {
  const items = []
  if (!config || !config.themes) return items

  config.themes.forEach((theme) => {
    if (theme?.enabled === false) return
    if (!theme.series) return

    theme.series.forEach((series) => {
      if (series?.enabled === false) return
      if (!series.photos) return

      const hiddenPhotos = new Set(normalizeStringList(series.hiddenPhotos))
      const photos = normalizeStringList(series.photos).filter((name) => !hiddenPhotos.has(name))
      if (!photos.length) return

      const homeSort = Number(series.homeSort)
      const configuredFeaturedPhotos = Array.isArray(series.homeFeaturedPhotos)
        ? Array.from(new Set(normalizeStringList(series.homeFeaturedPhotos).filter((name) => photos.includes(name))))
        : null
      const homeFeaturedPhotos = configuredFeaturedPhotos === null
        ? (series.featuredOnHome === true ? photos.slice(0, 1) : [])
        : configuredFeaturedPhotos
      const homeFeaturedPhotoOrder = new Map(homeFeaturedPhotos.map((name, order) => [name, order]))

      photos.forEach((photoFileName, index) => {
        const isFirstPhoto = index === 0
        items.push({
          id: `${theme.id}-${series.id}-${index + 1}`,
          photoName: photoFileName,
          title: series.title,
          category: theme.name,
          imageUrl: makeCosUrl(cosBaseUrl, `portfolio/${photoFileName}`, { width: 400, format: 'webp' }),
          originalUrl: makeCosUrl(cosBaseUrl, `portfolio/${photoFileName}`),
          likes: series.likes,
          seriesId: `series-${theme.id}-${series.id}`,
          isSeriesCover: isFirstPhoto,
          featuredOnHome: homeFeaturedPhotoOrder.has(photoFileName),
          homeSort: Number.isFinite(homeSort) ? homeSort : undefined,
          homePhotoSort: homeFeaturedPhotoOrder.get(photoFileName),
          photoCount: isFirstPhoto ? photos.length : undefined,
          bannerDescription: series.bannerDescription,
          description: series.description,
          suitableFor: normalizeStringList(series.suitableFor),
          scenes: normalizeStringList(series.scenes),
          tags: normalizeStringList(series.tags)
        })
      })
    })
  })

  return items
}

function buildPackages(config) {
  if (!isModuleEnabled(config, 'packages')) return []
  return getEnabledSortedItems(config?.packages)
}

function buildTestimonials(config) {
  if (!isModuleEnabled(config, 'testimonials')) return []
  return getEnabledSortedItems(config?.testimonials)
}

function resolveBrand(config) {
  const theme = config?.theme || {}
  const brandName = String(theme.brandName || '').trim()
  if (!brandName) return { available: false, data: null }
  return {
    available: true,
    data: {
      brandName,
      slogan: String(theme.slogan || theme.subtitle || ''),
      englishName: String(theme.englishName || theme.brandEnglish || ''),
      description: String(theme.description || ''),
      logoUrl: String(theme.logoUrl || '')
    }
  }
}

function resolveFeaturedSeries(config, dataSource, cosBaseUrl) {
  const all = buildPortfolioImages(config, cosBaseUrl)
  let items = all.filter((item) => item.featuredOnHome)
  if (!items.length) items = all.filter((item) => item.isSeriesCover)
  if (dataSource.ref) {
    const filtered = items.filter((item) => item.category === dataSource.ref)
    if (filtered.length) items = filtered
  }
  items = items.slice(0, toLimit(dataSource.limit, items.length || 6))
  return { available: items.length > 0, data: items }
}

function resolveCategories(config, cosBaseUrl) {
  const items = buildPortfolioImages(config, cosBaseUrl).filter((item) => item.isSeriesCover)
  const counts = new Map()
  for (const item of items) {
    const name = String(item.category || '').trim()
    if (!name) continue
    counts.set(name, (counts.get(name) || 0) + 1)
  }
  const categories = Array.from(counts.entries()).map(([name, count]) => ({ name, count }))
  return { available: categories.length > 0, data: categories }
}

function resolvePackages(config, dataSource) {
  let packages = buildPackages(config)
  if (dataSource.ref) {
    const filtered = packages.filter((pkg) => String(pkg.id) === String(dataSource.ref))
    if (filtered.length) packages = filtered
  }
  packages = packages.slice(0, toLimit(dataSource.limit, packages.length || 10))
  return { available: packages.length > 0, data: packages }
}

function resolveTeam(config, dataSource) {
  let team = (config?.photographers || []).filter((person) => person?.enabled !== false)
  if (dataSource.ref) {
    const filtered = team.filter((person) => String(person.id) === String(dataSource.ref))
    if (filtered.length) team = filtered
  }
  team = team.slice(0, toLimit(dataSource.limit, team.length || 10))
  return { available: team.length > 0, data: team }
}

function resolveTestimonials(config, dataSource) {
  const all = buildTestimonials(config)
  const items = all.slice(0, toLimit(dataSource.limit, all.length || 6))
  return { available: items.length > 0, data: items }
}

function resolveServiceFlow(config) {
  const flow = config?.serviceFlow || {}
  const steps = flow.steps || []
  if (flow.enabled === false || !steps.length) return { available: false, data: [] }
  return { available: true, data: steps }
}

function resolveContact(config) {
  const stores = config?.stores || []
  const consultation = config?.consultation || null
  const consultButton = config?.consultButton || null
  if (!stores.length && !consultation) return { available: false, data: null }
  return { available: true, data: { stores, consultation, consultButton } }
}

/**
 * 解析单个区块的数据源。口径与小程序 resolveBlockContent 一致。
 */
function resolveBlockContent(config, dataSource, options = {}) {
  const cosBaseUrl = options.cosBaseUrl || ''
  const source = dataSource || { type: 'none' }
  switch (source.type) {
    case 'brand':
      return resolveBrand(config)
    case 'featured-series':
      return resolveFeaturedSeries(config, source, cosBaseUrl)
    case 'categories':
      return resolveCategories(config, cosBaseUrl)
    case 'current-series':
      // 详情页数据依赖运行时参数，预览阶段不渲染具体系列。
      return { available: false, data: null }
    case 'packages':
      return resolvePackages(config, source)
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
      return { available: false, data: null }
  }
}

/**
 * 为编译后的 runtime 补齐每个区块的预览内容。
 * runtime 由 runtime-compiler 产出（结构与线上完全一致），
 * 这里只做「内容填充」，不改变任何区块结构、顺序或开关。
 */
function attachBlockContent(runtime, contentConfig, options = {}) {
  const cosBaseUrl = options.cosBaseUrl || ''
  if (!runtime || !runtime.v3Pages) return runtime

  for (const [pageKey, page] of Object.entries(runtime.v3Pages)) {
    if (!page || !Array.isArray(page.blocks)) continue
    for (const block of page.blocks) {
      const result = resolveBlockContent(contentConfig, block.dataSource, { cosBaseUrl })
      block.content = deepClone(result.data)
      block.contentAvailable = result.available
    }
    // 便于前端按页面分组展示
    runtime.__previewPages = runtime.__previewPages || {}
    runtime.__previewPages[pageKey] = page.blocks.length
  }
  return runtime
}

/**
 * Content Resolver 工厂。与其它 service 保持一致的装配方式。
 */
function createContentResolver() {
  return {
    attachBlockContent,
    resolveBlockContent,
    buildPortfolioImages,
    buildPackages,
    buildTestimonials,
    makeCosUrl
  }
}

module.exports = { createContentResolver }
