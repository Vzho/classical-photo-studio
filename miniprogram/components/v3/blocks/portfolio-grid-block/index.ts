// portfolio-grid-block（Registry: portfolio-grid）：作品画廊。
// 变体：two-column / three-column / editorial-mixed；比例/间距/标题位置均为受控档位。
const RATIO_CLASSES: Record<string, string> = {
  square: 'v3-grid-media--square',
  portrait: 'v3-grid-media--portrait',
  landscape: 'v3-grid-media--landscape',
  natural: 'v3-grid-media--natural'
}

const GAP_CLASSES: Record<string, string> = {
  none: 'v3-grid--gap-none',
  tight: 'v3-grid--gap-tight',
  normal: 'v3-grid--gap-normal'
}

Component({
  options: {
    addGlobalClass: true,
    styleIsolation: 'apply-shared'
  },

  properties: {
    block: { type: Object, value: {} },
    content: { type: null, value: [] }
  },

  data: {
    items: [] as any[],
    layoutClass: ''
  },

  observers: {
    'block, content': function (block: any, content: any) {
      const raw = Array.isArray(content) ? content : []
      const settings = block?.settings || {}
      const ratioClass = RATIO_CLASSES[settings.mediaRatio] || RATIO_CLASSES.portrait
      const gapClass = GAP_CLASSES[settings.gap] || GAP_CLASSES.normal
      const items = raw.map((item: any) => ({
        id: item.id || item.seriesId || '',
        seriesId: item.seriesId || item.id || '',
        title: item.title || '',
        category: item.category || '',
        photoCount: item.photoCount,
        imageUrl: item.imageUrl || '',
        mediaClass: ratioClass
      }))
      this.setData({
        items,
        layoutClass: `${gapClass} ${ratioClass}`
      })
    }
  },

  methods: {
    onItemTap(event: WechatMiniprogram.CustomEvent) {
      const item = this.data.items[Number(event.currentTarget.dataset.index)]
      if (!item?.seriesId) return
      this.triggerEvent('action', { type: 'open-series', seriesId: item.seriesId, item })
    },
    onImageError(event: WechatMiniprogram.CustomEvent) {
      const index = Number(event.currentTarget.dataset.index)
      this.setData({ [`items[${index}].imageUrl`]: '' })
    }
  }
})
