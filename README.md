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

不要修改 `miniprogram/app.ts`，客户 COS 不写死在源码里。先复制后台环境变量模板：

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

也可以打开后台的“云端”页面填写并保存。保存成功后，后台会自动生成：

```text
miniprogram/config/client.config.js
```

这个文件只保存在客户本地，不提交到 Git，也不要放进给下一个客户的源码包。

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

后台可管理分类、作品集、照片、系列介绍、适合人群、场景、标签、关联套餐/服务人员、首页文案、微信分享卡片、预约选项、店铺资料和服务内容。套餐、档期、客户评价、咨询按钮、服务流程、常见问题、多服务人员和多门店均使用表单维护。

顶部“页面装修”提供受控装修能力：内置东方高定、时尚画册、清透客片 3 套商业皮肤。三套皮肤分别使用独立的首页构图、作品排列、简介头部、预约表单、套餐、详情页、底部导航和快捷入口，不是简单换色；保存前使用当前 COS 客片即时预览，也可撤销本次风格修改。旧版 6 套皮肤继续兼容已上线配置，但不再作为新装修选项。装修不会改动照片、文字、分类、模块顺序或已选图标，也不开放任意 CSS 或 SVG。作品首页、店铺简介、预约咨询、套餐列表、套餐详情、作品详情和咨询结果共 7 个页面均支持模块显示/隐藏、上下排序和标题编辑。咨询表单字段也可调整名称、提示、顺序、必填状态和是否显示，不需要修改源码或 JSON。

后台对分类、作品集和照片同时提供“下架”和“永久删除”：下架只影响小程序展示并可恢复；永久删除会同步移除配置和未被其他内容引用的 COS 照片。如果曾在 COS 控制台手动删除照片，可在后台“云端设置”使用“同步已删除照片”清理失效记录。

微信分享卡片在后台顶部点击“首页”设置：填写分享标题并上传 5:4 的 JPG 或 PNG 横图，保存后会同步到 COS。首页使用这套标题和封面；作品详情、简介、套餐和咨询页会自动组合当前页面名称，不需要逐页修改代码。

### 5. 上传图片到 COS

不需要手动创建 COS 目录，也不需要手动编写图片路径。后台会按固定 key 自动上传并写入配置：

```text
头像：avatar/photographer.<ext>
首页 Banner：banner/main-banner.jpg
预约页 Banner：banner/booking-banner.jpg
简介页 Banner：banner/about-banner.jpg
微信分享封面：share/<自动生成的图片文件名>
作品图片：portfolio/<自动生成的图片文件名>
配置文件：config/portfolio-config.json
```

正常使用后台管理即可，不需要手动维护作品配置文件。后台保存时会自动更新本地 `miniprogram/data/portfolio-config.json`，并同步到 COS 的 `config/portfolio-config.json`。小程序线上始终优先读取 COS 配置，这样客户后续更新作品、头像、Banner 或资料时，不需要重新上传小程序代码。云端请求临时失败时只复用当前 COS 最近一次成功配置；已配置 COS 后不会回退到源码中的其他客户数据。本地配置仅用于未配置 COS 时的开发模板。

客户自己的 COS 地址不再写死在 `miniprogram/app.ts`。后台“云端设置”保存后会生成本地文件 `miniprogram/config/client.config.js`，小程序运行时从这个文件读取公开的 Bucket、Region 和 BaseUrl。这个文件是客户私有配置，不提交到 Git；仓库只保留 `miniprogram/config/client.config.example.js` 作为模板。

作品系列的介绍、适合人群、拍摄场景、标签、关联套餐和关联摄影师也通过后台“编辑系列”维护，不需要客户手动编写 JSON。关联套餐填写套餐 `id`，关联摄影师填写摄影师 `id`。

套餐、档期、客户评价、咨询按钮、服务流程、FAQ、多摄影师和多门店通过后台“服务内容”里的结构化表单维护，保存时自动写入配置并同步 COS；高级配置默认折叠，仅用于技术排查。

固定/底部咨询按钮由后台内容模块里的 `consultButton` 控制：`enabled` 控制是否显示，`text` 控制文案，`action` 支持进入咨询页、复制微信、弹出联系方式或拨打电话，`showOnPages` 控制在作品首页、系列详情、套餐详情和简介页显示。

小程序端已展示首页服务流程、关于页服务价格区、套餐详情推荐摄影师、门店详情弹层，以及门店地址复制、电话和地图导航。

客户评价图片和团队摄影师头像可以在后台结构化表单里直接上传到 COS，不需要客户手动拼图片路径。

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
- 小程序名称已替换，后台“首页”中的分享标题和封面已配置
- COS Bucket、Region、BaseUrl 已替换
- `portfolio-config.json` 已更新为客户资料
- 作品系列介绍、标签、适合人群、拍摄场景和关联内容已在后台配置
- 预约咨询页心仪风格、套餐、档期、评价、门店和咨询模板已在后台配置
- 固定咨询按钮显示页面和动作已在后台配置
- 页面装修中的皮肤、品牌颜色、门店常用称呼、字体、按钮、卡片、图片圆角、受控图标、页面视觉版式、7 个页面模块顺序和咨询字段已配置
- 多门店电话、地址复制和地图导航已真机检查
- 已确认咨询页只生成本地咨询内容，不上传客户信息、不生成后台预约记录
- 后台已上传头像、Banner、作品图片并同步远程配置
- 微信后台合法域名已配置
- 真机预览图片、详情、咨询、联系方式正常

## 给新客户打包

不要直接压缩当前工作目录。当前目录里可能有旧客户的 `.env`、本地配置、缓存或生成文件，直接压缩会把旧 COS 信息和旧作品一起发出去。

推荐直接发 GitHub 地址：

```bash
git clone https://github.com/Vzho/classical-photo-studio.git
```

如果必须发 zip，使用脚本生成干净源码包：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\create-source-package.ps1
```

生成的 zip 在 `release/` 目录中，已排除 `admin/.env`、`miniprogram/config/client.config.js`、真实 AppID、上传缓存、日志、内部开发计划和依赖目录，并会把包内 `miniprogram/data/portfolio-config.json` 重置为通用空模板。包内 `miniprogram/project.config.json` 使用 `touristappid`，客户导入后再换成自己的 AppID。

## 注意

本仓库只保留源码模板和示例配置，不应提交客户密钥、客户咨询数据、临时上传文件或客户专属素材。当前版本不是完整预约系统，不包含数据库、登录、订单或支付。

当前后台保存后会直接更新本地配置并同步 COS。本阶段暂不包含预发布环境、版本回滚和一键安装，这三项作为后续独立能力开发。
