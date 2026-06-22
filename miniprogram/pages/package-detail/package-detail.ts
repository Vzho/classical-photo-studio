import {
  buildThemeStyle,
  ConsultButtonContent,
  FaqContent,
  getCosUrl,
  getPackageDetailPageData,
  PackageItem,
  PortfolioItem,
  ServiceFlowContent,
  TeamPhotographerItem,
  TestimonialItem
} from '../../utils/cos'
import { handleConsultButtonAction, shouldShowConsultButton } from '../../utils/consult-action'

Page({
  data: {
    themeStyle: '',
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
    consultButtonVisible: true
  },

  onLoad(options: { id?: string }) {
    if (!options.id) {
      wx.showToast({ title: '套餐不存在', icon: 'none' })
      return
    }

    this.loadData(options.id)
  },

  async loadData(packageId: string) {
    const { theme, packageItem, relatedSeries, photographers, testimonials, serviceFlow, faq, consultButton } = await getPackageDetailPageData(packageId)

    this.setData({
      themeStyle: buildThemeStyle(theme),
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
      consultButtonVisible: shouldShowConsultButton(consultButton || { enabled: true }, 'packageDetail')
    })
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
    return {
      title: `${this.data.packageItem?.name || '拍摄套餐'} - 摄影作品合集`,
      path: `/pages/package-detail/package-detail?id=${this.data.packageItem?.id || ''}`
    }
  }
})
