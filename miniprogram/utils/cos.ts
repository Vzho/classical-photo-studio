// 腾讯云COS工具类

export interface CosConfig {
  bucket: string
  region: string
  baseUrl: string
}

export interface PortfolioItem {
  id: string
  title: string
  category: string
  imageUrl: string
  originalUrl?: string // 新增原图字段
  likes: number
  seriesId?: string
  isSeriesCover?: boolean
  photoCount?: number
  bannerDescription?: string
  description?: string
  suitableFor?: string[]
  scenes?: string[]
  tags?: string[]
  relatedPackageIds?: string[]
  relatedPhotographerIds?: string[]
  candidatePhotoNames?: string[]
  candidateIndex?: number
}

export interface HomeBannerContent {
  logoText: string
  tagText: string
  description: string
}

export interface BookingContent {
  styleOptions: string[]
}

export interface ThemeContent {
  enabled?: boolean
  preset?: string
  brandName?: string
  primaryColor?: string
  backgroundColor?: string
  textColor?: string
  cardStyle?: string
  buttonStyle?: string
  imageRadius?: string
  layoutDensity?: string
  homeLayout?: string
  showDecorations?: boolean
}

export interface PackageItem {
  id: string
  name: string
  priceText?: string
  subtitle?: string
  duration?: string
  retouchCount?: string
  originalPhotos?: string
  makeupIncluded?: boolean
  makeupText?: string
  includes?: string[]
  suitableFor?: string[]
  relatedSeriesIds?: string[]
  relatedPhotographerIds?: string[]
  isRecommended?: boolean
  sort?: number
  enabled?: boolean
}

export interface ScheduleContent {
  enabled?: boolean
  title?: string
  notice?: string
  availableText?: string
  restDays?: string[]
  busyDates?: string[]
  specialNotes?: string[]
}

export interface TestimonialItem {
  id: string
  name: string
  shootType?: string
  content: string
  imageUrl?: string
  relatedSeriesId?: string
  relatedPackageId?: string
  dateText?: string
  sort?: number
  enabled?: boolean
}

export interface ConsultationContent {
  title?: string
  description?: string
  template?: string
  privacyTip?: string
}

export interface ServiceFlowContent {
  enabled?: boolean
  steps?: Array<{
    title: string
    description: string
  }>
}

export interface FaqContent {
  enabled?: boolean
  items?: Array<{
    question: string
    answer: string
  }>
}

export interface ConsultButtonContent {
  enabled?: boolean
  text?: string
  action?: 'booking' | 'copyWechat' | 'contact' | 'phone'
  showOnPages?: string[]
}

export interface StoreItem {
  id: string
  name: string
  address?: string
  phone?: string
  businessHours?: string
  transportTips?: string
  latitude?: number | null
  longitude?: number | null
  sort?: number
  enabled?: boolean
}

export interface TeamPhotographerItem {
  id: string
  name: string
  title?: string
  avatar?: string
  bio?: string
  skills?: string[]
  relatedSeriesIds?: string[]
  relatedPackageIds?: string[]
  sort?: number
  enabled?: boolean
}

export interface SeriesInfo {
  id: string
  title: string
  category: string
  likes: number
  photoCount: number
  bannerDescription?: string
  description?: string
  suitableFor: string[]
  scenes: string[]
  tags: string[]
  relatedPackageIds: string[]
  relatedPhotographerIds: string[]
}

function isModuleEnabled(config: any, moduleName: string): boolean {
  return config?.modules?.[moduleName] !== false
}

function getEnabledSortedItems<T extends { enabled?: boolean; sort?: number }>(items?: T[]): T[] {
  return (Array.isArray(items) ? items : [])
    .filter(item => item && item.enabled !== false)
    .sort((a, b) => (a.sort || 999) - (b.sort || 999))
}

function getConfiguredPackages(config: any): PackageItem[] {
  if (!isModuleEnabled(config, 'packages')) return []
  return getEnabledSortedItems<PackageItem>(config?.packages)
}

