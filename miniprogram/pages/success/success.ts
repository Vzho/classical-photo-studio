Page({
  data: {
    steps: [
      { title: '微信确认', desc: '添加您的微信，沟通具体拍摄场景' },
      { title: '支付定金', desc: '锁定拍摄档期，提前准备妆造' },
      { title: '如期拍摄', desc: '在约定时间地点开启您的穿越之旅' }
    ]
  },

  goHome() {
    wx.switchTab({ url: '/pages/portfolio/portfolio' })
  },

  viewBooking() {
    // 可以跳转到预约详情页或我的预约列表
    wx.showToast({ title: '功能开发中', icon: 'none' })
  }
})
