# 管理后台启动指南

后台用于管理小程序的主题、系列、照片、首页文案、摄影师资料，并同步配置到腾讯云 COS。

## 1. 安装依赖

```bash
cd admin
npm install
```

## 2. 配置环境变量

复制模板：

```bash
copy .env.example .env
```

填写客户自己的 COS 配置：

```env
COS_SECRET_ID=YOUR_COS_SECRET_ID
COS_SECRET_KEY=YOUR_COS_SECRET_KEY
COS_BUCKET=YOUR_COS_BUCKET
COS_REGION=YOUR_COS_REGION
PORT=8080
```

`.env` 已被 Git 忽略，不要提交客户密钥。

## 3. 启动服务

```bash
npm start
```

开发模式：

```bash
npm run dev
```

浏览器打开：

```text
http://localhost:8080
```

## 4. 常用操作

- 添加或编辑主题
- 添加或编辑系列
- 批量上传照片
- 上传摄影师头像
- 删除照片或系列
- 编辑首页轮播文案
- 编辑摄影师资料和门店信息
- 同步 `portfolio-config.json` 到 COS

## 5. 自动上传路径

不需要手动创建 COS 目录。后台会自动使用以下 key：

```text
avatar/photographer.<ext>
banner/main-banner.jpg
banner/booking-banner.jpg
banner/about-banner.jpg
portfolio/<图片文件名>
config/portfolio-config.json
```

## 6. 排查

- 启动失败：检查 `.env` 是否存在，端口是否被占用。
- 上传失败：检查 COS 密钥、Bucket、Region 和权限。
- 小程序图片不显示：检查微信后台合法域名和 COS 文件是否公开可读。
