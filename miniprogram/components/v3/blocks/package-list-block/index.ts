// package-list-block（Registry: package-list）：套系列表。
// 变体：banner / cards / minimal-list；价格/简介/按钮为受控开关。
Component({
  options: {
    addGlobalClass: true,
    styleIsolation: 'apply-shared'
  },

  properties: {
    block: { type: Object, value: {} },
    content: { type: null, value: [] }
  },

  methods: {
    onPackageTap(event: WechatMiniprogram.CustomEvent) {
      const packages = Array.isArray(this.data.content) ? this.data.content : []
      const pkg = packages[Number(event.currentTarget.dataset.index)]
      if (!pkg?.id) return
      this.triggerEvent('action', { type: 'open-package', packageId: pkg.id, item: pkg })
    }
  }
})
