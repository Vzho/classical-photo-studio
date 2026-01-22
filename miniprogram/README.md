# 云裳·影像 微信小程序

古风摄影工作室小程序，支持作品展示、摄影师介绍、在线预约。

## 腾讯云COS配置

1. 登录 [腾讯云COS控制台](https://console.cloud.tencent.com/cos)
2. 创建存储桶，记录 Bucket 名称和地域
3. 修改 `app.ts` 中的配置：

```typescript
cos: {
  bucket: 'your-bucket-name',
  region: 'ap-guangzhou', // 你的地域
  baseUrl: 'https://your-bucket-name.cos.ap-guangzhou.myqcloud.com'
}
```

4. 在COS中创建以下目录结构并上传图片：
```
├── avatar/
│   └── photographer.jpg
├── banner/
│   ├── main-banner.jpg
│   └── booking-banner.jpg
└── portfolio/
    ├── qingleng-1.jpg
    ├── qingleng-2.jpg
    ├── wuxia-1.jpg
    ├── mingzhi-1.jpg
    ├── hantang-1.jpg
    └── youhua-1.jpg
```

5. 在小程序后台添加COS域名到合法域名列表

## TabBar图标

需要在 `images/` 目录下放置以下图标（建议81x81px）：
- tab-portfolio.png / tab-portfolio-active.png
- tab-about.png / tab-about-active.png  
- tab-booking.png / tab-booking-active.png

## 上线步骤

1. 在微信公众平台注册小程序账号
2. 获取AppID填入 `project.config.json`
3. 配置COS域名为合法域名
4. 使用微信开发者工具上传代码
5. 提交审核
