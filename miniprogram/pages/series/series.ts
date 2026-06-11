import { getSeriesImages, PortfolioItem } from '../../utils/cos'

Page({
  data: {
    seriesTitle: '',
    seriesCategory: '',
    images: [] as PortfolioItem[],
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
    const images = await getSeriesImages(seriesId)
    this.setData({ images })
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

  onShareAppMessage() {
    return {
      title: `${this.data.seriesTitle} - 摄影作品合集`,
      path: `/pages/series/series?seriesId=${this.data.images[0]?.seriesId}`
    }
  }
})
