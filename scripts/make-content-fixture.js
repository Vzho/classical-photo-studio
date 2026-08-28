// 一次性工具：在 default-v25 骨架上注入完整内容，生成 content-rich-v25 fixture。
// 用法：node scripts/make-content-fixture.js
const fs = require('fs')
const path = require('path')

const DIR = path.resolve(__dirname, '../tests/fixtures/v25')
const base = JSON.parse(fs.readFileSync(path.join(DIR, 'default-v25.json'), 'utf-8'))

base.themes = [
  {
    id: 'gufeng',
    name: '古风写真',
    enabled: true,
    sort: 1,
    series: [
      {
        id: 'hanfu',
        title: '汉服正装',
        photos: ['hanfu-01.jpg', 'hanfu-02.jpg', 'hanfu-03.jpg'],
        likes: 128,
        featuredOnHome: true,
        bannerDescription: '青砖黛瓦间的汉服光影',
        description: '以正统汉服形制为基础，结合园林实景拍摄。',
        tags: ['汉服', '园林'],
        suitableFor: ['个人写真'],
        relatedPackageIds: ['pkg-classic'],
        relatedPhotographerIds: ['ph-001'],
        sort: 1,
        enabled: true
      },
      {
        id: 'guochao',
        title: '国潮新中式',
        photos: ['guochao-01.jpg', 'guochao-02.jpg'],
        likes: 96,
        featuredOnHome: true,
        bannerDescription: '传统纹样与现代构图的碰撞',
        description: '新中式国潮风格，强调色彩与张力。',
        tags: ['国潮'],
        sort: 2,
        enabled: true
      }
    ]
  },
  {
    id: 'hunyin',
    name: '婚嫁系列',
    enabled: true,
    sort: 2,
    series: [
      {
        id: 'fengguan',
        title: '凤冠霞帔',
        photos: ['fengguan-01.jpg', 'fengguan-02.jpg', 'fengguan-03.jpg', 'fengguan-04.jpg'],
        likes: 256,
        featuredOnHome: true,
        bannerDescription: '明制婚服的仪式感',
        description: '明制凤冠霞帔婚服全套实拍。',
        tags: ['婚嫁', '明制'],
        relatedPackageIds: ['pkg-premium'],
        sort: 1,
        enabled: true
      }
    ]
  }
]

base.packages = [
  {
    id: 'pkg-classic',
    name: '雅集单人写真',
    price: 1299,
    description: '单人古风写真，含 1 套服装 20 张精修。',
    features: ['服装 1 套', '精修 20 张', '底片全送'],
    sort: 1,
    enabled: true
  },
  {
    id: 'pkg-premium',
    name: '凤冠霞帔婚嫁礼',
    price: 3999,
    description: '双人婚嫁套系，含 3 套服装 60 张精修。',
    features: ['服装 3 套', '精修 60 张', '相册一本'],
    sort: 2,
    enabled: true
  }
]

base.photographers = [
  {
    id: 'ph-001',
    name: '沈青梧',
    title: '首席摄影师',
    avatar: 'https://example-cdn/avatar-qingwu.jpg',
    bio: '十年古风摄影经验，擅长园林人像。',
    skills: ['汉服', '园林'],
    sort: 1,
    enabled: true
  },
  {
    id: 'ph-002',
    name: '陆晚棠',
    title: '资深摄影师',
    avatar: 'https://example-cdn/avatar-wantang.jpg',
    bio: '专注婚嫁纪实与工笔风格。',
    skills: ['婚嫁'],
    sort: 2,
    enabled: true
  }
]

base.testimonials = [
  { id: 'tst-1', author: '林小姐', content: '妆造非常细致，出片氛围感很强。', rating: 5, sort: 1, enabled: true },
  { id: 'tst-2', author: '陈先生', content: '婚照全程服务贴心，家人都很满意。', rating: 5, sort: 2, enabled: true }
]

base.stores = [
  {
    id: 'store-main',
    name: '云裳古风摄影·总店',
    address: '杭州市西湖区文三路 100 号',
    latitude: 30.2741,
    longitude: 120.1551,
    phone: '0571-88886666',
    sort: 1,
    enabled: true
  }
]

base.serviceFlow = {
  enabled: true,
  steps: [
    { title: '线上咨询', description: '沟通风格与档期' },
    { title: '到店妆造', description: '专业妆造与服装' },
    { title: '实景拍摄', description: '园林或棚内拍摄' },
    { title: '选片精修', description: '7 天交付精修' }
  ]
}

base.consultation = {
  enabled: true,
  title: '预约咨询',
  description: '留下联系方式，顾问将在 24 小时内回复。'
}
base.consultButton = { enabled: true, text: '立即咨询' }

fs.writeFileSync(path.join(DIR, 'content-rich-v25.json'), JSON.stringify(base, null, 2) + '\n', 'utf-8')
console.log('fixture written:', path.join(DIR, 'content-rich-v25.json'))
