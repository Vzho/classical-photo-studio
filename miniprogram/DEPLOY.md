# 小程序部署指南

## 1. 微信公众平台配置

登录客户的小程序后台，完成：

- 小程序名称
- 头像
- 简介
- 服务类目
- 隐私保护指引

## 2. 合法域名

进入「开发管理」->「开发设置」->「服务器域名」，把客户 COS 域名加入：

- `request合法域名`
- `downloadFile合法域名`

域名格式：

```text
https://客户 COS Bucket.cos.客户 COS Region.myqcloud.com
```

## 3. 本地配置

确认这些文件已替换为客户信息：

- `project.config.json`：AppID、项目名、描述
- `app.json`：导航栏标题
- `app.ts`：COS Bucket、Region、BaseUrl
- `data/portfolio-config.json`：作品数据、首页文案、摄影师资料

后台会自动上传头像、Banner、作品图，并同步 `config/portfolio-config.json` 到 COS；不需要手动创建 COS 目录。

## 4. 本地预览

```bash
npm install
npm run compile
```

用微信开发者工具导入 `miniprogram` 目录，编译后真机扫码测试。

## 5. 测试清单

- 首页轮播图片正常
- 分类和作品列表正常
- 系列详情正常
- 图片预览正常
- 摄影师简介正常
- 微信号、邮箱、门店地址正确
- 预约单复制正常
- 分享标题正确

## 6. 上传审核

在微信开发者工具点击「上传」，填写版本号和备注。

上传后进入微信公众平台：

1. 设置体验版
2. 发给客户验收
3. 提交审核
4. 审核通过后发布

## 7. 注意

小程序正式环境不会允许未配置的网络域名。上线前必须完成合法域名配置，并确认 COS 文件可被访问。
