# 摄影作品合集 微信小程序

这是摄影作品展示和预约咨询小程序源码。当前版本是轻量 CMS 运营版：不做登录、数据库、订单或支付，只展示摄影师主动配置的内容，并在用户本机生成可复制的咨询文本。

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

其中 `booking.styleOptions` 控制咨询页“心仪风格”选项；正常使用后台的“预约设置”维护即可。源码中的风格数组只作为 CMS 配置缺失时的兜底，不作为客户业务配置入口。

v1.1 新增字段包括：

- `packages`：套餐和价格说明
- `schedule`：近期档期说明
- `testimonials`：精选客户评价
- `consultButton`：固定咨询按钮
- `consultation`：咨询页文案和咨询文本模板
- `serviceFlow`：服务流程
- `faq`：常见问题
- `photographers`：多摄影师展示
- `stores`：多门店展示
- `modules`：模块开关

关联规则：

- 作品系列 ID 格式为 `series-<主题ID>-<系列ID>`，例如 `series-sample-sample-series`
- 作品系列的 `description`、`suitableFor`、`scenes`、`tags`、`relatedPackageIds`、`relatedPhotographerIds` 通过后台“编辑系列”维护，不需要手写 JSON
- 作品系列的 `relatedPackageIds` 用来把指定套餐显示到作品详情页
- 作品系列的 `relatedPhotographerIds` 用来把指定摄影师显示到作品详情页
- 套餐的 `relatedSeriesIds` 用来关联作品详情和套餐详情里的作品
- 客户评价的 `relatedSeriesId` 用来显示到对应作品详情
- 客户评价的 `relatedPackageId` 用来显示到对应套餐详情
- 摄影师列表的 `relatedSeriesIds` / `relatedPackageIds` 用于后续关联展示
- 门店 `phone` 用于拨打电话；`latitude` 和 `longitude` 同时配置后支持地图导航；未配置坐标时仍支持复制地址

正常使用后台管理即可，不需要手动维护两份配置。后台保存时会自动更新本地配置，并同步到 COS：

```text
config/portfolio-config.json
```

小程序线上优先读取 COS 配置，这样更新作品、头像、Banner 或资料时不需要重新上传小程序代码；本地 `data/portfolio-config.json` 只作为源码模板和网络异常兜底。

咨询页提交时不会调用后台接口，也不会把用户填写的信息写入 COS 或数据库。它只使用 `wx.setStorageSync('lastConsultation', consultationData)` 临时保存到用户本机，用于咨询结果页展示和复制。

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
