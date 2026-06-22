import { STYLE_OPTIONS, PHOTOGRAPHER } from '../../utils/constants'
import { getCosUrl, getBookingPageData } from '../../utils/cos'

function normalizeStyleOptions(styleOptions?: string[]): string[] {
  const normalized = (styleOptions || [])
    .map(item => String(item).trim())
    .filter(item => item && item !== '其他')

  const uniqueOptions = Array.from(new Set(normalized))
  return uniqueOptions.length > 0 ? uniqueOptions : STYLE_OPTIONS
}

Page({
  data: {
    bannerUrl: '',
    photographer: PHOTOGRAPHER,
    styleOptions: [...STYLE_OPTIONS, '其他'], // 添加“其他”选项
    formData: {
      name: '',
      phone: '',
      style: STYLE_OPTIONS[0] || '',
      customStyle: '', // 新增自定义风格字段
      date: '',
      notes: ''
    },
    minDate: '',
    submitting: false,
    showSubmitBtn: false // 控制提交按钮显示
  },

  async onLoad() {
    await this.loadData()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },

  async loadData() {
    // 设置最小日期为今天
    const today = new Date()
    const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const { photographer, booking } = await getBookingPageData()
    const styleOptions = normalizeStyleOptions(booking?.styleOptions)
    const selectedStyle = styleOptions.includes(this.data.formData.style)
      ? this.data.formData.style
      : styleOptions[0] || ''

    this.setData({
      bannerUrl: getCosUrl('banner/booking-banner.jpg'),
      photographer: photographer || PHOTOGRAPHER,
      styleOptions: [...styleOptions, '其他'],
      'formData.style': selectedStyle,
      minDate
    })
  },

  // 监听页面滚动
  onPageScroll() {
    const query = wx.createSelectorQuery()
    query.select('.booking-page').boundingClientRect()
    query.selectViewport().scrollOffset()
    query.exec((res) => {
      if (res[0] && res[1]) {
        const pageHeight = res[0].height
        const scrollTop = res[1].scrollTop
        const windowHeight = wx.getSystemInfoSync().windowHeight

        // 距离底部 100px 时显示
        const isNearBottom = scrollTop + windowHeight > pageHeight - 100

        if (this.data.showSubmitBtn !== isNearBottom) {
          this.setData({ showSubmitBtn: isNearBottom })
        }
      }
    })
  },

  onBannerError() {
    console.warn('Banner 加载失败，使用默认背景')
    // 如果图片加载失败，可以设置一个空字符串，让 WXML 显示默认背景
    this.setData({
      bannerUrl: ''
    })
  },

  onInputChange(e: WechatMiniprogram.Input) {
    const field = e.currentTarget.dataset.field as string
    this.setData({
      [`formData.${field}`]: e.detail.value
    })
  },

  onStyleSelect(e: WechatMiniprogram.TouchEvent) {
    const style = e.currentTarget.dataset.style as string
    this.setData({
      'formData.style': style
    })
  },

  onDateChange(e: WechatMiniprogram.PickerChange) {
    this.setData({
      'formData.date': e.detail.value
    })
  },

  validateForm(): boolean {
    const { name, phone, date, style, customStyle } = this.data.formData

    if (!name.trim()) {
      wx.showToast({ title: '请输入您的称呼', icon: 'none' })
      return false
    }

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return false
    }

    if (style === '其他' && !customStyle.trim()) {
      wx.showToast({ title: '请输入您的心仪风格', icon: 'none' })
      return false
    }

    if (!date) {
      wx.showToast({ title: '请选择拍摄日期', icon: 'none' })
      return false
    }

    return true
  },

  async onSubmit() {
    if (!this.validateForm()) return

    const { name, phone, style, customStyle, date, notes } = this.data.formData
    const finalStyle = style === '其他' ? customStyle : style
    const wechat = this.data.photographer?.contact?.wechat || PHOTOGRAPHER.contact.wechat

    // 生成预约单文本（包含微信号，方便用户查看）
    const bookingText = `【预约单】\n姓名：${name}\n电话：${phone}\n风格：${finalStyle}\n日期：${date}\n备注：${notes || '无'}\n\n----------------\n请添加客服微信：${wechat}\n发送此消息以确认预约`

    this.setData({ submitting: true })

    // 1. 一次性复制所有内容
    wx.setClipboardData({
      data: bookingText,
      success: () => {
        // 2. 简单的弹窗提示
        wx.showModal({
          title: '预约单已复制',
          content: '请打开微信，添加客服好友（微信号已包含在复制内容中），粘贴并发送即可。',
          showCancel: false,
          confirmText: '我知道了',
          success: () => {
            // 用户点击确定后，可以额外再提示一下微信号，或者什么都不做
          }
        })
      }
    })

    this.setData({ submitting: false })
  },

  onShareAppMessage() {
    return {
      title: '摄影作品合集 - 预约拍摄',
      path: '/pages/booking/booking'
    }
  }
})
