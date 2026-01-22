# 📐 横竖版照片布局解决方案

## 当前方案：自适应高度

已优化样式，支持横竖版混合：
- 使用 `mode="aspectFill"` 自动裁剪适配
- 设置最小高度 400rpx，最大高度 600rpx
- 图片会自动居中裁剪，保持美观

---

## 🎨 三种布局方案对比

### 方案一：固定比例（当前使用）✅
**优点：**
- 布局整齐统一
- 加载速度快
- 适合快速浏览

**缺点：**
- 横版照片会被裁剪上下部分
- 竖版照片会被裁剪左右部分

**适用场景：** 作品集展示，追求整齐美观

---

### 方案二：瀑布流布局
**优点：**
- 完整展示照片，不裁剪
- 横竖版都能完美显示
- 视觉效果更丰富

**缺点：**
- 布局不规则
- 加载时可能有跳动

**如何启用：**
1. 打开 `miniprogram/pages/portfolio/portfolio-waterfall.wxss`
2. 复制全部内容
3. 替换 `portfolio.wxss` 中的作品网格部分

---

### 方案三：分类展示
**横版照片单独一行，竖版照片两列**

需要在数据中标记照片方向：
```typescript
{
  id: '1',
  title: '作品标题',
  category: '清冷风',
  imageUrl: getCosUrl('portfolio/photo-1.jpg'),
  likes: 124,
  orientation: 'landscape' // 'landscape' 横版 | 'portrait' 竖版
}
```

---

## 💡 推荐做法

### 1. 统一照片比例（最佳）
在上传前，将所有照片统一处理为竖版 3:4 比例：
- 横版照片：裁剪或添加边框变成竖版
- 竖版照片：保持原样

**工具推荐：**
- 美图秀秀（批量裁剪）
- Photoshop（批量处理）
- 在线工具：https://www.iloveimg.com/crop-image

### 2. 使用瀑布流（推荐）
如果照片比例差异大，使用瀑布流布局最合适。

### 3. 分开展示
- 横版照片：用于横幅、Banner
- 竖版照片：用于作品集

---

## 🔧 切换到瀑布流布局

**步骤：**

1. 打开 `miniprogram/pages/portfolio/portfolio.wxss`

2. 找到 `.portfolio-grid` 部分，替换为：

```css
.portfolio-grid {
  padding: 24rpx;
  column-count: 2;
  column-gap: 24rpx;
}

.portfolio-item {
  break-inside: avoid;
  margin-bottom: 24rpx;
  width: 100%;
}

.item-image-wrap {
  position: relative;
  width: 100%;
  border-radius: 24rpx;
  overflow: hidden;
  background: #f5f5f4;
}

.item-image {
  width: 100%;
  height: auto;
  display: block;
}
```

3. 修改 `portfolio.wxml` 中的 image 标签：

```xml
<image 
  class="item-image" 
  src="{{item.imageUrl}}" 
  mode="widthFix"
  lazy-load 
/>
```

把 `mode="aspectFill"` 改成 `mode="widthFix"`

---

## 📸 照片处理建议

### 横版照片处理
1. **裁剪成竖版**：保留主体，裁掉两侧
2. **添加模糊背景**：保持横版，上下添加模糊背景填充
3. **单独展示**：横版照片用于轮播图或详情页

### 竖版照片处理
1. **保持原样**：竖版最适合作品集展示
2. **统一比例**：建议 3:4 或 2:3

### 批量处理工具
- **美图秀秀**：批量裁剪、添加边框
- **Photoshop**：动作录制批量处理
- **在线工具**：
  - https://www.iloveimg.com
  - https://www.photopea.com

---

## 🎯 最终建议

**如果照片比例差异不大（都是竖版或接近）：**
→ 使用当前方案，简单高效

**如果横竖版混合较多：**
→ 切换到瀑布流布局，完整展示每张照片

**如果追求极致效果：**
→ 统一处理所有照片为 3:4 竖版比例
