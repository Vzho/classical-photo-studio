# 📸 照片上传指南

## 当前配置
代码已更新为使用 `portfolio` 文件夹，所有照片都放在这个文件夹下。

---

## 🎯 需要上传的照片

### 1. 摄影师头像
- **位置**: `avatar/photographer.jpg`
- **尺寸**: 400x400px（正方形）
- **用途**: 显示在"简介"页面

### 2. 横幅图片
- **首页横幅**: `banner/main-banner.jpg`（750x1200px）
- **预约页横幅**: `banner/booking-banner.jpg`（750x600px）

### 3. 作品照片（30张）
所有照片放在 `portfolio` 文件夹，按以下命名：

**清冷风（6张）:**
- qingleng-1.jpg
- qingleng-2.jpg
- qingleng-3.jpg
- qingleng-4.jpg
- qingleng-5.jpg
- qingleng-6.jpg

**明制（6张）:**
- mingzhi-1.jpg
- mingzhi-2.jpg
- mingzhi-3.jpg
- mingzhi-4.jpg
- mingzhi-5.jpg
- mingzhi-6.jpg

**武侠（6张）:**
- wuxia-1.jpg
- wuxia-2.jpg
- wuxia-3.jpg
- wuxia-4.jpg
- wuxia-5.jpg
- wuxia-6.jpg

**油画风（6张）:**
- youhua-1.jpg
- youhua-2.jpg
- youhua-3.jpg
- youhua-4.jpg
- youhua-5.jpg
- youhua-6.jpg

**清汉女（6张）:**
- qinghan-1.jpg
- qinghan-2.jpg
- qinghan-3.jpg
- qinghan-4.jpg
- qinghan-5.jpg
- qinghan-6.jpg

---

## 📤 上传步骤

### 方法一：通过 COS 控制台上传

1. **登录腾讯云 COS**
   https://console.cloud.tencent.com/cos

2. **进入存储桶**
   点击 `phtoto-test-1302910967`

3. **上传头像**
   - 点击 `avatar` 文件夹
   - 点击「上传文件」
   - 选择你的头像照片
   - 重命名为 `photographer.jpg`
   - 点击上传

4. **上传横幅**
   - 点击 `banner` 文件夹
   - 上传两张横幅图片
   - 分别命名为 `main-banner.jpg` 和 `booking-banner.jpg`

5. **上传作品照片**
   - 点击 `portfolio` 文件夹
   - 点击「上传文件」
   - 选择所有作品照片（可以批量选择）
   - 上传后，逐个重命名为对应的文件名

6. **设置权限**
   - 全选所有上传的文件
   - 点击「更多操作」→「修改访问权限」
   - 选择「公有读私有写」
   - 点击确定

---

## 🔄 如果文件名不想改

如果你不想重命名照片，可以修改代码：

打开 `miniprogram/utils/cos.ts`，找到对应的行，把文件名改成你的实际文件名：

```typescript
{
  id: '1',
  title: '霜华清影',
  category: '清冷风',
  imageUrl: getCosUrl('portfolio/你的实际文件名.jpg'),  // 👈 改这里
  likes: 124
}
```

---

## ✅ 验证上传

上传完成后，在浏览器中访问以下链接测试：

```
https://phtoto-test-1302910967.cos.ap-chongqing.myqcloud.com/avatar/photographer.jpg
https://phtoto-test-1302910967.cos.ap-chongqing.myqcloud.com/banner/main-banner.jpg
https://phtoto-test-1302910967.cos.ap-chongqing.myqcloud.com/portfolio/qingleng-1.jpg
```

如果能看到图片，说明上传成功！

---

## 📋 上传清单

- [ ] avatar/photographer.jpg
- [ ] banner/main-banner.jpg
- [ ] banner/booking-banner.jpg
- [ ] portfolio/qingleng-1.jpg ~ qingleng-6.jpg（6张）
- [ ] portfolio/mingzhi-1.jpg ~ mingzhi-6.jpg（6张）
- [ ] portfolio/wuxia-1.jpg ~ wuxia-6.jpg（6张）
- [ ] portfolio/youhua-1.jpg ~ youhua-6.jpg（6张）
- [ ] portfolio/qinghan-1.jpg ~ qinghan-6.jpg（6张）

**总计：33张照片**

---

## 💡 小技巧

### 批量重命名照片
**Windows:**
1. 选中所有清冷风照片
2. 按 F2 重命名第一张为 `qingleng-1`
3. 系统会自动命名为 qingleng-1, qingleng-2, qingleng-3...

**Mac:**
1. 选中所有照片
2. 右键 → 重命名
3. 选择「格式」→ 名称格式：`qingleng`，起始编号：1

### 压缩照片
使用在线工具压缩：
- TinyPNG: https://tinypng.com
- 智图: https://zhitu.isux.us

建议每张照片 < 500KB
