import {
  buildThemeStyle,
  getSeriesPageData,
  PackageItem,
  PortfolioItem,
  SeriesInfo,
  TeamPhotographerItem,
  TestimonialItem
} from '../../utils/cos'

Page({
  data: {
    themeStyle: '',
    seriesTitle: '',
    seriesCategory: '',
    seriesInfo: null as SeriesInfo | null,
    images: [] as PortfolioItem[],
    packages: [] as PackageItem[],
    testimonials: [] as TestimonialItem[],
    photographers: [] as TeamPhotographerItem[],
    currentIndex: 0
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
    const { images, seriesInfo, theme, packages, testimonials, photographers } = await getSeriesPageData(seriesId)
    const seriesTitle = seriesInfo?.title || this.data.seriesTitle
    const seriesCategory = seriesInfo?.category || this.data.seriesCategory

    this.setData({
      themeStyle: buildThemeStyle(theme),
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
      photographers
    })
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
    wx.setStorageSync('prefillConsultation', { style: this.data.seriesTitle || this.data.seriesCategory })
    wx.switchTab({ url: '/pages/booking/booking' })
  },

  consultPackage(e: WechatMiniprogram.TouchEvent) {
    const packageId = e.currentTarget.dataset.id as string
    wx.setStorageSync('prefillConsultation', {
      style: this.data.seriesTitle || this.data.seriesCategory,
      packageId
    })
    wx.switchTab({ url: '/pages/booking/booking' })
  },

  onShareAppMessage() {
    return {
      title: `${this.data.seriesTitle} - 摄影作品合集`,
      path: `/pages/series/series?seriesId=${this.data.images[0]?.seriesId}`
    }
  }
})
