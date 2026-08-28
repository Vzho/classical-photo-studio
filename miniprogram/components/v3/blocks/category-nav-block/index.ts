// category-nav-block（Registry: category-nav）：分类导航。
// 变体：text-tabs / circle-thumbnails；支持吸顶与计数显示（受控开关）。
Component({
  options: {
    addGlobalClass: true,
    styleIsolation: 'apply-shared'
  },

  properties: {
    block: { type: Object, value: {} },
    content: { type: null, value: [] },
    activeCategory: { type: String, value: '' }
  },

  methods: {
    onCategoryTap(event: WechatMiniprogram.CustomEvent) {
      const name = String(event.currentTarget.dataset.name || '')
      if (!name || name === this.data.activeCategory) return
      this.triggerEvent('action', { type: 'filter-category', category: name })
    }
  }
})
