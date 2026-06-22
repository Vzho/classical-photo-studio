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

其中 `booking.styleOptions` 控制预约页“心仪风格”选项；正常使用后台的“预约设置”维护即可。源码中的风格数组只作为 CMS 配置缺失时的兜底，不作为客户业务配置入口。

正常使用后台管理即可，不需要手动维护两份配置。后台保存时会自动更新本地配置，并同步到 COS：

```text
config/portfolio-config.json
```

小程序线上优先读取 COS 配置，这样更新作品、头像、Banner 或资料时不需要重新上传小程序代码；本地 `data/portfolio-config.json` 只作为源码模板和网络异常兜底。

## 图片上传

通过后台上传时，会自动写入以下 COS key，不需要手动创建目录：

```text
avatar/photographer.<ext>
banner/main-banner.jpg
banner/booking-banner.jpg
banner/about-banner.jpg
portfolio/<自动生成的图片文件名>
config/portfolio-config.json
```

## 编译

```bash
npm install
npm run compile
```

然后用微信开发者工具导入当前 `miniprogram` 目录。
