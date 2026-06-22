interface ConsultationSummaryItem {
  label: string
  value: string
}

Page({
  data: {
    consultation: null as any,
    summaryItems: [] as ConsultationSummaryItem[]
  },

  onLoad() {
    const consultation = wx.getStorageSync('lastConsultation')

    if (!consultation) {
      this.setData({
        consultation: null,
        summaryItems: []
      })
      return
    }

    this.setData({
      consultation,
      summaryItems: this.buildSummaryItems(consultation)
    })
  },

  buildSummaryItems(consultation: any): ConsultationSummaryItem[] {
    return [
      { label: '称呼', value: consultation.name },
      { label: '联系方式', value: consultation.contact },
      { label: '拍摄风格', value: consultation.style },
      { label: '意向套餐', value: consultation.packageName },
      { label: '期望日期', value: consultation.date },
      { label: '意向门店', value: consultation.storeName },
      { label: '意向摄影师', value: consultation.photographerName },
      { label: '备注说明', value: consultation.note }
    ].filter(item => item.value && String(item.value).trim())
  },

  copyConsultation() {
    const text = this.data.consultation?.text

    if (!text) {
      wx.showToast({ title: '暂无咨询内容', icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: '咨询内容已复制', icon: 'success' })
      }
    })
  },

  copyWechat() {
    const wechat = this.data.consultation?.photographerWechat

    if (!wechat) {
      wx.showToast({ title: '暂未配置微信号', icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: wechat,
      success: () => {
        wx.showToast({ title: '微信号已复制', icon: 'success' })
      }
    })
  },

  contactPhotographer() {
    const wechat = this.data.consultation?.photographerWechat

    if (!wechat) {
      wx.showToast({ title: '暂未配置微信号', icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: wechat,
      success: () => {
        wx.showModal({
          title: '联系摄影师确认档期',
          content: '已复制摄影师微信号。请将咨询内容发送给摄影师，最终拍摄时间和方案以双方沟通确认为准。',
          showCancel: false,
          confirmText: '知道了'
        })
      }
    })
  },

  goHome() {
    wx.switchTab({ url: '/pages/portfolio/portfolio' })
  },

  goBooking() {
    wx.switchTab({ url: '/pages/booking/booking' })
  },

  goPackages() {
    wx.navigateTo({ url: '/pages/packages/packages' })
  }
})
