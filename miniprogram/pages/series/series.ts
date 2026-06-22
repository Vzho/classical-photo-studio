import {
  buildThemeStyle,
  ConsultButtonContent,
  getSeriesPageData,
  PackageItem,
  PortfolioItem,
  SeriesInfo,
  TeamPhotographerItem,
  TestimonialItem
} from '../../utils/cos'
import { handleConsultButtonAction, shouldShowConsultButton } from '../../utils/consult-action'

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
    consultButton: {
      enabled: true,
      text: '咨询同款风格',
      action: 'booking'
    } as Partial<ConsultButtonContent>,
    consultButtonVisible: true,
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
    const { images, seriesInfo, theme, consultButton, packages, testimonials, photographers } = await getSeriesPageData(seriesId)
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
      photographers,
      consultButton: {
        enabled: true,
        text: '咨询同款风格',
        action: 'booking',
        ...(consultButton || {})
      },
      consultButtonVisible: shouldShowConsultButton(consultButton || { enabled: true }, 'seriesDetail')
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
    return {
      title: `${this.data.seriesTitle} - 摄影作品合集`,
      path: `/pages/series/series?seriesId=${this.data.images[0]?.seriesId}`
    }
  }
})