export function buildThemeStyle(theme?: Partial<ThemeContent> | null): string {
  if (!theme || theme.enabled === false) return ''

  const styles: string[] = []
  if (theme.primaryColor) styles.push(`--primary: ${theme.primaryColor}`)
  if (theme.backgroundColor) styles.push(`--bg-light: ${theme.backgroundColor}`)
  if (theme.textColor) styles.push(`--text-main: ${theme.textColor}`)

  const cardStyle = theme.cardStyle || 'soft'
  const buttonStyle = theme.buttonStyle || 'rounded'
  const imageRadius = theme.imageRadius || 'medium'
  const layoutDensity = theme.layoutDensity || 'comfortable'

  const cardShadowMap: Record<string, string> = {
    minimal: 'none',
    soft: '0 8rpx 24rpx rgba(0,0,0,0.03)',
    elevated: '0 16rpx 40rpx rgba(0,0,0,0.08)'
  }
  const cardBorderMap: Record<string, string> = {
    minimal: '#e7e5e4',
    soft: '#f5f5f4',
    elevated: 'transparent'
  }
  const buttonRadiusMap: Record<string, string> = {
    square: '8rpx',
    rounded: '22rpx',
    pill: '999rpx'
  }
  const imageRadiusMap: Record<string, string> = {
    none: '0',
    small: '12rpx',
    medium: '24rpx',
    large: '36rpx'
  }
  const densityMap: Record<string, { gap: string; padding: string; pagePadding: string }> = {
    compact: { gap: '18rpx', padding: '22rpx', pagePadding: '24rpx' },
    comfortable: { gap: '24rpx', padding: '28rpx', pagePadding: '32rpx' },
    airy: { gap: '34rpx', padding: '36rpx', pagePadding: '40rpx' }
  }
  const density = densityMap[layoutDensity] || densityMap.comfortable

  styles.push(`--card-shadow: ${cardShadowMap[cardStyle] || cardShadowMap.soft}`)
  styles.push(`--card-border: ${cardBorderMap[cardStyle] || cardBorderMap.soft}`)
  styles.push(`--button-radius: ${buttonRadiusMap[buttonStyle] || buttonRadiusMap.rounded}`)
  styles.push(`--image-radius: ${imageRadiusMap[imageRadius] || imageRadiusMap.medium}`)
  styles.push(`--card-radius: ${imageRadiusMap[imageRadius] || imageRadiusMap.medium}`)
  styles.push(`--section-gap: ${density.gap}`)
  styles.push(`--card-padding: ${density.padding}`)
  styles.push(`--page-padding: ${density.pagePadding}`)
  styles.push(`--decoration-opacity: ${theme.showDecorations === false ? '0' : '1'}`)

  return styles.length ? `${styles.join('; ')};` : ''
}

function getConfiguredTestimonials(config: any): TestimonialItem[] {
  if (!isModuleEnabled(config, 'testimonials')) return []
  return getEnabledSortedItems<TestimonialItem>(config?.testimonials)
}

function getConfiguredStores(config: any): StoreItem[] {
  if (!isModuleEnabled(config, 'stores')) return []

  const stores = getEnabledSortedItems<StoreItem>(config?.stores)
  if (stores.length > 0) return stores

  const studio = config?.photographer?.studio
  if (!studio?.name && !studio?.address) return []

  return [{
    id: 'primary-store',
    name: studio.name || '门店地址',
    address: studio.address || '',
    latitude: studio.latitude ?? null,
    longitude: studio.longitude ?? null,
    sort: 1,
    enabled: true
  }]
}

function getConfiguredPhotographers(config: any): TeamPhotographerItem[] {
  if (!isModuleEnabled(config, 'photographers')) return []

  const photographers = getEnabledSortedItems<TeamPhotographerItem>(config?.photographers)
  if (photographers.length > 0) return photographers

  const photographer = config?.photographer
  if (!photographer?.name) return []

  return [{
    id: 'primary-photographer',
    name: photographer.name,
    title: photographer.title,
    avatar: photographer.avatar,
    bio: photographer.bio,
    skills: photographer.skills || [],
    sort: 1,
    enabled: true
  }]
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []

  return value
    .map(item => String(item || '').trim())
    .filter(Boolean)
}

