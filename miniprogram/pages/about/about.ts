import { PHOTOGRAPHER } from '../../utils/constants'
import { getCosUrl, getPhotographerProfile } from '../../utils/cos'

Page({
  data: {
    photographer: PHOTOGRAPHER,
    avatarUrl: ''
  },

  async onLoad() {
    // 优先加载远程配置的摄影师信息
    const remoteProfile = await getPhotographerProfile()
    const profile = remoteProfile || PHOTOGRAPHER
    
    this.setData({
      photographer: profile,
      avatarUrl: getCosUrl(profile.avatar)
    })
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
  },

  copyWechat() {
    wx.setClipboardData({
      data: PHOTOGRAPHER.contact.wechat,
      success: () => {
        wx.showToast({ title: '微信号已复制', icon: 'success' })
      }
    })
  },

  copyEmail() {
    wx.setClipboardData({
      data: PHOTOGRAPHER.contact.email,
      success: () => {
        wx.showToast({ title: '邮箱已复制', icon: 'success' })
      }
    })
  },

  goBooking() {
    wx.switchTab({ url: '/pages/booking/booking' })
  },

  onShareAppMessage() {
    return {
      title: '云裳·影像 - 资深古风摄影师',
      path: '/pages/about/about'
    }
  }
})
