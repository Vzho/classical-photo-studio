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
    const urls = this.data.images.map(img => img.imageUrl)
    
    wx.previewImage({
      current: urls[index],
      urls
    })
  },

  onShareAppMessage() {
    return {
      title: `${this.data.seriesTitle} - 云裳·影像`,
      path: `/pages/series/series?seriesId=${this.data.images[0]?.seriesId}`
    }
  }
})