function findSeriesConfig(config: any, seriesId: string): { theme: any; series: any; normalizedId: string } | null {
  if (!config?.themes) return null

  for (const theme of config.themes) {
    if (!theme?.series) continue

    for (const series of theme.series) {
      const normalizedId = `series-${theme.id}-${series.id}`
      if (normalizedId === seriesId) {
        return { theme, series, normalizedId }
      }
    }
  }

  return null
}

function buildSeriesInfo(config: any, seriesId: string, images: PortfolioItem[]): SeriesInfo | null {
  const matched = findSeriesConfig(config, seriesId)
  const firstImage = images[0]

  if (!matched && !firstImage) return null

  const theme = matched?.theme
  const series = matched?.series

  return {
    id: seriesId,
    title: series?.title || firstImage?.title || '',
    category: theme?.name || firstImage?.category || '',
    likes: Number(series?.likes ?? firstImage?.likes ?? 0),
    photoCount: Array.isArray(series?.photos) ? series.photos.length : images.length,
    bannerDescription: series?.bannerDescription || firstImage?.bannerDescription || '',
    description: series?.description || firstImage?.description || '',
    suitableFor: normalizeStringList(series?.suitableFor || firstImage?.suitableFor),
    scenes: normalizeStringList(series?.scenes || firstImage?.scenes),
    tags: normalizeStringList(series?.tags || firstImage?.tags),
    relatedPackageIds: normalizeStringList(series?.relatedPackageIds || firstImage?.relatedPackageIds),
    relatedPhotographerIds: normalizeStringList(series?.relatedPhotographerIds || firstImage?.relatedPhotographerIds)
  }
}

// 获取COS图片完整URL
// options: { width?: number, quality?: number, format?: 'webp' | 'jpg' }
export function getCosUrl(path: string, options?: { width?: number, quality?: number, format?: string }): string {
  const app = getApp<IAppOption>()
  const { baseUrl } = app.globalData.cos
  
  let url = path.startsWith('http') ? path : `${baseUrl}/${path}`
  
  // 添加图片处理参数 (腾讯云数据万象)
  if (options) {
    const params: string[] = ['imageMogr2']
    if (options.format) params.push(`format/${options.format}`)
    if (options.width) params.push(`thumbnail/${options.width}x`)
    if (options.quality) params.push(`quality/${options.quality}`)
    
    if (params.length > 1) {
      url += (url.includes('?') ? '&' : '?') + params.join('/')
    }
  }
  
  return url
}

// 获取作品集列表（优先从COS获取动态配置）
export async function getPortfolioImages(): Promise<PortfolioItem[]> {
  try {
    const config = await loadConfig()
    const allImages = generateImagesFromConfig(config)
    return allImages.filter(item => item.isSeriesCover)
  } catch (error) {
    console.error('加载配置失败:', error)
    return []
  }
}

export async function getPortfolioPageData(): Promise<{
  portfolioItems: PortfolioItem[]
  homeBanner: Partial<HomeBannerContent> | null
  theme: Partial<ThemeContent> | null
  packages: PackageItem[]
  schedule: Partial<ScheduleContent> | null
  testimonials: TestimonialItem[]
  serviceFlow: Partial<ServiceFlowContent> | null
  consultButton: Partial<ConsultButtonContent> | null
}> {
  try {
    const config = await loadConfig()
    const allImages = generateImagesFromConfig(config)

    return {
      portfolioItems: allImages.filter(item => item.isSeriesCover),
      homeBanner: config?.homeBanner || null,
      theme: isModuleEnabled(config, 'theme') ? config?.theme || null : null,
      packages: getConfiguredPackages(config).filter(item => item.isRecommended).slice(0, 3),
      schedule: isModuleEnabled(config, 'schedule') ? config?.schedule || null : null,
      testimonials: getConfiguredTestimonials(config).slice(0, 3),
      serviceFlow: isModuleEnabled(config, 'serviceFlow') ? config?.serviceFlow || null : null,
      consultButton: isModuleEnabled(config, 'consultButton') ? config?.consultButton || null : { enabled: false }
    }
  } catch (error) {
    console.error('加载首页配置失败:', error)
    return {
      portfolioItems: [],
      homeBanner: null,
      theme: null,
      packages: [],
      schedule: null,
      testimonials: [],
      serviceFlow: null,
      consultButton: null
    }
  }
}

