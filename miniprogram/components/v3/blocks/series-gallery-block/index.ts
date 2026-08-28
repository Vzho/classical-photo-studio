// series-gallery-block（Registry: series-gallery）：作品详情画廊。
// 详情原图不裁切（widthFix，方案 §7.5）；全屏预览走 wx.previewImage。
Component({
  options: {
    addGlobalClass: true,
    styleIsolation: 'apply-shared'
  },

  properties: {
    block: { type: Object, value: {} },
    content: { type: null, value: {} }
  },

  data: {
    photos: [] as any[]
  },

  observers: {
    content(content: any) {
      const raw = Array.isArray(content?.photos) ? content.photos : []
      this.setData({
        photos: raw.map((item: any) => ({
          url: item.originalUrl || item.imageUrl || '',
          thumbnail: item.imageUrl || item.originalUrl || '',
          caption: item.title || ''
        }))
      })
    }
  },

  methods: {
    onPhotoTap(event: WechatMiniprogram.CustomEvent) {
      if (this.data.block?.settings?.fullscreenPreview === false) return
      const index = Number(event.currentTarget.dataset.index)
      const urls = this.data.photos.map(photo => photo.url || photo.thumbnail).filter(Boolean)
      if (!urls.length) return
      wx.previewImage({ urls, current: urls[index] || urls[0] })
    }
  }
})
