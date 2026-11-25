// 服务维护提示页：静态页，禁用分享，防止过期小程序继续传播。
Page({
  onShareAppMessage() {
    return {
      title: '店铺系统维护中',
      path: '/pages/suspended/suspended'
    }
  }
})
