// testimonials-block（Registry: testimonials）：客户评价。
// 变体：quotes / cards；展示条数与自动轮播为受控档位。
const MAX_ITEMS: Record<string, number> = {
  '3': 3,
  '6': 6,
  all: Number.MAX_SAFE_INTEGER
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
    autoplay: true
  },

  observers: {
    'block.settings, content': function (settings: any, content: any) {
      const raw = Array.isArray(content) ? content : []
      const limit = MAX_ITEMS[String(settings?.maxItems ?? '6')] ?? 6
      this.setData({
        items: raw.slice(0, limit),
        autoplay: settings?.autoplay !== false
      })
    }
  }
})