// 获取系列的所有照片
export async function getSeriesImages(seriesId: string): Promise<PortfolioItem[]> {
  try {
    const config = await loadConfig()
    const allImages = generateImagesFromConfig(config)
    return allImages
      .filter(item => item.seriesId === seriesId)
      .map(item => {
        if (!item.originalUrl) {
          return item
        }

        const urlPart = item.originalUrl.split('?')[0]
        const parts = urlPart.split('/portfolio/')
        if (parts.length <= 1) {
          return item
        }

        const path = `portfolio/${parts[1]}`
        return {
          ...item,
          // 系列详情页列表使用高质量压缩图，兼顾清晰度和加载速度。
          // 点击预览仍然走 originalUrl 原图。
          imageUrl: getCosUrl(path, { width: 1400, format: 'webp', quality: 90 })
        }
      })
  } catch (error) {
    console.error('加载配置失败:', error)
    return []
  }
}

export async function getSeriesPageData(seriesId: string): Promise<{
  images: PortfolioItem[]
  seriesInfo: SeriesInfo | null
  theme: Partial<ThemeContent> | null
  consultButton: Partial<ConsultButtonContent> | null
  packages: PackageItem[]
  testimonials: TestimonialItem[]
  photographers: TeamPhotographerItem[]
}> {
  try {
    const config = await loadConfig()
    const allImages = generateImagesFromConfig(config)
    const images = allImages
      .filter(item => item.seriesId === seriesId)
      .map(item => {
        if (!item.originalUrl) {
          return item
        }

        const urlPart = item.originalUrl.split('?')[0]
        const parts = urlPart.split('/portfolio/')
        if (parts.length <= 1) {
          return item
        }

        const path = `portfolio/${parts[1]}`
        return {
          ...item,
          imageUrl: getCosUrl(path, { width: 1400, format: 'webp', quality: 90 })
        }
      })
    const seriesInfo = buildSeriesInfo(config, seriesId, images)
    const relatedPackageIds = seriesInfo?.relatedPackageIds || []
    const relatedPhotographerIds = seriesInfo?.relatedPhotographerIds || []

    return {
      images,
      seriesInfo,
      theme: isModuleEnabled(config, 'theme') ? config?.theme || null : null,
      consultButton: isModuleEnabled(config, 'consultButton') ? config?.consultButton || null : { enabled: false },
      packages: getConfiguredPackages(config).filter(item => {
        return (item.relatedSeriesIds || []).includes(seriesId) || relatedPackageIds.includes(item.id)
      }),
      testimonials: getConfiguredTestimonials(config).filter(item => item.relatedSeriesId === seriesId),
      photographers: getConfiguredPhotographers(config).filter(item => {
        return (item.relatedSeriesIds || []).includes(seriesId) || relatedPhotographerIds.includes(item.id)
      })
    }
  } catch (error) {
    console.error('加载系列详情配置失败:', error)
    return {
      images: [],
      seriesInfo: null,
      theme: null,
      consultButton: null,
      packages: [],
      testimonials: [],
      photographers: []
    }
  }
}

// 获取摄影师个人资料
export async function getPhotographerProfile(): Promise<any> {
  try {
    const config = await loadConfig()
    // 如果配置中有 photographer 字段则使用，否则尝试从 constants (为了兼容，或者直接返回空)
    // 既然我们已经迁移了数据，这里应该优先使用 config
    if (config && config.photographer) {
      return config.photographer
    }
    // Fallback logic if needed, or return null
    return null
  } catch (error) {
    console.error('加载摄影师配置失败:', error)
    return null
  }
}

