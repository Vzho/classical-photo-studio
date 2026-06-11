// 常量配置
// 作品集分类由配置数据动态生成，这里只保留默认项。
export type Category = string

export const CATEGORIES: Category[] = ['全部']

// 摄影师信息
export const PHOTOGRAPHER = {
  name: '摄影师名称',
  title: '摄影师简介标题',
  location: '所在城市 / 服务范围',
  avatar: 'avatar/photographer.jpg', // COS路径
  stats: [
    { value: '0+', label: '年摄影经验' },
    { value: '0+', label: '交付客片' },
    { value: '0%', label: '好评率' }
  ],
  bio: '这里填写摄影师介绍、拍摄理念和服务特色。',
  skills: ['作品展示', '拍摄服务', '后期修图', '预约咨询'],
  contact: {
    wechat: 'YOUR_WECHAT_ID',
    email: 'your-email@example.com'
  },
  studio: {
    name: '门店名称',
    address: '门店地址',
    latitude: null,
    longitude: null
  }
}

// 拍摄风格选项
export const STYLE_OPTIONS = ['写真', '古风', '婚纱', '亲子', '商业']
