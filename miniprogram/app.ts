App<IAppOption>({
  globalData: {
    // 腾讯云 COS 配置：交付客户前替换为客户自己的 Bucket/Region/BaseUrl。
    cos: {
      bucket: 'YOUR_COS_BUCKET',
      region: 'YOUR_COS_REGION',
      baseUrl: 'https://YOUR_COS_BUCKET.cos.YOUR_COS_REGION.myqcloud.com'
    }
  },
  onLaunch() {
    console.log('摄影作品合集小程序启动')
  }
})
