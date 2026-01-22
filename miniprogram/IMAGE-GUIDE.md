# 图片替换指南

## 📸 图片规格建议

| 位置 | 尺寸建议 | 格式 | 大小 |
|------|---------|------|------|
| 摄影师头像 | 400x400px | JPG/PNG | < 200KB |
| 首页横幅 | 750x1200px | JPG | < 500KB |
| 预约页横幅 | 750x600px | JPG | < 500KB |
| 作品图片 | 750x1000px (3:4) | JPG | < 500KB |

---

## 🚀 快速替换步骤

### 1. 准备图片
将你的照片按以下命名：
```
photographer.jpg          # 摄影师头像
main-banner.jpg          # 首页横幅
booking-banner.jpg       # 预约页横幅
photo-1.jpg              # 作品1
photo-2.jpg              # 作品2
...
```

### 2. 上传到 COS
1. 登录 https://console.cloud.tencent.com/cos
2. 进入存储桶 `phtoto-test-1302910967`
3. 创建文件夹并上传：

**avatar 文件夹：**
- 上传 `photographer.jpg`

**banner 文件夹：**
- 上传 `main-banner.jpg`
- 上传 `booking-banner.jpg`

**portfolio 文件夹：**
- 上传所有作品图片（可以自定义文件名）

### 3. 修改作品信息
打开 `miniprogram/utils/cos.ts`，找到 `getPortfolioImages` 函数，修改：

```typescript
{
  id: '1',
  title: '你的作品标题',           // 修改这里
  category: '清冷风',              // 选择分类
  imageUrl: getCosUrl('portfolio/你的图片名.jpg'),  // 修改图片路径
  likes: 100                       // 修改点赞数
}
```

**可用分类：**
- 清冷风
- 明制
- 武侠
- 油画风
- 清汉女
- 汉唐风韵

### 4. 添加更多作品
复制一个作品对象，修改信息：

```typescript
{
  id: '7',                         // 递增 ID
  title: '新作品标题',
  category: '明制',
  imageUrl: getCosUrl('portfolio/new-photo.jpg'),
  likes: 50
},
{
  id: '8',
  title: '另一个作品',
  category: '武侠',
  imageUrl: getCosUrl('portfolio/another-photo.jpg'),
  likes: 80
}
```

---

## 🎨 图片优化建议

### 压缩图片
使用在线工具压缩图片：
- TinyPNG: https://tinypng.com
- 智图: https://zhitu.isux.us

### 图片比例
- **作品图片**: 建议 3:4 竖图（如 750x1000px）
- **横幅图片**: 建议 5:8 或 5:4
- **头像**: 正方形 1:1

### 文件命名规范
- 使用英文或拼音
- 小写字母
- 用 `-` 连接单词
- 例如：`qingleng-winter-1.jpg`

---

## ✅ 验证图片
上传后，在浏览器访问测试：
```
https://phtoto-test-1302910967.cos.ap-chongqing.myqcloud.com/avatar/photographer.jpg
https://phtoto-test-1302910967.cos.ap-chongqing.myqcloud.com/banner/main-banner.jpg
https://phtoto-test-1302910967.cos.ap-chongqing.myqcloud.com/portfolio/photo-1.jpg
```

如果能正常访问，说明上传成功！

---

## 🔧 常见问题

**Q: 图片上传后显示 403？**
A: 需要设置图片权限为「公有读私有写」

**Q: 图片加载很慢？**
A: 压缩图片大小，建议单张 < 500KB

**Q: 想批量上传图片？**
A: 使用 COS 控制台的「批量上传」功能，或使用 COSBrowser 工具

**Q: 如何删除旧图片？**
A: 在 COS 控制台选中文件，点击「删除」
