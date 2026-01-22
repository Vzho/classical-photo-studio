# 云裳古风摄影系统

本项目包含“云裳古风摄影”的微信小程序端和后台管理系统。

## 项目结构

- `miniprogram/`: 微信小程序源码
- `admin/`: 后台管理系统源码 (Node.js)

## 快速开始

### 1. 微信小程序
1. 使用 **微信开发者工具** 导入 `miniprogram` 目录。
2. 配置 AppID (在 `project.config.json` 中或导入时填写)。
3. 确保本地配置与腾讯云 COS 配置正确。

### 2. 后台管理系统
1. 进入 `admin` 目录：
   ```bash
   cd admin
   ```
2. 安装依赖：
   ```bash
   npm install
   ```
3. 启动服务：
   ```bash
   npm start
   ```
4. 访问 `http://localhost:8080` 进行内容管理。

## 数据管理
- 小程序和后台共享数据配置文件：`miniprogram/data/portfolio-config.json`。
- 图片资源存储在腾讯云 COS。
