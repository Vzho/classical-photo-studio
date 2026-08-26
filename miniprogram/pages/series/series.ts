import {
  buildThemeStyle,
  ConsultButtonContent,
  DEFAULT_SHARE_CONTENT,
  getSeriesPageData,
  getThemePreset,
  PackageItem,
  PortfolioItem,
  QuickJumpContent,
  SeriesInfo,
  ShareContent,
  shouldShowQuickJump,
  TeamPhotographerItem,
  TestimonialItem
} from '../../utils/cos'
import { handleConsultButtonAction, shouldShowConsultButton } from '../../utils/consult-action'
import { DEFAULT_DECORATION, SeriesDecoration, ShowcaseDecoration, TerminologyDecoration } from '../../utils/decoration'
import { setPageNavigationTitle } from '../../utils/navigation'
import { createShareMessage } from '../../utils/share'

Page({
  data: {
    themeStyle: '',
    themePreset: 'minimal',
    decorationClass: '',
    decorationStyle: '',
    siteTemplate: 'classic' as 'classic' | 'dark-gallery',
    showcase: { ...DEFAULT_DECORATION.showcase } as ShowcaseDecoration,
    brandName: '品牌作品',
    seriesTitle: '',
    seriesCategory: '',
    seriesInfo: null as SeriesInfo | null,
    images: [] as PortfolioItem[],
    packages: [] as PackageItem[],
    testimonials: [] as TestimonialItem[],
    photographers: [] as TeamPhotographerItem[],
    consultButton: {
      enabled: true,
      text: '咨询同款风格',
      action: 'booking'
    } as Partial<ConsultButtonContent>,
    consultButtonVisible: true,
    quickJump: {
      enabled: true,
      bookingText: '咨询',
      portfolioText: '作品集'
    } as Partial<QuickJumpContent>,
    quickJumpVisible: true,
    currentIndex: 0,
    share: { ...DEFAULT_SHARE_CONTENT } as ShareContent,
    terminology: { ...DEFAULT_DECORATION.terminology } as TerminologyDecoration,
    decoration: { ...DEFAULT_DECORATION.series } as SeriesDecoration
  },

  onLoad(options: { seriesId?: string; title?: string; category?: string }) {
    const { seriesId, title, category } = options
    
    if (seriesId) {
      this.setData({
        seriesTitle: title || '',
        seriesCategory: category || ''
      })
      this.loadSeriesImages(seriesId)
    }
  },

  async loadSeriesImages(seriesId: string) {
    const { images, seriesInfo, theme, consultButton, packages, testimonials, photographers, quickJump, share, terminology, decoration, siteTemplate, showcase, runtime } = await getSeriesPageData(seriesId)
    const seriesTitle = seriesInfo?.title || this.data.seriesTitle
    const seriesCategory = seriesInfo?.category || this.data.seriesCategory

    this.setData({
      themeStyle: buildThemeStyle(theme),
      themePreset: getThemePreset(theme),
      decorationClass: runtime.className,
      decorationStyle: runtime.style,
      siteTemplate,
      showcase,
      brandName: String(theme?.brandName || seriesInfo?.title || '品牌作品'),
      seriesTitle,
      seriesCategory,
      seriesInfo,
      images,
      packages: packages.map(item => ({
        ...item,
        includes: item.includes || [],
        suitableFor: item.suitableFor || []
      })),
      testimonials,
      photographers,
      consultButton: {
        enabled: true,
        text: '咨询同款风格',
        action: 'booking',
        ...(consultButton || {})
      },
      consultButtonVisible: shouldShowConsultButton(consultButton || { enabled: true }, 'seriesDetail'),
      quickJump: {
        enabled: true,
        bookingText: '咨询',
        portfolioText: '作品集',
        ...(quickJump || {})
      },
      quickJumpVisible: shouldShowQuickJump(quickJump, 'seriesDetail'),
      share,
      terminology,
      decoration
    })

    if (siteTemplate === 'dark-gallery') {
      wx.setNavigationBarColor({ frontColor: '#ffffff', backgroundColor: '#202020' })
    }

    setPageNavigationTitle(seriesTitle, `${terminology.workLabel}详情`)
  },

  onImageTap(e: WechatMiniprogram.TouchEvent) {
    const index = e.currentTarget.dataset.index as number
    const urls = this.data.images.map(img => img.originalUrl || img.imageUrl)
    
    wx.previewImage({
      current: urls[index],
      urls
    })
  },

  onSeriesImageError(e: WechatMiniprogram.CustomEvent) {
    const id = e.currentTarget.dataset.id as string
    const images = this.data.images.map(item => {
      if (item.id === id && item.originalUrl && item.imageUrl !== item.originalUrl) {
        return {
          ...item,
          imageUrl: item.originalUrl
        }
      }
      return item
    })

    this.setData({ images })
  },

  consultSameStyle() {
    handleConsultButtonAction(this.data.consultButton, { style: this.data.seriesTitle || this.data.seriesCategory })
  },

  consultPackage(e: WechatMiniprogram.TouchEvent) {
    const packageId = e.currentTarget.dataset.id as string
    handleConsultButtonAction(this.data.consultButton, {
      style: this.data.seriesTitle || this.data.seriesCategory,
      packageId
    })
  },

  onShareAppMessage() {
    const seriesId = this.data.seriesInfo?.id || this.data.images[0]?.seriesId || ''

    return createShareMessage({
      pageType: 'series',
      share: this.data.share,
      contentTitle: this.data.seriesTitle,
      path: `/pages/series/series?seriesId=${encodeURIComponent(seriesId)}&title=${encodeURIComponent(this.data.seriesTitle)}&category=${encodeURIComponent(this.data.seriesCategory)}`,
      contentImageUrl: this.data.images.find(item => item.originalUrl)?.originalUrl,
      imagePriority: 'content-first'
    })
  }
})