export async function getBookingPageData(): Promise<{
  photographer: any | null
  booking: Partial<BookingContent> | null
  theme: Partial<ThemeContent> | null
  packages: PackageItem[]
  schedule: Partial<ScheduleContent> | null
  testimonials: TestimonialItem[]
  consultation: Partial<ConsultationContent> | null
  serviceFlow: Partial<ServiceFlowContent> | null
  faq: Partial<FaqContent> | null
  stores: StoreItem[]
  photographers: TeamPhotographerItem[]
}> {
  try {
    const config = await loadConfig()

    return {
      photographer: config?.photographer || null,
      booking: config?.booking || null,
      theme: isModuleEnabled(config, 'theme') ? config?.theme || null : null,
      packages: getConfiguredPackages(config),
      schedule: isModuleEnabled(config, 'schedule') ? config?.schedule || null : null,
      testimonials: getConfiguredTestimonials(config),
      consultation: config?.consultation || null,
      serviceFlow: isModuleEnabled(config, 'serviceFlow') ? config?.serviceFlow || null : null,
      faq: isModuleEnabled(config, 'faq') ? config?.faq || null : null,
      stores: getConfiguredStores(config),
      photographers: getConfiguredPhotographers(config)
    }
  } catch (error) {
    console.error('加载预约页配置失败:', error)
    return {
      photographer: null,
      booking: null,
      theme: null,
      packages: [],
      schedule: null,
      testimonials: [],
      consultation: null,
      serviceFlow: null,
      faq: null,
      stores: [],
      photographers: []
    }
  }
}

export async function getPackagesPageData(): Promise<{
  theme: Partial<ThemeContent> | null
  packages: PackageItem[]
  schedule: Partial<ScheduleContent> | null
  testimonials: TestimonialItem[]
  consultButton: Partial<ConsultButtonContent> | null
}> {
  try {
    const config = await loadConfig()

    return {
      theme: isModuleEnabled(config, 'theme') ? config?.theme || null : null,
      packages: getConfiguredPackages(config),
      schedule: isModuleEnabled(config, 'schedule') ? config?.schedule || null : null,
      testimonials: getConfiguredTestimonials(config),
      consultButton: isModuleEnabled(config, 'consultButton') ? config?.consultButton || null : { enabled: false }
    }
  } catch (error) {
    console.error('加载套餐页配置失败:', error)
    return {
      theme: null,
      packages: [],
      schedule: null,
      testimonials: [],
      consultButton: null
    }
  }
}

export async function getPackageDetailPageData(packageId: string): Promise<{
  theme: Partial<ThemeContent> | null
  packageItem: PackageItem | null
  relatedSeries: PortfolioItem[]
  photographers: TeamPhotographerItem[]
  testimonials: TestimonialItem[]
  serviceFlow: Partial<ServiceFlowContent> | null
  faq: Partial<FaqContent> | null
  consultButton: Partial<ConsultButtonContent> | null
}> {
  try {
    const config = await loadConfig()
    const packageItem = getConfiguredPackages(config).find(item => item.id === packageId) || null
    const relatedSeriesIds = packageItem?.relatedSeriesIds || []
    const relatedPhotographerIds = packageItem?.relatedPhotographerIds || []
    const relatedSeries = generateImagesFromConfig(config)
      .filter(item => item.isSeriesCover && item.seriesId && relatedSeriesIds.includes(item.seriesId))
    const photographers = getConfiguredPhotographers(config)
      .filter(item => (item.relatedPackageIds || []).includes(packageId) || relatedPhotographerIds.includes(item.id))

    return {
      theme: isModuleEnabled(config, 'theme') ? config?.theme || null : null,
      packageItem,
      relatedSeries,
      photographers,
      testimonials: getConfiguredTestimonials(config).filter(item => item.relatedPackageId === packageId),
      serviceFlow: isModuleEnabled(config, 'serviceFlow') ? config?.serviceFlow || null : null,
      faq: isModuleEnabled(config, 'faq') ? config?.faq || null : null,
      consultButton: isModuleEnabled(config, 'consultButton') ? config?.consultButton || null : { enabled: false }
    }
  } catch (error) {
    console.error('加载套餐详情配置失败:', error)
    return {
      theme: null,
      packageItem: null,
      relatedSeries: [],
      photographers: [],
      testimonials: [],
      serviceFlow: null,
      faq: null,
      consultButton: null
    }
  }
}

