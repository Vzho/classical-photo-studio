import { STYLE_OPTIONS } from '../../utils/constants'
import { getCosUrl } from '../../utils/cos'

Page({
  data: {
    bannerUrl: '',
    styleOptions: [...STYLE_OPTIONS, '其他'], // 添加“其他”选项
    formData: {
      name: '',
      phone: '',
      style: '清冷风',
      customStyle: '', // 新增自定义风格字段
      date: '',
      notes: ''
    },
    minDate: '',
    submitting: false,
    showSubmitBtn: false // 控制提交按钮显示
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
  },

  loadData() {
    // 设置最小日期为今天
    const today = new Date()
    const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    
    this.setData({
      bannerUrl: getCosUrl('banner/booking-banner.jpg'),
      minDate
    })
  },

  // 监听页面滚动
  onPageScroll(e: WechatMiniprogram.PageScroll) {
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
    
    this.setData({ submitting: true })
    
    try {
      // 这里可以调用云函数或后端API保存预约信息
      // 示例：模拟提交
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 跳转到成功页
      wx.redirectTo({ url: '/pages/success/success' })
    } catch (error) {
      wx.showToast({ title: '提交失败，请重试', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  onShareAppMessage() {
    return {
      title: '云裳·影像 - 预约古风摄影',
      path: '/pages/booking/booking'
    }
  }
})
