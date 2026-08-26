# 摄影作品合集 微信小程序

这是摄影作品展示和预约咨询小程序源码。当前版本是轻量 CMS 运营版：不做登录、数据库、订单或支付，只展示摄影师主动配置的内容，并在用户本机生成可复制的咨询文本。

## 配置项

### AppID

推荐在管理后台“云端设置”中填写；也可以新建仅供本机使用的 `project.private.config.json`：

```json
{
  "appid": "客户小程序 AppID"
}
```

`project.private.config.json` 已被 Git 忽略。仓库里的 `project.config.json` 保留 `touristappid`。

### 小程序名称

编辑 `app.json`：

```json
{
  "window": {
    "navigationBarTitleText": "客户小程序名称"
  }
}
```

微信分享标题和封面不需要逐页修改代码。启动后台后，点击顶部“首页”，在“微信分享卡片”中填写标题并上传 5:4 的 JPG 或 PNG 横图即可。作品详情、简介、套餐和咨询页会自动组合当前页面名称。

### COS

客户自己的 COS 不写在 `app.ts`。使用后台 CMS 顶部“云端”保存后，会自动生成：

```text
miniprogram/config/client.config.js
```

这个文件只保存在本地，不提交到 Git。仓库里保留了 `miniprogram/config/client.config.example.js`，需要手动配置时可以复制一份改名为 `client.config.js`。

## 数据配置

默认数据在：

```text
data/portfolio-config.json
```

其中 `booking.styleOptions` 控制咨询页“心仪风格”选项；正常使用后台的“预约设置”维护即可。源码中的风格数组只作为 CMS 配置缺失时的兜底，不作为客户业务配置入口。

当前配置版本为 `2.3.0`。主要字段包括：

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
- `share`：微信分享标题和封面；正常通过后台“首页”维护
- `decoration`：页面装修；包含经典作品站/暗色品牌画廊整站结构、门店常用称呼、2–5 个底部导航入口、独立作品目录和门店页、档期/评价快捷入口、受控图标、首页结构、作品排列、1–4 列作品布局、标题/分类/描述开关、次级页视觉版式、页面模块添加/移出/顺序/标题，以及咨询表单字段

`decoration` 正常通过后台“页面装修”维护。旧配置没有该字段时，小程序和后台都会补齐默认结构，原有作品、资料、套餐和 COS 图片不会被覆盖。

`consultButton` 说明：

- `enabled`：是否显示固定/底部咨询按钮
- `text`：按钮文案
- `action`：按钮动作，支持 `booking`（进入咨询页）、`copyWechat`（复制微信）、`contact`（弹出联系方式）、`phone`（拨打电话，失败时复制电话）
- `showOnPages`：固定/底部按钮显示页面，支持 `portfolio`、`seriesDetail`、`packageDetail`、`about`

关联规则：

- 作品系列 ID 格式为 `series-<主题ID>-<系列ID>`，例如 `series-style-a-album-a`
- 作品系列的 `description`、`suitableFor`、`scenes`、`tags`、`relatedPackageIds`、`relatedPhotographerIds` 通过后台“编辑系列”维护，不需要手写 JSON
- 作品系列的 `relatedPackageIds` 用来把指定套餐显示到作品详情页
- 作品系列的 `relatedPhotographerIds` 用来把指定摄影师显示到作品详情页
- 套餐的 `relatedSeriesIds` 用来关联作品详情和套餐详情里的作品
- 客户评价的 `relatedSeriesId` 用来显示到对应作品详情
- 客户评价的 `relatedPackageId` 用来显示到对应套餐详情
- 摄影师列表的 `relatedSeriesIds` / `relatedPackageIds` 用于后续关联展示
- 门店 `phone` 用于拨打电话；`latitude` 和 `longitude` 同时配置后支持地图导航；未配置坐标时仍支持复制地址

正常使用后台管理即可，不需要手动维护两份配置。配置 COS 后，后台直接读取并更新云端配置，不会把客户内容写回源码模板：

```text
config/portfolio-config.json
```

小程序线上始终优先读取 COS 配置，这样更新作品、头像、Banner 或资料时不需要重新上传小程序代码。云端请求临时失败时只复用当前 COS 最近一次成功配置；已配置 COS 后不会回退到源码中的其他客户数据。本地 `data/portfolio-config.json` 仅用于未配置 COS 时的开发模板。

咨询页提交时不会调用后台接口，也不会把用户填写的信息写入 COS 或数据库。它只使用 `wx.setStorageSync('lastConsultation', consultationData)` 临时保存到用户本机，用于咨询结果页展示和复制。

## 图片上传

通过后台上传时，会自动写入以下 COS key，不需要手动创建目录：

```text
avatar/photographer.<ext>
banner/main-banner.jpg
banner/booking-banner.jpg
banner/about-banner.jpg
share/<自动生成的图片文件名>
portfolio/<自动生成的图片文件名>
config/portfolio-config.json
```

## 编译

```bash
npm install
npm run compile
```

然后用微信开发者工具导入当前 `miniprogram` 目录。
