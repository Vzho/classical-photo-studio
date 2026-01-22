# 📸 系列作品功能使用指南

## 功能说明

系列作品功能允许你将同一主题的多张照片组合成一个系列，用户点击封面后可以查看系列中的所有照片。

---

## 🎯 使用场景

**适合做成系列的情况：**
- 同一套服装的多个角度
- 同一场景的不同姿势
- 同一主题的连续拍摄
- 讲述故事的组图

**示例：**
- "霜华清影"系列：3张同一套清冷风服装的照片
- "江湖夜雨"系列：5张武侠主题的连续镜头
- "汉宫秋月"系列：4张汉服不同角度

---

## 📝 如何配置系列作品

### 步骤 1: 准备照片

将系列照片上传到 COS，建议命名规则：
```
portfolio/qingleng-1.jpg      # 系列封面
portfolio/qingleng-1-2.jpg    # 系列第2张
portfolio/qingleng-1-3.jpg    # 系列第3张
```

### 步骤 2: 修改代码

打开 `miniprogram/utils/cos.ts`，找到 `getAllImages` 函数：

```typescript
// 系列作品示例
{
  id: '1',
  title: '霜华清影',
  category: '清冷风',
  imageUrl: getCosUrl('portfolio/qingleng-1.jpg'),
  likes: 124,
  seriesId: 'series-shuanghua',  // 👈 系列ID（自定义，同一系列用相同ID）
  isSeriesCover: true  // 👈 标记为封面，会在列表显示
},
{
  id: '1-2',
  title: '霜华清影',  // 标题与封面相同
  category: '清冷风',
  imageUrl: getCosUrl('portfolio/qingleng-1-2.jpg'),
  likes: 124,
  seriesId: 'series-shuanghua'  // 👈 相同的系列ID
  // 不设置 isSeriesCover，只在详情页显示
},
{
  id: '1-3',
  title: '霜华清影',
  category: '清冷风',
  imageUrl: getCosUrl('portfolio/qingleng-1-3.jpg'),
  likes: 124,
  seriesId: 'series-shuanghua'
}
```

### 步骤 3: 单张作品配置

不是系列的作品，不需要 `seriesId`：

```typescript
{
  id: '2',
  title: '雪落长安',
  category: '清冷风',
  imageUrl: getCosUrl('portfolio/qingleng-2.jpg'),
  likes: 210
  // 没有 seriesId，点击直接预览图片
}
```

---

## 🎨 效果说明

### 作品集列表
- 系列作品：显示封面 + "系列"标识
- 单张作品：正常显示

### 点击行为
- 系列作品：跳转到系列详情页，查看所有照片
- 单张作品：直接预览图片

### 系列详情页
- 显示系列标题和分类
- 显示照片总数
- 大图展示所有照片
- 点击可预览

---

## 📋 配置示例

### 示例 1: 3张照片的系列

```typescript
// 封面
{
  id: 'mingzhi-series-1',
  title: '明月照华裳',
  category: '明制',
  imageUrl: getCosUrl('portfolio/mingzhi-series-1.jpg'),
  likes: 200,
  seriesId: 'series-mingyue',
  isSeriesCover: true
},
// 第2张
{
  id: 'mingzhi-series-1-2',
  title: '明月照华裳',
  category: '明制',
  imageUrl: getCosUrl('portfolio/mingzhi-series-1-2.jpg'),
  likes: 200,
  seriesId: 'series-mingyue'
},
// 第3张
{
  id: 'mingzhi-series-1-3',
  title: '明月照华裳',
  category: '明制',
  imageUrl: getCosUrl('portfolio/mingzhi-series-1-3.jpg'),
  likes: 200,
  seriesId: 'series-mingyue'
}
```

### 示例 2: 混合配置

```typescript
// 系列作品
{
  id: '1',
  title: '霜华清影',
  category: '清冷风',
  imageUrl: getCosUrl('portfolio/qingleng-1.jpg'),
  likes: 124,
  seriesId: 'series-shuanghua',
  isSeriesCover: true
},
{
  id: '1-2',
  title: '霜华清影',
  category: '清冷风',
  imageUrl: getCosUrl('portfolio/qingleng-1-2.jpg'),
  likes: 124,
  seriesId: 'series-shuanghua'
},

// 单张作品
{
  id: '2',
  title: '雪落长安',
  category: '清冷风',
  imageUrl: getCosUrl('portfolio/qingleng-2.jpg'),
  likes: 210
},

// 另一个系列
{
  id: '3',
  title: '剑气如虹',
  category: '武侠',
  imageUrl: getCosUrl('portfolio/wuxia-1.jpg'),
  likes: 89,
  seriesId: 'series-jianqi',
  isSeriesCover: true
},
{
  id: '3-2',
  title: '剑气如虹',
  category: '武侠',
  imageUrl: getCosUrl('portfolio/wuxia-1-2.jpg'),
  likes: 89,
  seriesId: 'series-jianqi'
}
```

---

## ⚠️ 注意事项

1. **seriesId 必须唯一**：每个系列使用不同的 ID
2. **只有一张封面**：每个系列只能有一个 `isSeriesCover: true`
3. **标题保持一致**：同一系列的所有照片使用相同标题
4. **点赞数相同**：系列中的照片通常使用相同的点赞数

---

## 🔧 常见问题

**Q: 如何删除系列功能？**
A: 删除照片配置中的 `seriesId` 和 `isSeriesCover` 字段即可

**Q: 一个系列最多几张照片？**
A: 没有限制，建议 3-10 张

**Q: 可以修改系列标识的图标吗？**
A: 可以，修改 `portfolio.wxml` 中的 `series-icon` 内容

**Q: 系列详情页可以自定义吗？**
A: 可以，修改 `pages/series/series.wxml` 和 `series.wxss`
