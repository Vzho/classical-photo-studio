# 摄影作品小程序源码模板

这是一套可复用的摄影作品展示小程序源码，包含微信小程序端和本地管理后台。交付给新客户时，只需要克隆仓库，然后替换客户自己的 AppID、名称、COS 配置、作品数据和联系方式。

## 目录结构

- `miniprogram/`：微信小程序源码
- `admin/`：本地管理后台，负责编辑配置、上传图片、同步 COS
- `miniprogram/data/portfolio-config.json`：小程序默认配置和示例数据

## 快速配置

### 1. 克隆源码

```bash
git clone https://github.com/Vzho/classical-photo-studio.git
cd classical-photo-studio
```

### 2. 配置小程序 AppID 和名称

编辑 `miniprogram/project.config.json`：

```json
{
  "projectname": "客户项目英文名",
  "description": "客户小程序描述",
  "appid": "客户小程序 AppID"
}
```

编辑 `miniprogram/app.json`：

```json
{
  "window": {
    "navigationBarTitleText": "客户小程序名称"
  }
}
```

### 3. 配置 COS

编辑 `miniprogram/app.ts`：

```ts
cos: {
  bucket: '客户 COS Bucket',
  region: '客户 COS Region',
  baseUrl: 'https://客户 COS Bucket.cos.客户 COS Region.myqcloud.com'
}
```

复制后台环境变量模板：

```bash
cd admin
copy .env.example .env
```

macOS / Linux 使用：

```bash
cp .env.example .env
```

然后填写 `admin/.env`：

```env
COS_SECRET_ID=客户 SecretId
COS_SECRET_KEY=客户 SecretKey
COS_BUCKET=客户 COS Bucket
COS_REGION=客户 COS Region
PORT=8080
```

不要把 `.env` 提交到 Git。

### 4. 配置作品和资料

可以直接编辑：

```text
miniprogram/data/portfolio-config.json
```

也可以启动后台管理：

```bash
cd admin
npm install
npm start
```

浏览器打开：

```text
http://localhost:8080
```

后台可管理主题、系列、照片、系列介绍、适合人群、拍摄场景、风格标签、系列关联套餐/摄影师、首页轮播文案、主题预设、预约咨询风格、摄影师资料、头像、门店信息，以及 v1.1 内容模块。套餐、档期、客户评价、咨询按钮、服务流程、FAQ、多摄影师和多门店支持结构化表单编辑；咨询文本模板保留在内容模块中维护。

### 5. 上传图片到 COS

不需要手动创建 COS 目录，也不需要手动编写图片路径。后台会按固定 key 自动上传并写入配置：

```text
头像：avatar/photographer.<ext>
首页 Banner：banner/main-banner.jpg
预约页 Banner：banner/booking-banner.jpg
简介页 Banner：banner/about-banner.jpg
作品图片：portfolio/<自动生成的图片文件名>
配置文件：config/portfolio-config.json
```

正常使用后台管理即可，不需要手动维护这两个配置文件。后台保存时会自动更新本地 `miniprogram/data/portfolio-config.json`，并同步到 COS 的 `config/portfolio-config.json`。小程序线上优先读取 COS 配置，这样客户后续更新作品、头像、Banner 或资料时，不需要重新上传小程序代码；本地配置只作为源码模板和网络异常兜底。

作品系列的介绍、适合人群、拍摄场景、标签、关联套餐和关联摄影师也通过后台“编辑系列”维护，不需要客户手动编写 JSON。关联套餐填写套餐 `id`，关联摄影师填写摄影师 `id`。

套餐、档期、客户评价、咨询按钮、服务流程、FAQ、多摄影师和多门店通过后台“内容模块”里的结构化表单维护，保存时自动写入配置并同步 COS；JSON 文本框只作为高级预览和批量排查入口。

固定/底部咨询按钮由后台内容模块里的 `consultButton` 控制：`enabled` 控制是否显示，`text` 控制文案，`action` 支持进入咨询页、复制微信、弹出联系方式或拨打电话，`showOnPages` 控制在作品首页、系列详情、套餐详情和简介页显示。

小程序端已展示首页服务流程、关于页服务价格区、套餐详情推荐摄影师、门店详情弹层，以及门店地址复制、电话和地图导航。

### 6. 本地预览

```bash
cd miniprogram
npm install
npm run compile
```

使用微信开发者工具导入 `miniprogram` 目录，确认 AppID 正确，然后编译、预览、真机扫码测试。

### 7. 微信后台配置

在微信公众平台为客户小程序配置：

- 基本信息：名称、头像、简介
- 服务类目
- 隐私保护指引
- 服务器域名：把客户 COS 域名加入 `request合法域名` 和 `downloadFile合法域名`

### 8. 上传审核

在微信开发者工具中上传代码，推荐版本号从 `1.0.0` 开始。上传后到微信公众平台设置体验版，客户验收通过后提交审核，审核通过后发布。

## 交付检查

- AppID 已替换为客户 AppID
- 小程序名称和分享标题已替换
- COS Bucket、Region、BaseUrl 已替换
- `portfolio-config.json` 已更新为客户资料
- 作品系列介绍、标签、适合人群、拍摄场景和关联内容已在后台配置
- 预约咨询页心仪风格、套餐、档期、评价、门店和咨询模板已在后台配置
- 固定咨询按钮显示页面和动作已在后台配置
- 主题预设、品牌主色、背景色、文字色、卡片风格、按钮风格、图片圆角和布局疏密已在后台配置
- 多门店电话、地址复制和地图导航已真机检查
- 已确认咨询页只生成本地咨询内容，不上传客户信息、不生成后台预约记录
- 后台已上传头像、Banner、作品图片并同步远程配置
- 微信后台合法域名已配置
- 真机预览图片、详情、咨询、联系方式正常

## 注意

本仓库只保留源码模板和示例配置，不应提交客户密钥、客户咨询数据、临时上传文件或客户专属素材。当前版本不是完整预约系统，不包含数据库、登录、订单或支付。
