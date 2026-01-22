App<IAppOption>({
  globalData: {
    // 腾讯云COS配置
    cos: {
      bucket: 'phtoto-test-1302910967',
      region: 'ap-chongqing',
      baseUrl: 'https://phtoto-test-1302910967.cos.ap-chongqing.myqcloud.com'
    }
  },
  onLaunch() {
    console.log('云裳影像小程序启动')
  }
})
