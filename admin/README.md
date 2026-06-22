# 摄影作品管理后台

这是摄影作品小程序的本地管理后台，基于 Node.js 和 Express。

## 功能

- 管理作品主题、系列、照片
- 上传图片到腾讯云 COS
- 删除 COS 图片
- 上传摄影师头像并自动写入配置
- 编辑首页轮播文案
- 编辑预约页心仪风格选项
- 编辑摄影师资料、联系方式和门店地址
- 同步 `portfolio-config.json` 到 COS
- 管理本地预约数据

## 启动

```bash
cd admin
npm install
copy .env.example .env
npm start
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
- 不要提交真实预约数据 `bookings.json`
- 每个客户使用独立 COS Bucket 或独立目录
