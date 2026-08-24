// 腾讯云COS工具类

import {
  DecorationContent,
  normalizeDecoration
} from './decoration'

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
  featuredOnHome?: boolean
  homeSort?: number
  homePhotoSort?: number
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

export interface ShareContent {
  title: string
  imagePath: string
  fallbackImageUrl?: string
}

export interface BookingContent {
  styleOptions: string[]
}

export interface ThemeContent {
  enabled?: boolean
  preset?: string
  brandName?: string
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  backgroundColor?: string
  surfaceColor?: string
  surfaceMutedColor?: string
  textColor?: string
  mutedTextColor?: string
  dividerColor?: string
  buttonTextColor?: string
  cardStyle?: string
  buttonStyle?: string
  fontStyle?: string
  headingStyle?: string
  quickJumpStyle?: string
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

export interface HomePortfolioCardContent {
  showPhotoCount?: boolean
  showDescription?: boolean
  showTags?: boolean
}

export interface QuickJumpContent {
  enabled?: boolean
  bookingText?: string
  portfolioText?: string
  appearance?: string
  triggerIcon?: string
  bookingIcon?: string
  portfolioIcon?: string
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

const DEFAULT_HOME_PORTFOLIO_CARD: Required<HomePortfolioCardContent> = {
  showPhotoCount: false,
  showDescription: false,
  showTags: false
}

const DEFAULT_QUICK_JUMP: Required<QuickJumpContent> = {
  enabled: true,
  bookingText: '咨询',
  portfolioText: '作品集',
  appearance: 'solid',
  triggerIcon: 'navigation',
  bookingIcon: 'calendar-days',
  portfolioIcon: 'images'
}

export const DEFAULT_SHARE_CONTENT: ShareContent = {
  title: '妆造作品合集',
  imagePath: '',
  fallbackImageUrl: ''
}

function compareHomeFeaturedItems(left: PortfolioItem, right: PortfolioItem): number {
  const leftSeriesSort = Number.isFinite(left.homeSort) ? Number(left.homeSort) : Number.MAX_SAFE_INTEGER
  const rightSeriesSort = Number.isFinite(right.homeSort) ? Number(right.homeSort) : Number.MAX_SAFE_INTEGER
  if (leftSeriesSort !== rightSeriesSort) return leftSeriesSort - rightSeriesSort

  if (left.seriesId === right.seriesId) {
    const leftPhotoSort = Number.isFinite(left.homePhotoSort) ? Number(left.homePhotoSort) : Number.MAX_SAFE_INTEGER
    const rightPhotoSort = Number.isFinite(right.homePhotoSort) ? Number(right.homePhotoSort) : Number.MAX_SAFE_INTEGER
    if (leftPhotoSort !== rightPhotoSort) return leftPhotoSort - rightPhotoSort
  }

  return right.likes - left.likes
}

export function getShareContent(config: any, images?: PortfolioItem[]): ShareContent {
  const title = String(
    config?.share?.title
      || config?.theme?.brandName
      || config?.homeBanner?.logoText
      || DEFAULT_SHARE_CONTENT.title
  ).trim() || DEFAULT_SHARE_CONTENT.title
  const allImages = images || generateImagesFromConfig(config)
  const covers = allImages.filter(item => item.isSeriesCover)
  const featuredImages = allImages
    .filter(item => item.featuredOnHome)
    .sort(compareHomeFeaturedItems)
  const fallback = featuredImages[0] || covers[0]

  return {
    title,
    imagePath: String(config?.share?.imagePath || '').trim(),
    fallbackImageUrl: fallback?.originalUrl || ''
  }
}

function getHomePortfolioCardConfig(config: any): Required<HomePortfolioCardContent> {
  return {
    ...DEFAULT_HOME_PORTFOLIO_CARD,
    ...(config?.homePortfolioCard || {})
  }
}

function getQuickJumpConfig(config: any): Required<QuickJumpContent> {
  const quickJumpIcons = normalizeDecoration(config?.decoration).icons.quickJump
  const appearance = ['solid', 'soft', 'outline'].includes(config?.theme?.quickJumpStyle)
    ? config.theme.quickJumpStyle
    : DEFAULT_QUICK_JUMP.appearance
  if (!isModuleEnabled(config, 'quickJump')) {
    return {
      ...DEFAULT_QUICK_JUMP,
      appearance,
      triggerIcon: quickJumpIcons.trigger,
      bookingIcon: quickJumpIcons.booking,
      portfolioIcon: quickJumpIcons.portfolio,
      enabled: false
    }
  }

  return {
    ...DEFAULT_QUICK_JUMP,
    ...(config?.quickJump || {}),
    appearance,
    triggerIcon: quickJumpIcons.trigger,
    bookingIcon: quickJumpIcons.booking,
    portfolioIcon: quickJumpIcons.portfolio
  }
}

export function shouldShowQuickJump(quickJump: Partial<QuickJumpContent> | null | undefined, _pageKey: string): boolean {
  const normalized = {
    ...DEFAULT_QUICK_JUMP,
    ...(quickJump || {})
  }

  if (normalized.enabled === false) return false
  return true
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

  const cardStyle = theme.cardStyle || 'soft'
  const buttonStyle = theme.buttonStyle || 'rounded'
  const fontStyle = theme.fontStyle || 'clean'
  const headingStyle = theme.headingStyle || 'clean'
  const quickJumpStyle = theme.quickJumpStyle || 'solid'
  const imageRadius = theme.imageRadius || 'medium'
  const layoutDensity = theme.layoutDensity || 'comfortable'
  const preset = getThemePreset(theme)
  const presetPalette: Record<string, {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    surfaceMuted: string
    text: string
    textMuted: string
    divider: string
  }> = {
    minimal: {
      primary: '#242321',
      secondary: '#52645B',
      accent: '#B18A52',
      background: '#F4F2ED',
      surface: '#FFFFFF',
      surfaceMuted: '#ECE9E2',
      text: '#242321',
      textMuted: '#706D66',
      divider: '#DEDAD1'
    },
    film: {
      primary: '#764B38',
      secondary: '#415A4C',
      accent: '#C49358',
      background: '#F2EADF',
      surface: '#FFFDF9',
      surfaceMuted: '#E8DED0',
      text: '#2C2521',
      textMuted: '#786E66',
      divider: '#DCCFC0'
    },
    bridal: {
      primary: '#7D5A55',
      secondary: '#64756B',
      accent: '#B99860',
      background: '#F7F3EF',
      surface: '#FFFFFF',
      surfaceMuted: '#EEE8E3',
      text: '#302B29',
      textMuted: '#776F6B',
      divider: '#E3DCD6'
    },
    family: {
      primary: '#416B5B',
      secondary: '#B86F4D',
      accent: '#C8A84F',
      background: '#F3F6F1',
      surface: '#FFFFFF',
      surfaceMuted: '#E8EEE8',
      text: '#27322E',
      textMuted: '#68736E',
      divider: '#D8E0DA'
    },
    oriental: {
      primary: '#773D36',
      secondary: '#284A40',
      accent: '#B48B4F',
      background: '#F2EEE6',
      surface: '#FCFBF8',
      surfaceMuted: '#E8E1D5',
      text: '#292521',
      textMuted: '#746D64',
      divider: '#DCD3C6'
    },
    luxury: {
      primary: '#692C35',
      secondary: '#263A35',
      accent: '#AF8848',
      background: '#F4EFE7',
      surface: '#FFFCF8',
      surfaceMuted: '#E9DED1',
      text: '#241F1F',
      textMuted: '#746761',
      divider: '#D8C7B7'
    },
    'oriental-premium': {
      primary: '#8A302B',
      secondary: '#142C27',
      accent: '#C6A96B',
      background: '#F1EFE8',
      surface: '#FCFBF7',
      surfaceMuted: '#E4DED2',
      text: '#161A18',
      textMuted: '#6A655D',
      divider: '#CCC1AF'
    },
    'editorial-studio': {
      primary: '#101010',
      secondary: '#2D4BFF',
      accent: '#D9FF3F',
      background: '#EFEFEB',
      surface: '#FFFFFF',
      surfaceMuted: '#DDDED8',
      text: '#101010',
      textMuted: '#5B5D58',
      divider: '#C8CAC3'
    },
    'luminous-portrait': {
      primary: '#3F6658',
      secondary: '#B66F7D',
      accent: '#8CB7C1',
      background: '#F4F7F5',
      surface: '#FFFFFF',
      surfaceMuted: '#E6EFEB',
      text: '#1F2C27',
      textMuted: '#68756F',
      divider: '#D3DFD9'
    },
    'cinematic-story': {
      primary: '#A63D40',
      secondary: '#17302B',
      accent: '#E2C86F',
      background: '#111513',
      surface: '#1A201D',
      surfaceMuted: '#272E2A',
      text: '#F2EFE7',
      textMuted: '#A9ADA7',
      divider: '#414843'
    },
    'gallery-monograph': {
      primary: '#C53B32',
      secondary: '#244D46',
      accent: '#91A9C6',
      background: '#F5F4EF',
      surface: '#FFFFFF',
      surfaceMuted: '#E9E8E2',
      text: '#181A19',
      textMuted: '#6C706C',
      divider: '#CFCFC8'
    }
  }
  const palette = presetPalette[preset] || presetPalette.minimal
  const primaryColor = theme.primaryColor || palette.primary
  const secondaryColor = theme.secondaryColor || palette.secondary
  const accentColor = theme.accentColor || palette.accent
  const backgroundColor = theme.backgroundColor || palette.background
  const surfaceColor = theme.surfaceColor || palette.surface
  const surfaceMutedColor = theme.surfaceMutedColor || palette.surfaceMuted
  const textColor = theme.textColor || palette.text
  const mutedTextColor = theme.mutedTextColor || palette.textMuted
  const dividerColor = theme.dividerColor || palette.divider
  const buttonTextColor = theme.buttonTextColor || '#ffffff'

  styles.push(`--primary: ${primaryColor}`)
  styles.push(`--secondary: ${secondaryColor}`)
  styles.push(`--accent: ${accentColor}`)
  styles.push(`--bg-light: ${backgroundColor}`)
  styles.push(`--surface: ${surfaceColor}`)
  styles.push(`--surface-muted: ${surfaceMutedColor}`)
  styles.push(`--text-main: ${textColor}`)
  styles.push(`--text-muted: ${mutedTextColor}`)
  styles.push(`--divider: ${dividerColor}`)
  styles.push(`--on-media: #ffffff`)

  const cardShadowMap: Record<string, string> = {
    minimal: 'none',
    film: '0 8rpx 20rpx rgba(44,37,33,0.06)',
    soft: 'none',
    elevated: '0 12rpx 30rpx rgba(24,23,21,0.08)'
  }
  const cardBorderMap: Record<string, string> = {
    minimal: 'var(--divider)',
    film: 'var(--divider)',
    soft: 'var(--divider)',
    elevated: 'transparent'
  }
  const buttonRadiusMap: Record<string, string> = {
    square: '4rpx',
    rounded: '10rpx',
    pill: '44rpx'
  }
  const buttonHeightMap: Record<string, string> = {
    square: '84rpx',
    rounded: '88rpx',
    pill: '88rpx'
  }
  const buttonSmallHeightMap: Record<string, string> = {
    square: '60rpx',
    rounded: '64rpx',
    pill: '64rpx'
  }
  const buttonPaddingMap: Record<string, string> = {
    square: '24rpx',
    rounded: '30rpx',
    pill: '36rpx'
  }
  const fontFamilyMap: Record<string, string> = {
    clean: '-apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif',
    elegant: 'Songti SC, Noto Serif CJK SC, STSong, serif',
    soft: '-apple-system, BlinkMacSystemFont, PingFang SC, Microsoft YaHei, sans-serif',
    friendly: '-apple-system, BlinkMacSystemFont, PingFang SC, Microsoft YaHei, sans-serif'
  }
  const titleWeightMap: Record<string, string> = {
    clean: '700',
    elegant: '600',
    soft: '600',
    friendly: '700'
  }
  const headingStyleMap: Record<string, {
    size: string
    accentWidth: string
    accentHeight: string
    accentMargin: string
  }> = {
    clean: { size: '34rpx', accentWidth: '0', accentHeight: '0', accentMargin: '0' },
    editorial: { size: '36rpx', accentWidth: '40rpx', accentHeight: '3rpx', accentMargin: '12rpx' },
    understated: { size: '34rpx', accentWidth: '24rpx', accentHeight: '2rpx', accentMargin: '10rpx' },
    friendly: { size: '35rpx', accentWidth: '0', accentHeight: '0', accentMargin: '0' },
    ornate: { size: '36rpx', accentWidth: '56rpx', accentHeight: '3rpx', accentMargin: '13rpx' }
  }
  const quickJumpStyleMap: Record<string, {
    background: string
    border: string
    shadow: string
    menuShadow: string
  }> = {
    solid: {
      background: primaryColor,
      border: primaryColor,
      shadow: '0 7rpx 18rpx rgba(24, 23, 21, 0.16)',
      menuShadow: '0 10rpx 28rpx rgba(24, 23, 21, 0.12)'
    },
    soft: {
      background: secondaryColor,
      border: secondaryColor,
      shadow: '0 6rpx 16rpx rgba(24, 23, 21, 0.12)',
      menuShadow: '0 8rpx 24rpx rgba(24, 23, 21, 0.10)'
    },
    outline: {
      background: surfaceColor,
      border: primaryColor,
      shadow: 'none',
      menuShadow: '0 8rpx 22rpx rgba(24, 23, 21, 0.10)'
    }
  }
  const buttonWeightMap: Record<string, string> = {
    clean: '700',
    elegant: '600',
    soft: '600',
    friendly: '700'
  }
  const imageRadiusMap: Record<string, string> = {
    none: '0',
    small: '6rpx',
    medium: '12rpx',
    large: '20rpx'
  }
  const densityMap: Record<string, { gap: string; padding: string; pagePadding: string }> = {
    compact: { gap: '18rpx', padding: '22rpx', pagePadding: '24rpx' },
    comfortable: { gap: '24rpx', padding: '28rpx', pagePadding: '32rpx' },
    spacious: { gap: '34rpx', padding: '36rpx', pagePadding: '40rpx' },
    airy: { gap: '34rpx', padding: '36rpx', pagePadding: '40rpx' }
  }
  const density = densityMap[layoutDensity] || densityMap.comfortable
  const heading = headingStyleMap[headingStyle] || headingStyleMap.clean
  const quickJump = quickJumpStyleMap[quickJumpStyle] || quickJumpStyleMap.solid
  const quickJumpRadiusMap: Record<string, string> = {
    minimal: '50%',
    film: '50%',
    bridal: '50%',
    family: '50%',
    oriental: '50%',
    luxury: '50%',
    'oriental-premium': '8rpx',
    'editorial-studio': '2rpx',
    'luminous-portrait': '50%',
    'cinematic-story': '2rpx',
    'gallery-monograph': '0'
  }
  const quickJumpMenuRadiusMap: Record<string, string> = {
    'oriental-premium': '4rpx',
    'editorial-studio': '2rpx',
    'luminous-portrait': '20rpx',
    'cinematic-story': '2rpx',
    'gallery-monograph': '0'
  }

  styles.push(`--card-shadow: ${cardShadowMap[cardStyle] || cardShadowMap.soft}`)
  styles.push(`--card-border: ${cardBorderMap[cardStyle] || cardBorderMap.soft}`)
  styles.push(`--button-radius: ${buttonRadiusMap[buttonStyle] || buttonRadiusMap.rounded}`)
  styles.push(`--button-height: ${buttonHeightMap[buttonStyle] || buttonHeightMap.rounded}`)
  styles.push(`--button-small-height: ${buttonSmallHeightMap[buttonStyle] || buttonSmallHeightMap.rounded}`)
  styles.push(`--button-padding-x: ${buttonPaddingMap[buttonStyle] || buttonPaddingMap.rounded}`)
  styles.push(`--button-bg: ${primaryColor}`)
  styles.push(`--button-text: ${buttonTextColor}`)
  styles.push(`--button-secondary-bg: ${buttonStyle === 'square' ? 'transparent' : 'var(--surface-muted)'}`)
  styles.push(`--button-secondary-text: ${buttonStyle === 'square' ? primaryColor : 'var(--text-main)'}`)
  styles.push(`--button-border: ${buttonStyle === 'square' ? `2rpx solid ${primaryColor}` : 'none'}`)
  styles.push(`--button-shadow: ${buttonStyle === 'square' ? 'none' : (cardShadowMap[cardStyle] || cardShadowMap.soft)}`)
  styles.push(`--font-family: ${fontFamilyMap[fontStyle] || fontFamilyMap.clean}`)
  styles.push(`--title-font-family: ${fontStyle === 'elegant' ? fontFamilyMap.elegant : (fontFamilyMap[fontStyle] || fontFamilyMap.clean)}`)
  styles.push(`--title-weight: ${titleWeightMap[fontStyle] || titleWeightMap.clean}`)
  styles.push(`--section-title-size: ${heading.size}`)
  styles.push(`--heading-accent-width: ${heading.accentWidth}`)
  styles.push(`--heading-accent-height: ${heading.accentHeight}`)
  styles.push(`--heading-accent-margin: ${heading.accentMargin}`)
  styles.push(`--heading-accent-color: ${accentColor}`)
  styles.push(`--body-weight: 400`)
  styles.push(`--button-font-weight: ${buttonWeightMap[fontStyle] || buttonWeightMap.clean}`)
  styles.push(`--image-radius: ${imageRadiusMap[imageRadius] || imageRadiusMap.medium}`)
  styles.push(`--card-radius: ${imageRadiusMap[imageRadius] || imageRadiusMap.medium}`)
  styles.push(`--section-gap: ${density.gap}`)
  styles.push(`--card-padding: ${density.padding}`)
  styles.push(`--page-padding: ${density.pagePadding}`)
  styles.push(`--quick-jump-trigger-bg: ${quickJump.background}`)
  styles.push(`--quick-jump-trigger-border: ${quickJump.border}`)
  styles.push(`--quick-jump-trigger-shadow: ${quickJump.shadow}`)
  styles.push(`--quick-jump-menu-shadow: ${quickJump.menuShadow}`)
  styles.push(`--quick-jump-trigger-radius: ${quickJumpRadiusMap[preset] || '50%'}`)
  styles.push(`--quick-jump-menu-radius: ${quickJumpMenuRadiusMap[preset] || 'var(--card-radius)'}`)
  styles.push(`--decoration-opacity: ${theme.showDecorations === false ? '0' : '1'}`)

  return styles.length ? `${styles.join('; ')};` : ''
}

export function getThemePreset(theme?: Partial<ThemeContent> | null): string {
  const preset = String(theme?.preset || 'minimal')
  return [
    'minimal',
    'film',
    'bridal',
    'family',
    'oriental',
    'luxury',
    'oriental-premium',
    'editorial-studio',
    'luminous-portrait',
    'cinematic-story',
    'gallery-monograph'
  ].includes(preset)
    ? preset
    : 'minimal'
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
    if (theme?.enabled === false) continue
    if (!theme?.series) continue

    for (const series of theme.series) {
      if (series?.enabled === false) continue
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
    photoCount: images.length,
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
  const baseUrl = String(app?.globalData?.cos?.baseUrl || '').replace(/\/+$/, '')

  if (!path) return ''
  if (!baseUrl && !path.startsWith('http')) return ''
  
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
  homeFeaturedItems: PortfolioItem[]
  homeBanner: Partial<HomeBannerContent> | null
  theme: Partial<ThemeContent> | null
  homePortfolioCard: Partial<HomePortfolioCardContent>
  packages: PackageItem[]
  schedule: Partial<ScheduleContent> | null
  testimonials: TestimonialItem[]
  serviceFlow: Partial<ServiceFlowContent> | null
  consultButton: Partial<ConsultButtonContent> | null
  quickJump: Partial<QuickJumpContent> | null
  share: ShareContent
  decoration: DecorationContent['home']
  terminology: DecorationContent['terminology']
}> {
  try {
    const config = await loadConfig()
    const allImages = generateImagesFromConfig(config)

    const decoration = normalizeDecoration(config?.decoration)

    return {
      portfolioItems: allImages.filter(item => item.isSeriesCover),
      homeFeaturedItems: allImages.filter(item => item.featuredOnHome).sort(compareHomeFeaturedItems),
      homeBanner: config?.homeBanner || null,
      theme: isModuleEnabled(config, 'theme') ? config?.theme || null : null,
      homePortfolioCard: getHomePortfolioCardConfig(config),
      packages: getConfiguredPackages(config).filter(item => item.isRecommended).slice(0, 3),
      schedule: isModuleEnabled(config, 'schedule') ? config?.schedule || null : null,
      testimonials: getConfiguredTestimonials(config).slice(0, 3),
      serviceFlow: isModuleEnabled(config, 'serviceFlow') ? config?.serviceFlow || null : null,
      consultButton: isModuleEnabled(config, 'consultButton') ? config?.consultButton || null : { enabled: false },
      quickJump: getQuickJumpConfig(config),
      share: getShareContent(config, allImages),
      decoration: decoration.home,
      terminology: decoration.terminology
    }
  } catch (error) {
    console.error('加载首页配置失败:', error)
    return {
      portfolioItems: [],
      homeFeaturedItems: [],
      homeBanner: null,
      theme: null,
      homePortfolioCard: DEFAULT_HOME_PORTFOLIO_CARD,
      packages: [],
      schedule: null,
      testimonials: [],
      serviceFlow: null,
      consultButton: null,
      quickJump: DEFAULT_QUICK_JUMP,
      share: { ...DEFAULT_SHARE_CONTENT },
      decoration: normalizeDecoration().home,
      terminology: normalizeDecoration().terminology
    }
  }
}

export async function getThemePageData(): Promise<{
  theme: Partial<ThemeContent> | null
  quickJump: Partial<QuickJumpContent> | null
  navigation: DecorationContent['navigation']
  icons: DecorationContent['icons']
  terminology: DecorationContent['terminology']
  decoration: DecorationContent['success']
}> {
  try {
    const config = await loadConfig()

    const decoration = normalizeDecoration(config?.decoration)

    return {
      theme: isModuleEnabled(config, 'theme') ? config?.theme || null : null,
      quickJump: getQuickJumpConfig(config),
      navigation: decoration.navigation,
      icons: decoration.icons,
      terminology: decoration.terminology,
      decoration: decoration.success
    }
  } catch (error) {
    console.error('加载主题配置失败:', error)
    return {
      theme: null,
      quickJump: DEFAULT_QUICK_JUMP,
      navigation: normalizeDecoration().navigation,
      icons: normalizeDecoration().icons,
      terminology: normalizeDecoration().terminology,
      decoration: normalizeDecoration().success
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
  quickJump: Partial<QuickJumpContent> | null
  packages: PackageItem[]
  testimonials: TestimonialItem[]
  photographers: TeamPhotographerItem[]
  share: ShareContent
  terminology: DecorationContent['terminology']
  decoration: DecorationContent['series']
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
    const decoration = normalizeDecoration(config?.decoration)

    return {
      images,
      seriesInfo,
      theme: isModuleEnabled(config, 'theme') ? config?.theme || null : null,
      consultButton: isModuleEnabled(config, 'consultButton') ? config?.consultButton || null : { enabled: false },
      quickJump: getQuickJumpConfig(config),
      packages: getConfiguredPackages(config).filter(item => {
        return (item.relatedSeriesIds || []).includes(seriesId) || relatedPackageIds.includes(item.id)
      }),
      testimonials: getConfiguredTestimonials(config).filter(item => item.relatedSeriesId === seriesId),
      photographers: getConfiguredPhotographers(config).filter(item => {
        return (item.relatedSeriesIds || []).includes(seriesId) || relatedPhotographerIds.includes(item.id)
      }),
      share: getShareContent(config, allImages),
      terminology: decoration.terminology,
      decoration: decoration.series
    }
  } catch (error) {
    console.error('加载系列详情配置失败:', error)
    return {
      images: [],
      seriesInfo: null,
      theme: null,
      consultButton: null,
      quickJump: DEFAULT_QUICK_JUMP,
      packages: [],
      testimonials: [],
      photographers: [],
      share: { ...DEFAULT_SHARE_CONTENT },
      terminology: normalizeDecoration().terminology,
      decoration: normalizeDecoration().series
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
  quickJump: Partial<QuickJumpContent> | null
  share: ShareContent
  decoration: DecorationContent['booking']
  terminology: DecorationContent['terminology']
}> {
  try {
    const config = await loadConfig()

    const decoration = normalizeDecoration(config?.decoration)

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
      photographers: getConfiguredPhotographers(config),
      quickJump: getQuickJumpConfig(config),
      share: getShareContent(config),
      decoration: decoration.booking,
      terminology: decoration.terminology
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
      photographers: [],
      quickJump: DEFAULT_QUICK_JUMP,
      share: { ...DEFAULT_SHARE_CONTENT },
      decoration: normalizeDecoration().booking,
      terminology: normalizeDecoration().terminology
    }
  }
}

export async function getPackagesPageData(): Promise<{
  theme: Partial<ThemeContent> | null
  packages: PackageItem[]
  schedule: Partial<ScheduleContent> | null
  testimonials: TestimonialItem[]
  consultButton: Partial<ConsultButtonContent> | null
  quickJump: Partial<QuickJumpContent> | null
  share: ShareContent
  terminology: DecorationContent['terminology']
  decoration: DecorationContent['packages']
}> {
  try {
    const config = await loadConfig()
    const decoration = normalizeDecoration(config?.decoration)

    return {
      theme: isModuleEnabled(config, 'theme') ? config?.theme || null : null,
      packages: getConfiguredPackages(config),
      schedule: isModuleEnabled(config, 'schedule') ? config?.schedule || null : null,
      testimonials: getConfiguredTestimonials(config),
      consultButton: isModuleEnabled(config, 'consultButton') ? config?.consultButton || null : { enabled: false },
      quickJump: getQuickJumpConfig(config),
      share: getShareContent(config),
      terminology: decoration.terminology,
      decoration: decoration.packages
    }
  } catch (error) {
    console.error('加载套餐页配置失败:', error)
    return {
      theme: null,
      packages: [],
      schedule: null,
      testimonials: [],
      consultButton: null,
      quickJump: DEFAULT_QUICK_JUMP,
      share: { ...DEFAULT_SHARE_CONTENT },
      terminology: normalizeDecoration().terminology,
      decoration: normalizeDecoration().packages
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
  quickJump: Partial<QuickJumpContent> | null
  share: ShareContent
  terminology: DecorationContent['terminology']
  decoration: DecorationContent['packageDetail']
}> {
  try {
    const config = await loadConfig()
    const packageItem = getConfiguredPackages(config).find(item => item.id === packageId) || null
    const relatedSeriesIds = packageItem?.relatedSeriesIds || []
    const relatedPhotographerIds = packageItem?.relatedPhotographerIds || []
    const allImages = generateImagesFromConfig(config)
    const relatedSeries = allImages
      .filter(item => item.isSeriesCover && item.seriesId && relatedSeriesIds.includes(item.seriesId))
    const photographers = getConfiguredPhotographers(config)
      .filter(item => (item.relatedPackageIds || []).includes(packageId) || relatedPhotographerIds.includes(item.id))
    const decoration = normalizeDecoration(config?.decoration)

    return {
      theme: isModuleEnabled(config, 'theme') ? config?.theme || null : null,
      packageItem,
      relatedSeries,
      photographers,
      testimonials: getConfiguredTestimonials(config).filter(item => item.relatedPackageId === packageId),
      serviceFlow: isModuleEnabled(config, 'serviceFlow') ? config?.serviceFlow || null : null,
      faq: isModuleEnabled(config, 'faq') ? config?.faq || null : null,
      consultButton: isModuleEnabled(config, 'consultButton') ? config?.consultButton || null : { enabled: false },
      quickJump: getQuickJumpConfig(config),
      share: getShareContent(config, allImages),
      terminology: decoration.terminology,
      decoration: decoration.packageDetail
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
      consultButton: null,
      quickJump: DEFAULT_QUICK_JUMP,
      share: { ...DEFAULT_SHARE_CONTENT },
      terminology: normalizeDecoration().terminology,
      decoration: normalizeDecoration().packageDetail
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
  quickJump: Partial<QuickJumpContent> | null
  share: ShareContent
  icons: DecorationContent['icons']
  decoration: DecorationContent['about']
  terminology: DecorationContent['terminology']
}> {
  try {
    const config = await loadConfig()

    const decoration = normalizeDecoration(config?.decoration)

    return {
      photographer: config?.photographer || null,
      theme: isModuleEnabled(config, 'theme') ? config?.theme || null : null,
      consultButton: isModuleEnabled(config, 'consultButton') ? config?.consultButton || null : { enabled: false },
      packages: getConfiguredPackages(config),
      stores: getConfiguredStores(config),
      photographers: getConfiguredPhotographers(config),
      testimonials: getConfiguredTestimonials(config),
      serviceFlow: isModuleEnabled(config, 'serviceFlow') ? config?.serviceFlow || null : null,
      faq: isModuleEnabled(config, 'faq') ? config?.faq || null : null,
      quickJump: getQuickJumpConfig(config),
      share: getShareContent(config),
      icons: decoration.icons,
      decoration: decoration.about,
      terminology: decoration.terminology
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
      faq: null,
      quickJump: DEFAULT_QUICK_JUMP,
      share: { ...DEFAULT_SHARE_CONTENT },
      icons: normalizeDecoration().icons,
      decoration: normalizeDecoration().about,
      terminology: normalizeDecoration().terminology
    }
  }
}

const CONFIG_CACHE_STORAGE_KEY = 'portfolio-config-cache-v1'
let activeConfigRequest: Promise<any> | null = null
let lastSuccessfulRemoteConfig: any | null = null
let lastSuccessfulBaseUrl = ''

function getCurrentCosBaseUrl(): string {
  const app = getApp<IAppOption>()
  return String(app?.globalData?.cos?.baseUrl || '').replace(/\/+$/, '')
}

function isValidPortfolioConfig(config: any): boolean {
  return Boolean(config && Array.isArray(config.themes))
}

function readCachedConfig(baseUrl: string): any | null {
  if (lastSuccessfulBaseUrl === baseUrl && isValidPortfolioConfig(lastSuccessfulRemoteConfig)) {
    return lastSuccessfulRemoteConfig
  }

  try {
    const cached = wx.getStorageSync(CONFIG_CACHE_STORAGE_KEY)
    if (cached?.baseUrl === baseUrl && isValidPortfolioConfig(cached.config)) {
      lastSuccessfulBaseUrl = baseUrl
      lastSuccessfulRemoteConfig = cached.config
      return cached.config
    }
  } catch {
  }

  return null
}

function rememberRemoteConfig(baseUrl: string, config: any) {
  lastSuccessfulBaseUrl = baseUrl
  lastSuccessfulRemoteConfig = config

  try {
    wx.setStorageSync(CONFIG_CACHE_STORAGE_KEY, { baseUrl, config })
  } catch {
  }
}

function requestRemoteConfig(): Promise<any> {
  const configUrl = getCosUrl(`config/portfolio-config.json?t=${Date.now()}`)
  if (!configUrl) {
    return Promise.reject(new Error('COS baseUrl is not configured'))
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: configUrl,
      timeout: 5000,
      success: (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Remote config returned HTTP ${res.statusCode}`))
          return
        }

        let config: any
        try {
          config = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
        } catch {
          reject(new Error('Invalid remote config JSON'))
          return
        }

        if (!isValidPortfolioConfig(config)) {
          reject(new Error('Invalid remote config'))
          return
        }

        console.info('[portfolio-config] 使用 COS 配置:', configUrl.split('?')[0])
        resolve(config)
      },
      fail: (error) => {
        reject(new Error(`Remote config request failed: ${error?.errMsg || 'unknown error'}`))
      }
    })
  })
}

async function loadRemoteConfigWithRetry(): Promise<any> {
  try {
    return await requestRemoteConfig()
  } catch (firstError) {
    await new Promise(resolve => setTimeout(resolve, 180))
    try {
      return await requestRemoteConfig()
    } catch {
      throw firstError
    }
  }
}

// 每次进入页面仍请求云端；失败时只复用同一 COS 最近成功的数据。
async function loadConfig(): Promise<any> {
  if (activeConfigRequest) return activeConfigRequest

  const baseUrl = getCurrentCosBaseUrl()
  activeConfigRequest = (async () => {
    if (!baseUrl) {
      return require('../data/portfolio-config')
    }

    try {
      const remoteConfig = await loadRemoteConfigWithRetry()
      rememberRemoteConfig(baseUrl, remoteConfig)
      return remoteConfig
    } catch (remoteError) {
      const cachedConfig = readCachedConfig(baseUrl)
      if (cachedConfig) {
        console.warn('[portfolio-config] COS 配置读取失败，使用当前 COS 最近一次成功配置:', remoteError)
        return cachedConfig
      }

      console.error('[portfolio-config] COS 配置读取失败，且当前 COS 没有可用缓存:', remoteError)
      throw remoteError
    }
  })()

  try {
    return await activeConfigRequest
  } finally {
    activeConfigRequest = null
  }
}

// 从配置生成图片列表
function generateImagesFromConfig(config: any): PortfolioItem[] {
  const items: PortfolioItem[] = []
  
  if (!config || !config.themes) {
    return items
  }
  
  config.themes.forEach((theme: any) => {
    if (theme?.enabled === false) return
    if (!theme.series) return
    
    theme.series.forEach((series: any) => {
      if (series?.enabled === false) return
      if (!series.photos) return

      const hiddenPhotos = new Set(normalizeStringList(series.hiddenPhotos))
      const photos = normalizeStringList(series.photos).filter(photoFileName => !hiddenPhotos.has(photoFileName))
      if (!photos.length) return
      
      const homeSort = Number(series.homeSort)
      const configuredFeaturedPhotos = Array.isArray(series.homeFeaturedPhotos)
        ? Array.from(new Set(normalizeStringList(series.homeFeaturedPhotos).filter(photoName => photos.includes(photoName))))
        : null
      const homeFeaturedPhotos = configuredFeaturedPhotos === null
        ? (series.featuredOnHome === true ? photos.slice(0, 1) : [])
        : configuredFeaturedPhotos
      const homeFeaturedPhotoOrder = new Map(homeFeaturedPhotos.map((photoName, order) => [photoName, order]))

      photos.forEach((photoFileName: string, index: number) => {
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
          featuredOnHome: homeFeaturedPhotoOrder.has(photoFileName),
          homeSort: Number.isFinite(homeSort) ? homeSort : undefined,
          homePhotoSort: homeFeaturedPhotoOrder.get(photoFileName),
          photoCount: isFirstPhoto ? photos.length : undefined,
          bannerDescription: series.bannerDescription,
          description: series.description,
          suitableFor: normalizeStringList(series.suitableFor),
          scenes: normalizeStringList(series.scenes),
          tags: normalizeStringList(series.tags),
          relatedPackageIds: normalizeStringList(series.relatedPackageIds),
          relatedPhotographerIds: normalizeStringList(series.relatedPhotographerIds),
          candidatePhotoNames: isFirstPhoto ? [...photos] : undefined,
          candidateIndex: isFirstPhoto ? 0 : undefined
        })
      })
    })
  })
  
  return items
}
