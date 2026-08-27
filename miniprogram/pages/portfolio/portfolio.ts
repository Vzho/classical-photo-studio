import { CATEGORIES, Category } from '../../utils/constants'
import { handleConsultButtonAction, shouldShowConsultButton } from '../../utils/consult-action'
import {
  buildThemeStyle,
  ConsultButtonContent,
  DEFAULT_SHARE_CONTENT,
  getPortfolioPageData,
  getCosUrl,
  getThemePreset,
  HomePortfolioCardContent,
  HomeBannerContent,
  PackageItem,
  PortfolioItem,
  QuickJumpContent,
  ScheduleContent,
  ServiceFlowContent,
  ShareContent,
  shouldShowQuickJump,
  TestimonialItem
} from '../../utils/cos'
import { DEFAULT_DECORATION, HomeDecoration, ShowcaseDecoration, TerminologyDecoration } from '../../utils/decoration'
import { setPageNavigationTitle } from '../../utils/navigation'
import { createShareMessage } from '../../utils/share'

const DEFAULT_HOME_BANNER: HomeBannerContent = {
  logoText: '摄影作品合集',
  tagText: '精选作品',
  description: ''
}

interface HomeShortcutItem {
  key: 'schedule' | 'testimonials'
  text: string
  icon: string
}

function buildHomeShortcuts(
  decoration: HomeDecoration,
  schedule: Partial<ScheduleContent>,
  testimonials: TestimonialItem[]
): HomeShortcutItem[] {
  const shortcuts: HomeShortcutItem[] = []
  const scheduleSection = decoration.sections.find(item => item.type === 'schedule')
  const testimonialSection = decoration.sections.find(item => item.type === 'testimonials')

  if (scheduleSection?.enabled !== false && schedule.enabled !== false && schedule.availableText) {
    shortcuts.push({
      key: 'schedule',
      text: scheduleSection?.title || schedule.title || '近期档期',
      icon: scheduleSection?.icon || 'calendar-days'
    })
  }

  if (testimonialSection?.enabled !== false && testimonials.length) {
    shortcuts.push({
      key: 'testimonials',
      text: testimonialSection?.title || '客户评价',
      icon: testimonialSection?.icon || 'message-circle'
    })
  }

  return shortcuts
}

function getNextRenderableCoverItem(item: PortfolioItem, width: number): PortfolioItem {
  if (item.originalUrl && item.imageUrl !== item.originalUrl) {
    return {
      ...item,
      imageUrl: item.originalUrl
    }
  }

  const candidatePhotoNames = item.candidatePhotoNames || []
  const candidateIndex = item.candidateIndex || 0
  const nextPhotoName = candidatePhotoNames[candidateIndex + 1]

  if (!nextPhotoName) {
    return item
  }

  return {
    ...item,
    candidateIndex: candidateIndex + 1,
    imageUrl: getCosUrl(`portfolio/${nextPhotoName}`, { width, format: 'webp' }),
    originalUrl: getCosUrl(`portfolio/${nextPhotoName}`)
  }
}

