# 摄影作品合集 微信小程序

这是摄影作品展示和预约咨询小程序源码。

## 配置项

### AppID

编辑 `project.config.json`：

```json
{
  "appid": "客户小程序 AppID"
}
```

### 小程序名称

编辑 `app.json`：

```json
{
  "window": {
    "navigationBarTitleText": "客户小程序名称"
  }
}
```

同步检查页面分享标题：

- `pages/portfolio/portfolio.ts`
- `pages/about/about.ts`
- `pages/booking/booking.ts`
- `pages/series/series.ts`

### COS

编辑 `app.ts`：

```ts
cos: {
  bucket: '客户 COS Bucket',
  region: '客户 COS Region',
  baseUrl: 'https://客户 COS Bucket.cos.客户 COS Region.myqcloud.com'
}
```

## 数据配置

默认数据在：

```text
data/portfolio-config.json
```

小程序会优先请求 COS 上的：

```text
config/portfolio-config.json
```

请求失败时使用本地配置。

## 图片目录

建议上传到 COS：

```text
avatar/photographer.jpg
banner/main-banner.jpg
banner/booking-banner.jpg
banner/about-banner.jpg
portfolio/<图片文件名>
config/portfolio-config.json
```

## 编译

```bash
npm install
npm run compile
```

然后用微信开发者工具导入当前 `miniprogram` 目录。
