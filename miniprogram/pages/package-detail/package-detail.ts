import {
  buildThemeStyle,
  ConsultButtonContent,
  FaqContent,
  getPackageDetailPageData,
  PackageItem,
  PortfolioItem,
  ServiceFlowContent,
  TestimonialItem
} from '../../utils/cos'

Page({
  data: {
    themeStyle: '',
    packageItem: null as PackageItem | null,
    relatedSeries: [] as PortfolioItem[],
    testimonials: [] as TestimonialItem[],
    serviceFlow: { enabled: false, steps: [] } as Partial<ServiceFlowContent>,
    faq: { enabled: false, items: [] } as Partial<FaqContent>,
    consultButton: {
      enabled: true,
      text: '咨询此套餐',
      action: 'booking'
    } as Partial<ConsultButtonContent>
  },

  onLoad(options: { id?: string }) {
    if (!options.id) {
      wx.showToast({ title: '套餐不存在', icon: 'none' })
      return
    }

    this.loadData(options.id)
  },

  async loadData(packageId: string) {
    const { theme, packageItem, relatedSeries, testimonials, serviceFlow, faq, consultButton } = await getPackageDetailPageData(packageId)

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
      }
    })
  },

  consultPackage() {
    if (!this.data.packageItem?.id) return

    wx.setStorageSync('prefillConsultation', {
      packageId: this.data.packageItem.id
    })
    wx.switchTab({ url: '/pages/booking/booking' })
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
