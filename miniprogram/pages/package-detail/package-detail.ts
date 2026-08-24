import {
  buildThemeStyle,
  ConsultButtonContent,
  DEFAULT_SHARE_CONTENT,
  FaqContent,
  getCosUrl,
  getPackageDetailPageData,
  getThemePreset,
  PackageItem,
  PortfolioItem,
  QuickJumpContent,
  ServiceFlowContent,
  ShareContent,
  shouldShowQuickJump,
  TeamPhotographerItem,
  TestimonialItem
} from '../../utils/cos'
import { handleConsultButtonAction, shouldShowConsultButton } from '../../utils/consult-action'
import { DEFAULT_DECORATION, PackageDetailDecoration, TerminologyDecoration } from '../../utils/decoration'
import { setPageNavigationTitle } from '../../utils/navigation'
import { createShareMessage } from '../../utils/share'

Page({
  data: {
    themeStyle: '',
    themePreset: 'minimal',
    packageItem: null as PackageItem | null,
    relatedSeries: [] as PortfolioItem[],
    photographers: [] as TeamPhotographerItem[],
    testimonials: [] as TestimonialItem[],
    serviceFlow: { enabled: false, steps: [] } as Partial<ServiceFlowContent>,
    faq: { enabled: false, items: [] } as Partial<FaqContent>,
    consultButton: {
      enabled: true,
      text: '咨询此套餐',
      action: 'booking'
    } as Partial<ConsultButtonContent>,
    consultButtonVisible: true,
    quickJump: {
      enabled: true,
      bookingText: '咨询',
      portfolioText: '作品集'
    } as Partial<QuickJumpContent>,
    quickJumpVisible: true,
    share: { ...DEFAULT_SHARE_CONTENT } as ShareContent,
    terminology: { ...DEFAULT_DECORATION.terminology } as TerminologyDecoration,
    decoration: { ...DEFAULT_DECORATION.packageDetail } as PackageDetailDecoration
  },

  onLoad(options: { id?: string }) {
    if (!options.id) {
      wx.showToast({ title: '套餐不存在', icon: 'none' })
      return
    }

    this.loadData(options.id)
  },

  async loadData(packageId: string) {
    const { theme, packageItem, relatedSeries, photographers, testimonials, serviceFlow, faq, consultButton, quickJump, share, terminology, decoration } = await getPackageDetailPageData(packageId)

    this.setData({
      themeStyle: buildThemeStyle(theme),
      themePreset: getThemePreset(theme),
      packageItem: packageItem
        ? {
            ...packageItem,
            includes: packageItem.includes || [],
            suitableFor: packageItem.suitableFor || []
          }
        : null,
      relatedSeries,
      photographers: photographers.map(item => ({
        ...item,
        avatar: item.avatar ? getCosUrl(item.avatar) : ''
      })),
      testimonials,
      serviceFlow: {
        enabled: false,
        ...(serviceFlow || {}),
        steps: serviceFlow?.steps || []
      },
      faq: {
        enabled: false,
        ...(faq || {}),
        items: faq?.items || []
      },
      consultButton: {
        enabled: true,
        text: '咨询此套餐',
        action: 'booking',
        ...(consultButton || {})
      },
      consultButtonVisible: shouldShowConsultButton(consultButton || { enabled: true }, 'packageDetail'),
      quickJump: {
        enabled: true,
        bookingText: '咨询',
        portfolioText: '作品集',
        ...(quickJump || {})
      },
      quickJumpVisible: shouldShowQuickJump(quickJump, 'packageDetail'),
      share,
      terminology,
      decoration
    })

    setPageNavigationTitle(packageItem?.name, `${terminology.packageLabel}详情`)
  },

  consultPackage() {
    if (!this.data.packageItem?.id) return

    handleConsultButtonAction(this.data.consultButton, {
      packageId: this.data.packageItem.id
    })
  },

  openSeries(e: WechatMiniprogram.TouchEvent) {
    const item = e.currentTarget.dataset.item as PortfolioItem
    if (!item?.seriesId) return

    wx.navigateTo({
      url: `/pages/series/series?seriesId=${item.seriesId}&title=${item.title}&category=${item.category}`
    })
  },

  onShareAppMessage() {
    return createShareMessage({
      pageType: 'package-detail',
      share: this.data.share,
      contentTitle: this.data.packageItem?.name || this.data.terminology.packageLabel,
      path: `/pages/package-detail/package-detail?id=${encodeURIComponent(this.data.packageItem?.id || '')}`,
      contentImageUrl: this.data.share.fallbackImageUrl,
      imagePriority: 'global-first'
    })
  }
})