export async function getAboutPageData(): Promise<{
  photographer: any | null
  theme: Partial<ThemeContent> | null
  consultButton: Partial<ConsultButtonContent> | null
  packages: PackageItem[]
  stores: StoreItem[]
  photographers: TeamPhotographerItem[]
  testimonials: TestimonialItem[]
  serviceFlow: Partial<ServiceFlowContent> | null
  faq: Partial<FaqContent> | null
}> {
  try {
    const config = await loadConfig()

    return {
      photographer: config?.photographer || null,
      theme: isModuleEnabled(config, 'theme') ? config?.theme || null : null,
      consultButton: isModuleEnabled(config, 'consultButton') ? config?.consultButton || null : { enabled: false },
      packages: getConfiguredPackages(config),
      stores: getConfiguredStores(config),
      photographers: getConfiguredPhotographers(config),
      testimonials: getConfiguredTestimonials(config),
      serviceFlow: isModuleEnabled(config, 'serviceFlow') ? config?.serviceFlow || null : null,
      faq: isModuleEnabled(config, 'faq') ? config?.faq || null : null
    }
  } catch (error) {
    console.error('加载简介页配置失败:', error)
    return {
      photographer: null,
      theme: null,
      consultButton: null,
      packages: [],
      stores: [],
      photographers: [],
      testimonials: [],
      serviceFlow: null,
      faq: null
    }
  }
}

// 加载配置（优先网络，失败则本地）
async function loadConfig(): Promise<any> {
  // 1. 尝试从 COS 获取
  const configUrl = getCosUrl('config/portfolio-config.json?t=' + Date.now()) // 添加时间戳避免缓存
  
  try {
    return await new Promise((resolve, reject) => {
      wx.request({
        url: configUrl,
        success: (res) => {
          if (res.statusCode === 200) {
            console.log('✅ 成功加载远程配置')
            resolve(res.data)
          } else {
            console.warn('远程配置加载失败，状态码:', res.statusCode)
            reject(new Error('Fetch failed'))
          }
        },
        fail: (err) => {
          console.warn('远程配置请求失败:', err)
          reject(err)
        }
      })
    })
  } catch (e) {
    console.log('⚠️ 降级使用本地配置')
    // 2. 失败则使用本地配置
    return require('../data/portfolio-config.json')
  }
}

// 从配置生成图片列表
function generateImagesFromConfig(config: any): PortfolioItem[] {
  const items: PortfolioItem[] = []
  
  if (!config || !config.themes) {
    return items
  }
  
  config.themes.forEach((theme: any) => {
    if (!theme.series) return
    
    theme.series.forEach((series: any) => {
      if (!series.photos) return
      
      series.photos.forEach((photoFileName: string, index: number) => {
        const isFirstPhoto = index === 0
        const photoId = `${theme.id}-${series.id}-${index + 1}`
        const seriesId = `series-${theme.id}-${series.id}`
        
        items.push({
          id: photoId,
          title: series.title,
          category: theme.name,
          // 列表页使用 WebP 格式 + 400宽缩略图
          imageUrl: getCosUrl(`portfolio/${photoFileName}`, { width: 400, format: 'webp' }),
          // 原图 URL (用于预览)
          originalUrl: getCosUrl(`portfolio/${photoFileName}`),
          likes: series.likes,
          seriesId: seriesId,
          isSeriesCover: isFirstPhoto,
          photoCount: isFirstPhoto ? series.photos.length : undefined,
          bannerDescription: series.bannerDescription,
          description: series.description,
          suitableFor: normalizeStringList(series.suitableFor),
          scenes: normalizeStringList(series.scenes),
          tags: normalizeStringList(series.tags),
          relatedPackageIds: normalizeStringList(series.relatedPackageIds),
          relatedPhotographerIds: normalizeStringList(series.relatedPhotographerIds),
          candidatePhotoNames: isFirstPhoto ? [...series.photos] : undefined,
          candidateIndex: isFirstPhoto ? 0 : undefined
        })
      })
    })
  })
  
  return items
}
