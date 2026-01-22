# 🎨 主题-系列-照片 三级结构指南

## 📊 结构说明

```
主题（清冷风）
  ├── 系列1（霜华清影）
  │     ├── 照片1
  │     ├── 照片2
  │     └── 照片3
  ├── 系列2（雪落长安）
  │     ├── 照片1
  │     ├── 照片2
  │     ├── 照片3
  │     └── 照片4
  └── 系列3（寒梅傲雪）
        ├── 照片1
        ├── 照片2
        └── 照片3
```

---

## 🎯 当前配置

### 清冷风主题（3个系列）
1. **霜华清影** - 3张照片
2. **雪落长安** - 4张照片
3. **寒梅傲雪** - 3张照片

### 明制主题（2个系列）
1. **明月照华裳** - 5张照片
2. **锦绣山河** - 3张照片

### 武侠主题（2个系列）
1. **剑气如虹** - 4张照片
2. **江湖夜雨** - 3张照片

### 油画风主题（2个系列）
1. **油彩流光** - 4张照片
2. **印象派之梦** - 3张照片

### 清汉女主题（2个系列）
1. **汉韵清风** - 5张照片
2. **曲裾深衣** - 3张照片

**总计：** 5个主题，11个系列，40张照片

---

## 📸 照片命名规范

### 格式
```
主题拼音-系列拼音-序号.jpg
```

### 示例

**清冷风 - 霜华清影系列：**
```
portfolio/qingleng-shuanghua-1.jpg  # 封面
portfolio/qingleng-shuanghua-2.jpg
portfolio/qingleng-shuanghua-3.jpg
```

**明制 - 明月照华裳系列：**
```
portfolio/mingzhi-mingyue-1.jpg  # 封面
portfolio/mingzhi-mingyue-2.jpg
portfolio/mingzhi-mingyue-3.jpg
portfolio/mingzhi-mingyue-4.jpg
portfolio/mingzhi-mingyue-5.jpg
```

**武侠 - 剑气如虹系列：**
```
portfolio/wuxia-jianqi-1.jpg  # 封面
portfolio/wuxia-jianqi-2.jpg
portfolio/wuxia-jianqi-3.jpg
portfolio/wuxia-jianqi-4.jpg
```

---

## 📋 完整照片清单

### 清冷风（10张）
- [ ] qingleng-shuanghua-1.jpg ~ 3.jpg（霜华清影）
- [ ] qingleng-xueluo-1.jpg ~ 4.jpg（雪落长安）
- [ ] qingleng-hanmei-1.jpg ~ 3.jpg（寒梅傲雪）

### 明制（8张）
- [ ] mingzhi-mingyue-1.jpg ~ 5.jpg（明月照华裳）
- [ ] mingzhi-jinxiu-1.jpg ~ 3.jpg（锦绣山河）

### 武侠（7张）
- [ ] wuxia-jianqi-1.jpg ~ 4.jpg（剑气如虹）
- [ ] wuxia-jianghu-1.jpg ~ 3.jpg（江湖夜雨）

### 油画风（7张）
- [ ] youhua-liuguang-1.jpg ~ 4.jpg（油彩流光）
- [ ] youhua-yinxiang-1.jpg ~ 3.jpg（印象派之梦）

### 清汉女（8张）
- [ ] qinghan-hanyun-1.jpg ~ 5.jpg（汉韵清风）
- [ ] qinghan-quju-1.jpg ~ 3.jpg（曲裾深衣）

---

## 🎨 用户体验流程

### 1. 首页作品集
- 显示所有主题的系列封面（11个）
- 每个卡片显示：系列名称、主题分类、"系列"标识、照片数量

### 2. 点击主题筛选（如"清冷风"）
- 只显示清冷风主题下的3个系列封面
- 霜华清影（3张）
- 雪落长安（4张）
- 寒梅傲雪（3张）

### 3. 点击系列封面
- 跳转到系列详情页
- 大图展示该系列的所有照片
- 可以左右滑动或点击预览

---

## 🔧 如何添加新系列

### 示例：在"清冷风"主题下添加"冰心玉骨"系列（4张照片）

**步骤 1：上传照片到 COS**
```
portfolio/qingleng-bingxin-1.jpg
portfolio/qingleng-bingxin-2.jpg
portfolio/qingleng-bingxin-3.jpg
portfolio/qingleng-bingxin-4.jpg
```

**步骤 2：修改 `miniprogram/utils/cos.ts`**

在"清冷风主题"部分添加：

```typescript
// 【系列4：冰心玉骨】4张照片
{
  id: 'qingleng-bingxin-1',
  title: '冰心玉骨',
  category: '清冷风',
  imageUrl: getCosUrl('portfolio/qingleng-bingxin-1.jpg'),
  likes: 189,
  seriesId: 'series-qingleng-bingxin',
  isSeriesCover: true,
  photoCount: 4
},
{
  id: 'qingleng-bingxin-2',
  title: '冰心玉骨',
  category: '清冷风',
  imageUrl: getCosUrl('portfolio/qingleng-bingxin-2.jpg'),
  likes: 189,
  seriesId: 'series-qingleng-bingxin'
},
{
  id: 'qingleng-bingxin-3',
  title: '冰心玉骨',
  category: '清冷风',
  imageUrl: getCosUrl('portfolio/qingleng-bingxin-3.jpg'),
  likes: 189,
  seriesId: 'series-qingleng-bingxin'
},
{
  id: 'qingleng-bingxin-4',
  title: '冰心玉骨',
  category: '清冷风',
  imageUrl: getCosUrl('portfolio/qingleng-bingxin-4.jpg'),
  likes: 189,
  seriesId: 'series-qingleng-bingxin'
}
```

**关键字段说明：**
- `id`: 唯一标识，格式：主题-系列-序号
- `title`: 系列名称（同一系列保持一致）
- `category`: 主题名称（清冷风/明制/武侠/油画风/清汉女）
- `seriesId`: 系列ID，格式：series-主题-系列
- `isSeriesCover: true`: 只在第一张照片设置，标记为封面
- `photoCount`: 只在封面设置，表示系列包含的照片总数

---

## 💡 最佳实践

### 系列命名建议
- 使用诗意、有意境的名称
- 与主题风格相符
- 简短易记（2-5个字）

### 照片数量建议
- 最少：3张
- 推荐：3-5张
- 最多：不超过10张

### 系列规划
- 每个主题建议 2-4 个系列
- 保持各主题系列数量相对均衡
- 优先展示最佳作品作为封面

---

## 📊 当前统计

| 主题 | 系列数 | 照片总数 |
|------|--------|----------|
| 清冷风 | 3 | 10 |
| 明制 | 2 | 8 |
| 武侠 | 2 | 7 |
| 油画风 | 2 | 7 |
| 清汉女 | 2 | 8 |
| **总计** | **11** | **40** |
