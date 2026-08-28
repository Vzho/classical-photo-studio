// section-renderer（方案 §8.2）：按 Registry rendererKey 分发区块组件。
// 未知区块 / 内容缺失时渲染为空，不阻断整页（§7.2、§16）。
Component({
  options: {
    addGlobalClass: true,
    styleIsolation: 'apply-shared'
  },

  properties: {
    prepared: { type: Object, value: {} },
    activeCategory: { type: String, value: '' }
  },

  methods: {
    // 区块内部交互统一上抛，页面集中处理导航等副作用。
    onBlockAction(event: WechatMiniprogram.CustomEvent) {
      this.triggerEvent('action', {
        blockId: this.data.prepared?.block?.id || '',
        ...(event.detail || {})
      })
    }
  }
})
