import { NavigationItemKey } from '../../utils/decoration'
import { navigateToSitePage } from '../../utils/site-navigation'

Component({
  properties: {
    module: {
      type: Object,
      value: {}
    }
  },

  methods: {
    handleImageTap(event: WechatMiniprogram.TouchEvent) {
      const current = String(event.currentTarget.dataset.url || '')
      const urls = (((this.data.module as any)?.resolvedItems || []) as any[])
        .map(item => String(item.originalUrl || item.imageUrl || ''))
        .filter(Boolean)
      if (!current || !urls.length) return
      wx.previewImage({ current, urls })
    },

    handleAction() {
      const target = String((this.data.module as any)?.content?.actionTarget || '')
      const pageKey = target === 'home' ? 'portfolio' : target
      if (!['portfolio', 'gallery', 'about', 'packages', 'booking', 'stores'].includes(pageKey)) return
      navigateToSitePage(pageKey as NavigationItemKey)
    }
  }
})
