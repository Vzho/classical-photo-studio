// 常量配置
export const CATEGORIES = ['全部', '清冷风', '明制', '武侠', '油画风', '清汉女'] as const

export type Category = typeof CATEGORIES[number]

// 摄影师信息
export const PHOTOGRAPHER = {
  name: '顾清欢 (Cyan)',
  title: '寻觅浮生一刹 · 资深古风旅拍师',
  location: '旅居成都 / 定制全国',
  avatar: 'avatar/photographer.jpg', // COS路径
  stats: [
    { value: '10+', label: '年摄影经验' },
    { value: '500+', label: '交付客片' },
    { value: '99%', label: '好评率' }
  ],
  bio: '十年前初见汉服，惊艳于罗裳之美。从业以来，始终坚持"人景合一"的创作理念。不满足于千篇一律的背景板，更倾向于通过叙事感的光影，挖掘每个人独特的古典气质。擅长捕捉那些不经意间流露的清冷与温柔。',
  skills: ['电影质感', '情绪人像', '妆造指导', '场景还原', '精致后期'],
  contact: {
    wechat: 'cyan_vision_studio',
    email: 'cyan.photo@outlook.com'
  }
}

// 拍摄风格选项
export const STYLE_OPTIONS = ['清冷风', '明制', '武侠', '油画风', '清汉女']
