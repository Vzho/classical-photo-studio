// hero-block（Registry: hero）：首屏主视觉。
// 变体：full-bleed-carousel / editorial-split / minimal-cover；遮罩与高度均为受控档位。
import { resolveObjectPosition } from '../../../../services/media-service'

const HEIGHT_TIERS: Record<string, string> = {
  compact: '62vh',
  standard: '82vh',
  tall: '100vh'
}

const OVERLAY_OPACITY: Record<string, string> = {
  none: '0',
  light: '0.18',
  medium: '0.32',
  dark: '0.5'
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
    slides: [] as any[],
    shellStyle: '',
    autoplay: true
  },

  observers: {
    'block, content': function (block: any, content: any) {
      // 兼容两类数据源：精选系列数组 / current-series 对象（取封面图为单幅封面）。
      let items: any[] = []
      if (Array.isArray(content)) {
        items = content
      } else if (content && Array.isArray(content.photos) && content.photos.length) {
        const cover = content.photos.find((photo: any) => photo.isSeriesCover) || content.photos[0]
        items = [{
          seriesId: content.seriesId,
          title: content.title || cover.title || '',
          category: content.category || '',
          imageUrl: cover.imageUrl || cover.originalUrl || ''
        }]
      }
      const settings = block?.settings || {}
      const slides = items.map((item: any) => ({
        seriesId: item.seriesId || item.id || '',
        title: item.title || '',
        category: item.category || '',
        imageUrl: item.imageUrl || item.originalUrl || '',
        positionStyle: resolveObjectPosition(item.mediaMeta, item.name || item.id, 'hero')
      }))
      const height = HEIGHT_TIERS[settings.heightTier] || HEIGHT_TIERS.standard
      const opacity = OVERLAY_OPACITY[settings.overlayMask] ?? '0.32'
      this.setData({
        slides,
        shellStyle: `height:${height};--v3-hero-overlay:rgba(0,0,0,${opacity})`,
        autoplay: settings.autoplay !== false
      })
    }
  },

  methods: {
    onSlideTap(event: WechatMiniprogram.CustomEvent) {
      const slide = this.data.slides[Number(event.currentTarget.dataset.index)]
      if (!slide?.seriesId) return
      this.triggerEvent('action', { type: 'open-series', seriesId: slide.seriesId, item: slide })
    }
  }
})
