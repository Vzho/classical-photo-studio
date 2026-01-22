# 📊 作品管理系统使用指南

## 🎯 管理方式

现在所有作品数据都通过 **JSON 配置文件** 管理，无需修改代码！

**配置文件位置：** `miniprogram/data/portfolio-config.json`

---

## 📝 配置文件结构

```json
{
  "themes": [
    {
      "id": "qingleng",           // 主题ID（拼音）
      "name": "清冷风",            // 主题名称（中文）
      "series": [
        {
          "id": "shuanghua",      // 系列ID（拼音）
          "title": "霜华清影",     // 系列标题
          "likes": 124,           // 点赞数
          "photos": [             // 照片文件名列表
            "qingleng-shuanghua-1.jpg",
            "qingleng-shuanghua-2.jpg",
            "qingleng-shuanghua-3.jpg"
          ]
        }
      ]
    }
  ]
}
```

---

## ✏️ 常见操作

### 1. 添加新主题

在 `themes` 数组中添加：

```json
{
  "id": "hantang",
  "name": "汉唐风韵",
  "series": []
}
```

### 2. 添加新系列

在对应主题的 `series` 数组中添加：

```json
{
  "id": "bingxin",
  "title": "冰心玉骨",
  "likes": 189,
  "photos": [
    "qingleng-bingxin-1.jpg",
    "qingleng-bingxin-2.jpg",
    "qingleng-bingxin-3.jpg",
    "qingleng-bingxin-4.jpg"
  ]
}
```

### 3. 添加/删除照片

直接修改 `photos` 数组：

```json
"photos": [
  "qingleng-shuanghua-1.jpg",
  "qingleng-shuanghua-2.jpg",
  "qingleng-shuanghua-3.jpg",
  "qingleng-shuanghua-4.jpg"  // 新增
]
```

### 4. 修改系列名称

```json
{
  "id": "shuanghua",
  "title": "霜华清影·冬日篇",  // 修改标题
  "likes": 124,
  "photos": [...]
}
```

### 5. 修改点赞数

```json
{
  "id": "shuanghua",
  "title": "霜华清影",
  "likes": 200,  // 修改点赞数
  "photos": [...]
}
```

### 6. 删除系列

直接删除对应的系列对象即可

### 7. 删除主题

直接删除对应的主题对象即可

---

## 📸 照片管理流程

### 完整流程

**1. 准备照片**
- 按命名规范命名：`主题拼音-系列拼音-序号.jpg`
- 例如：`qingleng-shuanghua-1.jpg`

**2. 上传到 COS**
- 登录腾讯云 COS 控制台
- 进入 `portfolio` 文件夹
- 批量上传照片

**3. 更新配置文件**
- 打开 `miniprogram/data/portfolio-config.json`
- 在对应系列的 `photos` 数组中添加文件名

**4. 刷新小程序**
- 在微信开发者工具中点击「编译」
- 照片立即生效！

---

## 🔄 快速示例

### 示例 1：添加新系列"月下独酌"（清冷风主题）

**步骤 1：上传照片到 COS**
```
portfolio/qingleng-yuexi-1.jpg
portfolio/qingleng-yuexi-2.jpg
portfolio/qingleng-yuexi-3.jpg
```

**步骤 2：修改配置文件**

找到清冷风主题，在 `series` 数组末尾添加：

```json
{
  "id": "qingleng",
  "name": "清冷风",
  "series": [
    {
      "id": "shuanghua",
      "title": "霜华清影",
      "likes": 124,
      "photos": [...]
    },
    {
      "id": "xueluo",
      "title": "雪落长安",
      "likes": 210,
      "photos": [...]
    },
    {
      "id": "yuexi",              // 新增
      "title": "月下独酌",
      "likes": 150,
      "photos": [
        "qingleng-yuexi-1.jpg",
        "qingleng-yuexi-2.jpg",
        "qingleng-yuexi-3.jpg"
      ]
    }
  ]
}
```

**完成！** 刷新小程序即可看到新系列。

---

### 示例 2：给"霜华清影"系列添加第4张照片

**步骤 1：上传照片**
```
portfolio/qingleng-shuanghua-4.jpg
```

**步骤 2：修改配置**

```json
{
  "id": "shuanghua",
  "title": "霜华清影",
  "likes": 124,
  "photos": [
    "qingleng-shuanghua-1.jpg",
    "qingleng-shuanghua-2.jpg",
    "qingleng-shuanghua-3.jpg",
    "qingleng-shuanghua-4.jpg"  // 新增
  ]
}
```

---

### 示例 3：添加新主题"汉唐风韵"

```json
{
  "themes": [
    {
      "id": "qingleng",
      "name": "清冷风",
      "series": [...]
    },
    {
      "id": "hantang",           // 新主题
      "name": "汉唐风韵",
      "series": [
        {
          "id": "shengtang",
          "title": "盛唐遗韵",
          "likes": 200,
          "photos": [
            "hantang-shengtang-1.jpg",
            "hantang-shengtang-2.jpg",
            "hantang-shengtang-3.jpg"
          ]
        }
      ]
    }
  ]
}
```

**别忘了：** 同时更新 `miniprogram/utils/constants.ts` 中的 `CATEGORIES` 数组：

```typescript
export const CATEGORIES = ['全部', '清冷风', '明制', '武侠', '油画风', '清汉女', '汉唐风韵'] as const
```

---

## 📋 当前配置总览

| 主题 | 系列数 | 照片总数 |
|------|--------|----------|
| 清冷风 | 3 | 10 |
| 明制 | 2 | 8 |
| 武侠 | 2 | 7 |
| 油画风 | 2 | 7 |
| 清汉女 | 2 | 8 |
| **总计** | **11** | **40** |

---

## ⚠️ 注意事项

### 1. JSON 格式要求
- 严格遵守 JSON 语法
- 最后一项不要加逗号
- 使用双引号，不要用单引号
- 可以使用在线工具验证：https://jsonlint.com

### 2. 照片文件名
- 必须与 COS 中的实际文件名完全一致
- 区分大小写
- 建议使用小写字母和连字符

### 3. ID 命名规范
- 使用拼音或英文
- 小写字母
- 不要有空格和特殊字符
- 同一主题/系列的 ID 必须唯一

### 4. 修改后测试
- 修改配置文件后，在微信开发者工具中点击「编译」
- 检查控制台是否有报错
- 测试各个主题和系列是否正常显示

---

## 🛠️ 故障排查

**Q: 修改配置后照片不显示？**
A: 
1. 检查 JSON 格式是否正确
2. 检查文件名是否与 COS 中一致
3. 清除缓存后重新编译

**Q: 新增主题后筛选不显示？**
A: 需要同时更新 `constants.ts` 中的 `CATEGORIES` 数组

**Q: 照片顺序错乱？**
A: 照片按 `photos` 数组中的顺序显示，调整数组顺序即可

---

## 💡 最佳实践

1. **备份配置文件**：修改前先备份
2. **批量操作**：一次性添加多个系列，减少修改次数
3. **命名规范**：严格遵守命名规范，便于管理
4. **测试验证**：每次修改后都要测试
5. **版本控制**：使用 Git 管理配置文件变更

---

## 🚀 高级功能（未来扩展）

可以考虑开发：
1. **可视化管理后台**：网页界面管理配置
2. **批量导入工具**：Excel 导入配置
3. **自动生成配置**：扫描 COS 自动生成配置
4. **配置校验工具**：自动检查配置错误
