# 摄影作品管理后台

这是摄影作品小程序的本地管理后台，基于 Node.js 和 Express。

## 功能

- 管理作品主题、系列、照片
- 上传图片到腾讯云 COS
- 删除 COS 图片
- 上传摄影师头像并自动写入配置
- 编辑首页轮播文案
- 通过“主题设置”选择预设主题、品牌名、主色、背景色和文字色
- 编辑预约页心仪风格选项
- 结构化编辑作品系列介绍、适合人群、拍摄场景、风格标签和关联内容
- 编辑摄影师资料、联系方式和门店地址
- 编辑 v1.1 内容模块：套餐、档期、客户评价、服务流程、FAQ、咨询按钮、咨询文本模板、多摄影师、多门店
- 同步 `portfolio-config.json` 到 COS
- 不保存客户咨询数据；小程序只在用户本机生成可复制的咨询内容

## 内容模块关联规则

- 作品系列可在编辑系列弹窗中直接维护介绍、适合人群、拍摄场景、风格标签、关联套餐 ID 和关联摄影师 ID，不需要手写 JSON
- 系列 `relatedPackageIds`：把套餐显示到对应作品详情页，填写套餐 `id`
- 系列 `relatedPhotographerIds`：把摄影师显示到对应作品详情页，填写摄影师 `id`
- 套餐 `relatedSeriesIds`：关联作品系列，格式为 `series-<主题ID>-<系列ID>`
- 评价 `relatedSeriesId`：显示到对应作品详情页
- 评价 `relatedPackageId`：显示到对应套餐详情页
- 套餐详情页、作品详情页和预约咨询页都优先读取 COS 上的 `config/portfolio-config.json`
- 修改内容模块后点击“保存并同步”，不需要手动上传 JSON

## 咨询按钮

`consultButton` 通过后台“内容模块”维护。`action` 支持：

- `booking`：进入咨询页并生成本地咨询内容
- `copyWechat`：复制摄影师微信号
- `contact`：弹出可用联系方式
- `phone`：拨打门店或摄影师电话，失败时复制电话

`showOnPages` 控制固定/底部按钮显示页面，可填 `portfolio`、`seriesDetail`、`packageDetail`、`about`。套餐卡片里的“咨询此套餐”属于套餐操作入口，会复用同一动作配置，但不作为固定按钮隐藏。

## 主题设置

后台顶部的“主题设置”提供 5 套预设：极简高级风、复古胶片风、奶油婚纱风、儿童亲子风、国风雅致风。

保存后会写入 `theme` 字段并同步 COS。当前小程序会立即应用主色、背景色和文字色；卡片风格、按钮风格、图片圆角、布局疏密作为配置字段保留，方便后续继续扩展。

## 启动

```bash
cd admin
npm install
copy .env.example .env
npm start
```

macOS / Linux 把 `copy .env.example .env` 换成：

```bash
cp .env.example .env
```

打开：

```text
http://localhost:8080
```

## 配置

`.env` 需要填写客户自己的 COS 信息：

```env
COS_SECRET_ID=YOUR_COS_SECRET_ID
COS_SECRET_KEY=YOUR_COS_SECRET_KEY
COS_BUCKET=YOUR_COS_BUCKET
COS_REGION=YOUR_COS_REGION
PORT=8080
```

## 安全

- 不要提交 `.env`
- 不要提交 `uploads/`
- 不要把客户咨询信息写入后台或提交到 Git
- 每个客户使用独立 COS Bucket 或独立目录