Page({
  data: {
    categories: CATEGORIES,
    activeCategory: '全部' as Category,
    portfolioItems: [] as PortfolioItem[],
    filteredItems: [] as PortfolioItem[],
    bannerItems: [] as PortfolioItem[], // 轮播图数据
    homeBanner: DEFAULT_HOME_BANNER,
    homePortfolioCard: {
      showPhotoCount: false,
      showDescription: false,
      showTags: false
    } as HomePortfolioCardContent,
    themeStyle: '',
    themePreset: 'minimal',
    decorationClass: '',
    decorationStyle: '',
    siteTemplate: 'classic' as 'classic' | 'dark-gallery',
    showcase: { ...DEFAULT_DECORATION.showcase } as ShowcaseDecoration,
    homeDecoration: DEFAULT_DECORATION.home as HomeDecoration,
    homeSections: DEFAULT_DECORATION.home.sections,
    homeShortcuts: [] as HomeShortcutItem[],
    terminology: { ...DEFAULT_DECORATION.terminology } as TerminologyDecoration,
    packages: [] as PackageItem[],
    schedule: { enabled: false } as Partial<ScheduleContent>,
    testimonials: [] as TestimonialItem[],
    serviceFlow: { enabled: false, steps: [] } as Partial<ServiceFlowContent>,
    consultButton: {
      enabled: true,
      text: '咨询拍摄',
      action: 'booking'
    } as Partial<ConsultButtonContent>,
    consultButtonVisible: true,
    quickJump: {
      enabled: true,
      bookingText: '咨询',
      portfolioText: '作品集'
    } as Partial<QuickJumpContent>,
    quickJumpVisible: true,
    bannerUrl: '',
    share: { ...DEFAULT_SHARE_CONTENT } as ShareContent
  },

  async onShow() {
    await this.loadData()
  },
  
  // 跳转到预约页面
  goBooking() {
    handleConsultButtonAction(this.data.consultButton)
  },

  goPackages() {
    wx.switchTab({
      url: '/pages/packages/packages'
    })
  },

  onHomeShortcutTap(e: WechatMiniprogram.TouchEvent) {
    const key = String(e.currentTarget.dataset.key || '')
    if (key !== 'schedule' && key !== 'testimonials') return

    wx.pageScrollTo({
      selector: `#home-section-${key}`,
      duration: 280
    })
  },

  consultPackage(e: WechatMiniprogram.TouchEvent) {
    const packageId = e.currentTarget.dataset.id as string
    handleConsultButtonAction(this.data.consultButton, { packageId })
  },

  async loadData() {
    const bannerUrl = getCosUrl('banner/main-banner.jpg')
    const { portfolioItems, homeFeaturedItems, homeBanner, homePortfolioCard, theme, packages, schedule, testimonials, serviceFlow, consultButton, quickJump, share, decoration, terminology, siteTemplate, showcase, runtime } = await getPortfolioPageData()
    const resolvedHomeBanner = {
      ...DEFAULT_HOME_BANNER,
      ...(homeBanner || {})
    }
    const categories = ['全部', ...Array.from(new Set(portfolioItems.map(item => item.category)))]
    const activeCategory = categories.includes(this.data.activeCategory) ? this.data.activeCategory : '全部'
    
    // 首页大图优先使用后台逐张选择的精选照片；未选择时按系列封面和点赞数兜底。
    const seriesItems = portfolioItems.filter(item => item.isSeriesCover && item.seriesId)
    const selectedHomePhotos = Array.isArray(homeFeaturedItems) ? homeFeaturedItems : []
    const heroModule = decoration.sections.find(section => section.enabled && section.type === 'hero') as any
    const configuredHeroItems = heroModule?.source?.mode !== 'auto' && Array.isArray(heroModule?.resolvedItems)
      ? heroModule.resolvedItems as PortfolioItem[]
      : []
    const usesConfiguredHero = configuredHeroItems.length > 0
    const bannerCandidates = usesConfiguredHero
      ? configuredHeroItems
      : (selectedHomePhotos.length ? selectedHomePhotos : seriesItems)
    
    const bannerItems = [...bannerCandidates]
      .sort((a, b) => {
        if (usesConfiguredHero) return 0
        if (selectedHomePhotos.length) {
          const sortA = Number.isFinite(a.homeSort) ? Number(a.homeSort) : Number.MAX_SAFE_INTEGER
          const sortB = Number.isFinite(b.homeSort) ? Number(b.homeSort) : Number.MAX_SAFE_INTEGER
          if (sortA !== sortB) return sortA - sortB
          if (a.seriesId === b.seriesId) {
            const photoSortA = Number.isFinite(a.homePhotoSort) ? Number(a.homePhotoSort) : Number.MAX_SAFE_INTEGER
            const photoSortB = Number.isFinite(b.homePhotoSort) ? Number(b.homePhotoSort) : Number.MAX_SAFE_INTEGER
            if (photoSortA !== photoSortB) return photoSortA - photoSortB
          }
        }
        return b.likes - a.likes
      })
      .slice(0, 12)
      // 为轮播图加载更高质量的图片
      .map(item => {
        // 修复: 确保替换后的路径正确保留斜杠
        // 原始 item.imageUrl 可能是 .../portfolio/xxx.jpg?imageMogr2...
        // 或者 item.originalUrl 是 .../portfolio/xxx.jpg
        // 我们需要提取文件名
        
        let path = ''
        if (item.originalUrl) {
          // 如果有 originalUrl，提取其中的路径部分
          // 假设 originalUrl 是完整的 URL，如 https://.../portfolio/xxx.jpg
          const parts = item.originalUrl.split('/portfolio/')
          if (parts.length > 1) {
            path = 'portfolio/' + parts[1]
          }
        }
        
        // 如果上面没提取到，尝试从 imageUrl 提取
        if (!path) {
           const urlPart = item.imageUrl.split('?')[0]
           const parts = urlPart.split('/portfolio/')
           if (parts.length > 1) {
             path = 'portfolio/' + parts[1]
           }
        }
        
        // 如果还是没提取到（极少情况），就保持原样或报错
        // 这里为了稳健，直接用 originalUrl 作为 fallback
        
        return {
          ...item,
          // 轮播图使用稍大一点的缩略图 (800px)
          imageUrl: path ? getCosUrl(path, { width: 800, format: 'webp' }) : item.imageUrl
        }
      })

    this.setData({
      categories,
      activeCategory,
      bannerUrl,
      portfolioItems,
      homeBanner: resolvedHomeBanner,
      homePortfolioCard: {
        showPhotoCount: false,
        showDescription: false,
        showTags: false,
        ...(homePortfolioCard || {})
      },
      themeStyle: buildThemeStyle(theme),
      themePreset: getThemePreset(theme),
      decorationClass: runtime.className,
      decorationStyle: runtime.style,
      siteTemplate,
      showcase,
      homeDecoration: decoration,
      homeSections: decoration.sections,
      homeShortcuts: buildHomeShortcuts(
        decoration,
        { enabled: false, ...(schedule || {}) },
        testimonials
      ),
      terminology,
      packages: packages.map(item => ({
        ...item,
        includes: item.includes || [],
        suitableFor: item.suitableFor || []
      })),
      schedule: {
        enabled: false,
        specialNotes: [],
        ...(schedule || {})
      },
      testimonials,
      serviceFlow: {
        enabled: false,
        ...(serviceFlow || {}),
        steps: serviceFlow?.steps || []
      },
      consultButton: {
        enabled: true,
        text: '咨询拍摄',
        action: 'booking',
        ...(consultButton || {})
      },
      consultButtonVisible: shouldShowConsultButton(consultButton || { enabled: true }, 'portfolio'),
      quickJump: {
        enabled: true,
        bookingText: '咨询',
        portfolioText: '作品集',
        ...(quickJump || {})
      },
      quickJumpVisible: shouldShowQuickJump(quickJump, 'portfolio'),
      share,
      filteredItems: activeCategory === '全部'
        ? portfolioItems
        : portfolioItems.filter(item => item.category === activeCategory),
      bannerItems
    })

    setPageNavigationTitle(theme?.brandName || resolvedHomeBanner.logoText, '作品集')
  },

  goGallery() {
    wx.navigateTo({ url: '/pages/gallery/gallery' })
  },

  onShowcaseAction() {
    if (this.data.showcase.heroActionTarget === 'booking') {
      this.goBooking()
      return
    }
    this.goGallery()
  },

  scrollToFeatured() {
    wx.pageScrollTo({
      selector: '#dark-home-featured',
      duration: 420
    })
  },
  
  // 轮播图点击跳转
  onBannerTap(e: WechatMiniprogram.TouchEvent) {
    const item = e.currentTarget.dataset.item as PortfolioItem
    if (item && item.seriesId) {
      wx.navigateTo({
        url: `/pages/series/series?seriesId=${item.seriesId}&title=${item.title}&category=${item.category}`
      })
    }
  },
  
  onBannerError() {
    // Banner 加载失败时的兜底图 (可以使用本地图片或纯色背景)
    // 这里我们不做处理，让它显示空白或者默认背景色
    // 或者可以 setData 设置一个本地路径
  },

  onBannerImageError(e: WechatMiniprogram.CustomEvent) {
    const id = e.currentTarget.dataset.id as string
    const bannerItems = this.data.bannerItems.map(item => {
      if (item.id === id) {
        return getNextRenderableCoverItem(item, 800)
      }
      return item
    })

    this.setData({ bannerItems })
  },

  onCategoryTap(e: WechatMiniprogram.TouchEvent) {
    const category = e.currentTarget.dataset.category as Category
    const { portfolioItems } = this.data
    
    const filteredItems = category === '全部' 
      ? portfolioItems 
      : portfolioItems.filter(item => item.category === category)
    
    this.setData({
      activeCategory: category,
      filteredItems
    })
  },

  onItemTap(e: WechatMiniprogram.TouchEvent) {
    const item = e.currentTarget.dataset.item as PortfolioItem
    
    // 如果是系列作品，跳转到系列详情页
    if (item.seriesId) {
      wx.navigateTo({
        url: `/pages/series/series?seriesId=${item.seriesId}&title=${item.title}&category=${item.category}`
      })
    } else {
      // 单张作品，直接预览
      wx.previewImage({
        current: item.originalUrl || item.imageUrl,
        urls: this.data.filteredItems.map(i => i.originalUrl || i.imageUrl)
      })
    }
  },

  onImageLoad(e: WechatMiniprogram.ImageLoad) {
    // 图片加载完成后，根据图片尺寸动态调整容器高度
    const { width, height } = e.detail
    const id = e.currentTarget.dataset.id
    
    // 计算图片比例，设置合适的高度
    const ratio = height / width
    const containerWidth = 339 // rpx，约为 (750 - 48 - 24) / 2
    let containerHeight = containerWidth * ratio
    
    // 限制高度范围
    if (containerHeight < 400) containerHeight = 400
    if (containerHeight > 600) containerHeight = 600
    
    // 可以在这里动态设置每个图片容器的高度
    // 但小程序不支持动态设置单个元素样式，所以使用固定范围
  },

  onItemImageError(e: WechatMiniprogram.CustomEvent) {
    const id = e.currentTarget.dataset.id as string
    const updateItem = (item: PortfolioItem) => {
      if (item.id === id) {
        return getNextRenderableCoverItem(item, 400)
      }
      return item
    }

    this.setData({
      portfolioItems: this.data.portfolioItems.map(updateItem),
      filteredItems: this.data.filteredItems.map(updateItem)
    })
  },

  onShareAppMessage() {
    return createShareMessage({
      pageType: 'portfolio',
      share: this.data.share,
      path: '/pages/portfolio/portfolio',
      contentImageUrl: this.data.share.fallbackImageUrl,
      imagePriority: 'global-first'
    })
  }
})
