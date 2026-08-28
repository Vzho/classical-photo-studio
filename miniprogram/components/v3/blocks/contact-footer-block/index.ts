// contact-footer-block（Registry: contact-footer）：联系页脚。
// 变体：dark-media / minimal；地址/电话/咨询按钮为受控开关。
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
    stores: [] as any[]
  },

  observers: {
    content(content: any) {
      this.setData({
        stores: Array.isArray(content?.stores) ? content.stores : []
      })
    }
  },

  methods: {
    onCallTap(event: WechatMiniprogram.CustomEvent) {
      const phone = String(event.currentTarget.dataset.phone || '').trim()
      if (!phone) return
      wx.makePhoneCall({ phoneNumber: phone }).catch(() => undefined)
    },

    onConsultTap() {
      this.triggerEvent('action', { type: 'consult', consultation: this.data.content?.consultation || null })
    }
  }
})
