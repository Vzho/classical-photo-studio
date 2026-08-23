// 配置
const CONFIG = {
  // 始终连接当前打开的后台，避免端口变化时误读另一套 COS 配置。
  apiUrl: '/api',
  // 腾讯云 COS 配置
  cos: {
    BaseUrl: ''
  }
}

// 全局状态
let portfolioData = { themes: [] }
let currentTheme = null
let currentSeries = null
let currentEditSeriesIndex = -1
let selectedFiles = []
let nextSelectedFileId = 1
let uploadTasks = []
let uploadPollTimer = null
let contentAssetUploadTarget = null
let configDiagnostics = null
let deletionInProgress = false
let decorationEditorState = null
let themeEditorOriginalState = null
let activeIconTargetKey = ''
let activeSkinPreviewPage = 'home'
let skinPreviewQuickJumpOpen = false
let themeSearchQuery = ''
let themeStatusFilter = 'all'
let themeReorderInProgress = false
const expandedSeriesKeys = new Set()
const UI_CONFIG = {
  maxVisiblePhotos: 8,
  photoThumbSize: 120
}
const DEFAULT_HOME_BANNER = {
  logoText: '摄影作品合集',
  tagText: '精选作品',
  description: '展示摄影作品、服务风格和预约入口。'
}
const DEFAULT_SHARE_CONFIG = {
  title: '妆造作品合集',
  imagePath: ''
}
const PROFILE_STAT_FIELDS = [
  { inputId: 'profileStatExperience', label: '摄影经验', fallbackValue: '0+' },
  { inputId: 'profileStatClients', label: '交付客片', fallbackValue: '0+' },
  { inputId: 'profileStatRating', label: '好评率', fallbackValue: '0%' }
]
const CONFIGURABLE_ICONS = [
  { name: 'briefcase-business', label: '服务套餐' },
  { name: 'calendar-days', label: '日历日期' },
  { name: 'camera', label: '相机' },
  { name: 'circle-check', label: '确认' },
  { name: 'clock-3', label: '时间' },
  { name: 'heart', label: '喜欢' },
  { name: 'image', label: '单张图片' },
  { name: 'images', label: '作品集' },
  { name: 'mail', label: '邮箱' },
  { name: 'map-pin', label: '位置' },
  { name: 'message-circle', label: '微信沟通' },
  { name: 'message-square', label: '留言' },
  { name: 'navigation', label: '快捷入口' },
  { name: 'palette', label: '风格' },
  { name: 'phone', label: '电话' },
  { name: 'sparkles', label: '精选' },
  { name: 'user-round', label: '个人资料' }
]
const CONFIGURABLE_ICON_NAMES = new Set(CONFIGURABLE_ICONS.map(item => item.name))
// CMS 配置缺失时的兜底值；真实客户配置通过“预约设置”保存到 booking.styleOptions。
const FALLBACK_BOOKING_CONFIG = {
  styleOptions: ['写真', '古风', '婚纱', '亲子', '商业']
}

const DEFAULT_CONSULTATION_TEMPLATE = `你好，我想咨询拍摄：

称呼：{{name}}
联系方式：{{contact}}
拍摄风格：{{style}}
意向套餐：{{package}}
期望日期：{{date}}
门店：{{store}}
摄影师：{{photographer}}
备注：{{note}}

我是在小程序中看到作品后联系你的，想进一步确认档期和拍摄方案。`

function createDecorationSection(type, title = '', subtitle = '', actionText = '', variant = 'default') {
  return {
    id: type,
    type,
    enabled: true,
    icon: '',
    title,
    subtitle,
    actionText,
    variant
  }
}

function createBookingField(id, label, placeholder, icon, required = false) {
  return {
    id,
    enabled: true,
    required,
    label,
    placeholder,
    icon
  }
}

const DEFAULT_DECORATION_CONFIG = {
  terminology: {
    workLabel: '作品',
    packageLabel: '套餐',
    consultationLabel: '咨询',
    professionalLabel: '摄影师',
    serviceLabel: '拍摄',
    customerServiceLabel: '客服'
  },
  navigation: {
    portfolioText: '作品集',
    aboutText: '简介',
    bookingText: '咨询',
    style: 'line'
  },
  icons: {
    navigation: {
      portfolio: 'images',
      about: 'user-round',
      booking: 'calendar-days'
    },
    quickJump: {
      trigger: 'navigation',
      portfolio: 'images',
      booking: 'calendar-days'
    },
    contact: {
      wechat: 'message-circle',
      email: 'mail',
      location: 'map-pin',
      phone: 'phone'
    }
  },
  home: {
    heroVariant: 'editorial',
    galleryVariant: 'editorial',
    galleryColumns: 2,
    imageRatio: 'portrait',
    sections: [
      createDecorationSection('hero'),
      createDecorationSection('categories'),
      createDecorationSection('portfolio', '作品精选', '点击作品，查看完整系列'),
      createDecorationSection('packages', '拍摄方案', '先了解服务内容，再选择适合你的方案', '查看全部', 'strip'),
      createDecorationSection('schedule', '近期档期', '', '咨询档期', 'notice'),
      createDecorationSection('testimonials', '客户反馈', '', '', 'quotes'),
      createDecorationSection('serviceFlow', '服务流程', '从沟通到交付，每一步都清晰', '', 'steps')
    ]
  },
  about: {
    headerVariant: 'editorial',
    sections: [
      createDecorationSection('profile'),
      createDecorationSection('bio', '关于我们'),
      createDecorationSection('skills', '擅长风格'),
      createDecorationSection('contact', '联系门店'),
      createDecorationSection('stores', '门店信息'),
      createDecorationSection('team', '服务团队'),
      createDecorationSection('packages', '服务价格', '', '咨询'),
      createDecorationSection('serviceFlow', '服务流程'),
      createDecorationSection('faq', '常见问题'),
      createDecorationSection('testimonials', '客户评价')
    ]
  },
  booking: {
    headerVariant: 'editorial',
    formVariant: 'lines',
    sections: [
      createDecorationSection('hero'),
      createDecorationSection('notice', '预约说明'),
      createDecorationSection('schedule', '近期档期'),
      createDecorationSection('form', '告诉我们你的拍摄需求', '填写后会生成一段咨询内容，不会自动提交个人信息', '生成咨询内容'),
      createDecorationSection('serviceFlow', '服务流程'),
      createDecorationSection('faq', '常见问题')
    ],
    fields: [
      createBookingField('name', '您的称呼', '怎么称呼您？', 'user-round', true),
      createBookingField('contact', '联系方式', '手机号或微信号，方便客服联系您', 'phone', true),
      createBookingField('style', '心仪风格', '请选择风格', 'palette', true),
      createBookingField('package', '意向套餐', '暂不选择套餐', 'briefcase-business'),
      createBookingField('date', '期望拍摄日期', '请选择日期', 'calendar-days', true),
      createBookingField('store', '意向门店', '暂不选择门店', 'map-pin'),
      createBookingField('photographer', '意向摄影师', '暂不选择摄影师', 'camera'),
      createBookingField('notes', '备注说明', '人数、场景、服装、预算或其他需要提前沟通的信息', 'message-square')
    ]
  },
  packages: {
    layoutVariant: 'cards',
    sections: [
      createDecorationSection('header', '服务套餐', '了解价格范围和服务内容，再联系客服确认适合你的方案。'),
      createDecorationSection('schedule', '近期档期'),
      createDecorationSection('list'),
      createDecorationSection('testimonials', '客户评价', '来自真实服务体验的反馈')
    ]
  },
  packageDetail: {
    layoutVariant: 'editorial',
    sections: [
      createDecorationSection('hero', '服务方案'),
      createDecorationSection('info', '套餐信息'),
      createDecorationSection('suitable', '适合'),
      createDecorationSection('includes', '包含服务'),
      createDecorationSection('relatedSeries', '相关作品'),
      createDecorationSection('team', '服务团队'),
      createDecorationSection('testimonials', '客户评价'),
      createDecorationSection('serviceFlow', '服务流程'),
      createDecorationSection('faq', '常见问题')
    ]
  },
  series: {
    galleryVariant: 'immersive',
    sections: [
      createDecorationSection('hero'),
      createDecorationSection('profile'),
      createDecorationSection('gallery'),
      createDecorationSection('packages', '相关套餐'),
      createDecorationSection('team', '服务团队'),
      createDecorationSection('testimonials', '客户评价'),
      createDecorationSection('action', '', '', '咨询同款风格')
    ]
  },
  success: {
    layoutVariant: 'centered',
    sections: [
      createDecorationSection('hero', '咨询内容已生成', '请复制并发送给客服。最终日期和服务方案以双方沟通确认为准。'),
      createDecorationSection('summary', '咨询摘要'),
      createDecorationSection('content', '完整咨询内容'),
      createDecorationSection('contact', '客服微信'),
      createDecorationSection('actions', '', '', '复制咨询内容')
    ]
  }
}

const DEFAULT_V11_CONFIG = {
  configVersion: '2.5.0',
  modules: {
    theme: true,
    packages: true,
    schedule: true,
    testimonials: true,
    photographers: false,
    stores: true,
    serviceFlow: true,
    faq: true,
    consultButton: true,
    quickJump: true
  },
  theme: {
    enabled: true,
    preset: 'minimal',
    brandName: '摄影作品合集',
    primaryColor: '#242321',
    secondaryColor: '#52645B',
    accentColor: '#B18A52',
    backgroundColor: '#F4F2ED',
    surfaceColor: '#FFFFFF',
    surfaceMutedColor: '#ECE9E2',
    textColor: '#242321',
    mutedTextColor: '#706D66',
    dividerColor: '#DEDAD1',
    buttonTextColor: '#FFFFFF',
    cardStyle: 'minimal',
    buttonStyle: 'rounded',
    fontStyle: 'clean',
    headingStyle: 'clean',
    quickJumpStyle: 'solid',
    imageRadius: 'medium',
    layoutDensity: 'comfortable',
    homeLayout: 'portfolio-first',
    showDecorations: true
  },
  decoration: DEFAULT_DECORATION_CONFIG,
  share: {
    ...DEFAULT_SHARE_CONFIG
  },
  packages: [
    {
      id: 'portrait-basic',
      name: '个人写真基础套餐',
      priceText: '¥699 起',
      subtitle: '适合头像、生日纪念、日常写真',
      duration: '约 2 小时',
      retouchCount: '6 张精修',
      originalPhotos: '底片精选交付',
      makeupIncluded: true,
      makeupText: '含基础妆造',
      includes: ['拍摄前沟通', '拍摄指导', '服装搭配建议', '6 张精修', '底片精选交付'],
      suitableFor: ['个人写真', '头像拍摄', '生日纪念'],
      relatedSeriesIds: [],
      relatedPhotographerIds: [],
      isRecommended: true,
      sort: 1,
      enabled: true
    }
  ],
  schedule: {
    enabled: true,
    title: '近期档期',
    notice: '档期仅供参考，具体拍摄时间请与摄影师确认。',
    availableText: '本周还有少量可沟通档期',
    restDays: [],
    busyDates: [],
    specialNotes: ['周末档期较紧张，建议提前沟通']
  },
  testimonials: [
    {
      id: 'review-001',
      name: '客户评价',
      shootType: '个人写真',
      content: '摄影师很会引导，拍摄过程轻松，成片效果很喜欢。',
      imageUrl: '',
      relatedSeriesId: '',
      relatedPackageId: 'portrait-basic',
      dateText: '2026 年 6 月',
      sort: 1,
      enabled: true
    }
  ],
  consultButton: {
    enabled: true,
    text: '咨询拍摄',
    action: 'booking',
    showOnPages: ['portfolio', 'seriesDetail', 'packageDetail', 'about']
  },
  quickJump: {
    enabled: true,
    bookingText: '咨询',
    portfolioText: '作品集'
  },
  homePortfolioCard: {
    showPhotoCount: false,
    showDescription: false,
    showTags: false
  },
  consultation: {
    title: '预约咨询',
    description: '填写信息后可生成咨询内容，发送给摄影师确认档期和方案。',
    template: DEFAULT_CONSULTATION_TEMPLATE,
    privacyTip: '你填写的信息仅用于生成咨询内容，请复制后发送给摄影师确认档期和拍摄方案。'
  },
  serviceFlow: {
    enabled: true,
    steps: [
      { title: '咨询沟通', description: '确认拍摄风格、预算、人数和时间。' },
      { title: '确定方案', description: '根据需求推荐合适套餐和拍摄地点。' },
      { title: '正式拍摄', description: '摄影师现场引导动作和情绪。' },
      { title: '选片修图', description: '拍摄后进行选片和精修交付。' }
    ]
  },
  faq: {
    enabled: true,
    items: [
      { question: '需要提前多久预约咨询？', answer: '建议提前 3-7 天沟通，周末档期建议更早确认。' },
      { question: '不会摆动作怎么办？', answer: '摄影师会在现场进行动作和表情引导。' }
    ]
  },
  photographers: [],
  stores: []
}

const THEME_PRESETS = {
  minimal: {
    commercial: false,
    name: '极简高级',
    description: '克制留白，突出作品和门店质感',
    preset: 'minimal',
    primaryColor: '#242321',
    secondaryColor: '#52645B',
    accentColor: '#B18A52',
    backgroundColor: '#F4F2ED',
    surfaceColor: '#FFFFFF',
    surfaceMutedColor: '#ECE9E2',
    textColor: '#242321',
    mutedTextColor: '#706D66',
    dividerColor: '#DEDAD1',
    buttonTextColor: '#FFFFFF',
    cardStyle: 'minimal',
    buttonStyle: 'rounded',
    fontStyle: 'clean',
    headingStyle: 'clean',
    quickJumpStyle: 'solid',
    imageRadius: 'medium',
    layoutDensity: 'comfortable',
    homeLayout: 'portfolio-first',
    showDecorations: false
  },
  film: {
    commercial: false,
    name: '复古胶片',
    description: '暖调画册感，适合写真与旅拍',
    preset: 'film',
    primaryColor: '#764B38',
    secondaryColor: '#415A4C',
    accentColor: '#C49358',
    backgroundColor: '#F2EADF',
    surfaceColor: '#FFFDF9',
    surfaceMutedColor: '#E8DED0',
    textColor: '#2C2521',
    mutedTextColor: '#786E66',
    dividerColor: '#DCCFC0',
    buttonTextColor: '#FFFFFF',
    cardStyle: 'film',
    buttonStyle: 'rounded',
    fontStyle: 'elegant',
    headingStyle: 'editorial',
    quickJumpStyle: 'soft',
    imageRadius: 'small',
    layoutDensity: 'comfortable',
    homeLayout: 'portfolio-first',
    showDecorations: true
  },
  bridal: {
    commercial: false,
    name: '清透婚纱',
    description: '轻盈柔和，适合婚纱与女性客片',
    preset: 'bridal',
    primaryColor: '#8B5E63',
    secondaryColor: '#586D67',
    accentColor: '#B58B65',
    backgroundColor: '#F7F4F5',
    surfaceColor: '#FFFFFF',
    surfaceMutedColor: '#EEE8EB',
    textColor: '#2F2A2B',
    mutedTextColor: '#766C70',
    dividerColor: '#E3DADD',
    buttonTextColor: '#FFFFFF',
    cardStyle: 'soft',
    buttonStyle: 'pill',
    fontStyle: 'soft',
    headingStyle: 'understated',
    quickJumpStyle: 'soft',
    imageRadius: 'large',
    layoutDensity: 'spacious',
    homeLayout: 'content-first',
    showDecorations: true
  },
  family: {
    commercial: false,
    name: '亲子明快',
    description: '清新亲和，适合亲子与家庭记录',
    preset: 'family',
    primaryColor: '#3E6F62',
    secondaryColor: '#B45F58',
    accentColor: '#C19B3D',
    backgroundColor: '#F4F7F2',
    surfaceColor: '#FFFFFF',
    surfaceMutedColor: '#E6EEE9',
    textColor: '#25332E',
    mutedTextColor: '#65736D',
    dividerColor: '#D7E0DA',
    buttonTextColor: '#FFFFFF',
    cardStyle: 'soft',
    buttonStyle: 'pill',
    fontStyle: 'friendly',
    headingStyle: 'friendly',
    quickJumpStyle: 'solid',
    imageRadius: 'large',
    layoutDensity: 'comfortable',
    homeLayout: 'content-first',
    showDecorations: true
  },
  oriental: {
    commercial: false,
    name: '国风雅致',
    description: '朱砂墨绿，适合汉服与东方美学',
    preset: 'oriental',
    primaryColor: '#7A342E',
    secondaryColor: '#24493E',
    accentColor: '#B58A43',
    backgroundColor: '#F3EFE7',
    surfaceColor: '#FCFBF8',
    surfaceMutedColor: '#E8E0D3',
    textColor: '#28231F',
    mutedTextColor: '#736A60',
    dividerColor: '#DBD1C2',
    buttonTextColor: '#FFFFFF',
    cardStyle: 'minimal',
    buttonStyle: 'rounded',
    fontStyle: 'elegant',
    headingStyle: 'editorial',
    quickJumpStyle: 'outline',
    imageRadius: 'medium',
    layoutDensity: 'spacious',
    homeLayout: 'banner-first',
    showDecorations: true
  },
  luxury: {
    commercial: false,
    name: '华丽古典',
    description: '深红鎏金，适合高端妆造与礼服',
    preset: 'luxury',
    primaryColor: '#692C35',
    secondaryColor: '#263A35',
    accentColor: '#AF8848',
    backgroundColor: '#F4EFE7',
    surfaceColor: '#FFFCF8',
    surfaceMutedColor: '#E9DED1',
    textColor: '#241F1F',
    mutedTextColor: '#746761',
    dividerColor: '#D8C7B7',
    buttonTextColor: '#FFF9F0',
    cardStyle: 'elevated',
    buttonStyle: 'square',
    fontStyle: 'elegant',
    headingStyle: 'ornate',
    quickJumpStyle: 'outline',
    imageRadius: 'small',
    layoutDensity: 'spacious',
    homeLayout: 'banner-first',
    showDecorations: true
  },
  'oriental-premium': {
    commercial: true,
    order: 1,
    code: '东方美学',
    name: '东方高定',
    description: '墨色、朱砂与鎏金，强调人物与东方仪式感',
    preset: 'oriental-premium',
    primaryColor: '#742D36',
    secondaryColor: '#173F38',
    accentColor: '#B6965A',
    backgroundColor: '#F4F2EC',
    surfaceColor: '#FFFDF8',
    surfaceMutedColor: '#E9E4D9',
    textColor: '#1B1C19',
    mutedTextColor: '#69665F',
    dividerColor: '#D8D0C1',
    buttonTextColor: '#FFFDF8',
    cardStyle: 'minimal',
    buttonStyle: 'square',
    fontStyle: 'elegant',
    headingStyle: 'ornate',
    quickJumpStyle: 'outline',
    imageRadius: 'small',
    layoutDensity: 'spacious',
    homeLayout: 'banner-first',
    showDecorations: true
  },
  'editorial-studio': {
    commercial: true,
    order: 2,
    code: '现代视觉',
    name: '时尚画册',
    description: '黑白高对比与杂志编排，适合潮流写真和品牌客片',
    preset: 'editorial-studio',
    primaryColor: '#111111',
    secondaryColor: '#3159D9',
    accentColor: '#D4F238',
    backgroundColor: '#F3F3EF',
    surfaceColor: '#FFFFFF',
    surfaceMutedColor: '#E7E8E2',
    textColor: '#111111',
    mutedTextColor: '#62635F',
    dividerColor: '#D4D5CF',
    buttonTextColor: '#FFFFFF',
    cardStyle: 'minimal',
    buttonStyle: 'square',
    fontStyle: 'clean',
    headingStyle: 'editorial',
    quickJumpStyle: 'solid',
    imageRadius: 'small',
    layoutDensity: 'compact',
    homeLayout: 'portfolio-first',
    showDecorations: true
  },
  'luminous-portrait': {
    commercial: true,
    order: 3,
    code: '自然客片',
    name: '清透客片',
    description: '清爽留白与柔和层次，突出自然肤色和真实体验',
    preset: 'luminous-portrait',
    primaryColor: '#536C61',
    secondaryColor: '#A86572',
    accentColor: '#B89A62',
    backgroundColor: '#F4F7F4',
    surfaceColor: '#FFFFFF',
    surfaceMutedColor: '#E9F0EB',
    textColor: '#26312C',
    mutedTextColor: '#6F7D76',
    dividerColor: '#DCE5DF',
    buttonTextColor: '#FFFFFF',
    cardStyle: 'soft',
    buttonStyle: 'rounded',
    fontStyle: 'soft',
    headingStyle: 'understated',
    quickJumpStyle: 'soft',
    imageRadius: 'large',
    layoutDensity: 'airy',
    homeLayout: 'content-first',
    showDecorations: false
  }
}

const DECORATION_PRESET_VARIANTS = {
  minimal: {
    navigationStyle: 'line',
    homeHero: 'compact',
    homeGallery: 'editorial',
    homeColumns: 2,
    homeRatio: 'portrait',
    aboutHeader: 'minimal',
    bookingHeader: 'compact',
    bookingForm: 'lines',
    packagesLayout: 'list',
    packageDetailLayout: 'compact',
    seriesGallery: 'framed',
    successLayout: 'compact'
  },
  film: {
    navigationStyle: 'quiet',
    homeHero: 'editorial',
    homeGallery: 'masonry',
    homeColumns: 2,
    homeRatio: 'natural',
    aboutHeader: 'editorial',
    bookingHeader: 'editorial',
    bookingForm: 'lines',
    packagesLayout: 'cards',
    packageDetailLayout: 'editorial',
    seriesGallery: 'framed',
    successLayout: 'centered'
  },
  bridal: {
    navigationStyle: 'line',
    homeHero: 'editorial',
    homeGallery: 'cards',
    homeColumns: 2,
    homeRatio: 'portrait',
    aboutHeader: 'portrait',
    bookingHeader: 'image',
    bookingForm: 'soft',
    packagesLayout: 'cards',
    packageDetailLayout: 'editorial',
    seriesGallery: 'framed',
    successLayout: 'centered'
  },
  family: {
    navigationStyle: 'quiet',
    homeHero: 'compact',
    homeGallery: 'cards',
    homeColumns: 2,
    homeRatio: 'square',
    aboutHeader: 'editorial',
    bookingHeader: 'compact',
    bookingForm: 'soft',
    packagesLayout: 'cards',
    packageDetailLayout: 'compact',
    seriesGallery: 'framed',
    successLayout: 'compact'
  },
  oriental: {
    navigationStyle: 'line',
    homeHero: 'immersive',
    homeGallery: 'editorial',
    homeColumns: 2,
    homeRatio: 'portrait',
    aboutHeader: 'portrait',
    bookingHeader: 'image',
    bookingForm: 'lines',
    packagesLayout: 'list',
    packageDetailLayout: 'editorial',
    seriesGallery: 'immersive',
    successLayout: 'centered'
  },
  luxury: {
    navigationStyle: 'line',
    homeHero: 'immersive',
    homeGallery: 'editorial',
    homeColumns: 2,
    homeRatio: 'portrait',
    aboutHeader: 'portrait',
    bookingHeader: 'image',
    bookingForm: 'lines',
    packagesLayout: 'cards',
    packageDetailLayout: 'editorial',
    seriesGallery: 'framed',
    successLayout: 'centered'
  },
  'oriental-premium': {
    navigationStyle: 'line',
    homeHero: 'immersive',
    homeGallery: 'editorial',
    homeColumns: 1,
    homeRatio: 'portrait',
    aboutHeader: 'portrait',
    bookingHeader: 'image',
    bookingForm: 'lines',
    packagesLayout: 'list',
    packageDetailLayout: 'editorial',
    seriesGallery: 'immersive',
    successLayout: 'centered'
  },
  'editorial-studio': {
    navigationStyle: 'line',
    homeHero: 'editorial',
    homeGallery: 'editorial',
    homeColumns: 2,
    homeRatio: 'natural',
    aboutHeader: 'editorial',
    bookingHeader: 'compact',
    bookingForm: 'lines',
    packagesLayout: 'list',
    packageDetailLayout: 'compact',
    seriesGallery: 'immersive',
    successLayout: 'compact'
  },
  'luminous-portrait': {
    navigationStyle: 'quiet',
    homeHero: 'compact',
    homeGallery: 'cards',
    homeColumns: 2,
    homeRatio: 'portrait',
    aboutHeader: 'portrait',
    bookingHeader: 'image',
    bookingForm: 'soft',
    packagesLayout: 'cards',
    packageDetailLayout: 'editorial',
    seriesGallery: 'framed',
    successLayout: 'centered'
  }
}

const DECORATION_SECTION_NAMES = {
  home: {
    hero: '首页首图',
    categories: '作品分类',
    portfolio: '作品列表',
    packages: '拍摄方案',
    schedule: '近期档期',
    testimonials: '客户反馈',
    serviceFlow: '服务流程'
  },
  about: {
    profile: '门店头部资料',
    bio: '品牌介绍',
    skills: '擅长风格',
    contact: '联系方式',
    stores: '门店列表',
    team: '服务团队',
    packages: '服务价格',
    serviceFlow: '服务流程',
    faq: '常见问题',
    testimonials: '客户评价'
  },
  booking: {
    hero: '咨询页首图',
    notice: '预约说明',
    schedule: '近期档期',
    form: '咨询表单',
    serviceFlow: '服务流程',
    faq: '常见问题'
  },
  packages: {
    header: '页面标题',
    schedule: '近期档期',
    list: '套餐列表',
    testimonials: '客户评价'
  },
  packageDetail: {
    hero: '套餐头部',
    info: '套餐信息',
    suitable: '适合人群',
    includes: '包含服务',
    relatedSeries: '相关作品',
    team: '服务团队',
    testimonials: '客户评价',
    serviceFlow: '服务流程',
    faq: '常见问题'
  },
  series: {
    hero: '作品头部',
    profile: '风格资料',
    gallery: '作品图片',
    packages: '相关套餐',
    team: '服务团队',
    testimonials: '客户评价',
    action: '咨询按钮'
  },
  success: {
    hero: '结果页头部',
    summary: '咨询摘要',
    content: '完整内容',
    contact: '客服微信',
    actions: '操作按钮'
  }
}

// 初始化
async function init() {
  await loadRuntimeSettings()
  await loadConfig()
  await syncUploadTasks()
  const initialTheme = portfolioData.themes.find(theme => theme.enabled !== false) || portfolioData.themes[0]
  if (initialTheme) {
    selectTheme(initialTheme)
  } else {
    renderThemeList()
  }
  updateStats()
  setupDragAndDrop()
}

async function loadRuntimeSettings() {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/settings`)
    const result = await response.json()
    const bucket = result?.config?.Bucket
    const region = result?.config?.Region

    if (bucket && region) {
      CONFIG.cos.BaseUrl = `https://${bucket}.cos.${region}.myqcloud.com`
    }
  } catch {
  }
}

// 加载配置文件
async function loadConfig() {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/config`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    portfolioData = await response.json()
    updateAdminBranding()
    await loadConfigDiagnostics(response.headers.get('X-Config-Source'))
  } catch (error) {
    console.error('❌ 加载配置失败:', error)
    showToast('加载配置失败: ' + error.message, 'error')
    portfolioData = { themes: [] }
    updateAdminBranding()
    updateConfigSourceBar()
  }
}

function updateAdminBranding() {
  const configuredBrand = String(
    portfolioData?.theme?.brandName
      || portfolioData?.homeBanner?.logoText
      || ''
  ).trim()
  const workLabel = String(portfolioData?.decoration?.terminology?.workLabel || '作品').trim() || '作品'
  const baseTitle = configuredBrand || workLabel
  const adminTitle = baseTitle.endsWith('管理') ? baseTitle : `${baseTitle}管理`
  const titleElement = document.getElementById('adminTitle')
  const subtitleElement = document.getElementById('adminSubtitle')

  document.title = `${adminTitle}后台`
  if (titleElement) titleElement.textContent = adminTitle
  if (subtitleElement) subtitleElement.textContent = `管理${workLabel}、页面内容和店铺资料`
}

async function loadConfigDiagnostics(sourceFromHeader = '') {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/config-diagnostics`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = await response.json()
    configDiagnostics = {
      ...(result || {}),
      source: result?.source || sourceFromHeader || ''
    }
  } catch {
    configDiagnostics = {
      source: sourceFromHeader || '',
      success: false
    }
  }

  updateConfigSourceBar()
}

function updateConfigSourceBar() {
  const bar = document.getElementById('configSourceBar')
  if (!bar) return

  const main = document.getElementById('configSourceMain')
  const detail = document.getElementById('configSourceDetail')
  const source = configDiagnostics?.source || ''
  const currentData = configDiagnostics?.currentData || {}
  const cosConfig = configDiagnostics?.cos || {}
  const firstLabel = [currentData.firstThemeName, currentData.firstSeriesTitle].filter(Boolean).join(' / ')

  if (!source) {
    bar.style.display = 'none'
    return
  }

  bar.style.display = 'flex'
  bar.classList.toggle('warning', source !== 'cos')

  if (source === 'cos') {
    main.textContent = `当前读取：云端 COS 配置 - ${cosConfig.bucket || '未显示 Bucket'} / ${cosConfig.configKey || 'config/portfolio-config.json'}`
  } else {
    main.textContent = '当前读取：本地兜底配置 - 没有读到云端 config/portfolio-config.json'
  }

  detail.textContent = `${currentData.themeCount || 0} 分类，${currentData.seriesCount || 0} 作品集，${currentData.photoCount || 0} 照片${firstLabel ? `；第一项：${firstLabel}` : ''}`
}

// 保存配置文件
async function saveConfig() {
  try {
    // 所有保存入口统一升级为当前配置结构，避免旧弹窗把装修字段或版本号写回旧格式。
    ensureV11Config()
    const response = await fetch(`${CONFIG.apiUrl}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(portfolioData)
    })

    const result = await response.json()

    if (result.success) {
      updateAdminBranding()
      return true
    } else {
      throw new Error(result.error || '保存失败')
    }
  } catch (error) {
    console.error('❌ 保存失败:', error)
    showToast('保存失败: ' + error.message, 'error')
    return false
  }
}

function getSeriesStateKey(themeId, seriesId) {
  return `${themeId}::${seriesId}`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function parseListInput(value) {
  return String(value || '')
    .split(/\r?\n|[,，]/)
    .map(item => item.trim())
    .filter(Boolean)
}

function listToTextarea(value) {
  return Array.isArray(value) ? value.join('\n') : ''
}

function setOptionalText(target, key, value) {
  const normalized = String(value || '').trim()
  if (normalized) {
    target[key] = normalized
  } else {
    delete target[key]
  }
}

function setOptionalList(target, key, value) {
  const list = parseListInput(value)
  if (list.length) {
    target[key] = list
  } else {
    delete target[key]
  }
}

function createSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function createUniqueId(prefix, label, usedIds = []) {
  const used = new Set(usedIds.filter(Boolean))
  const slug = createSlug(label)
  const fallback = `${prefix}-${Date.now().toString(36)}`
  const base = slug ? `${prefix}-${slug}` : fallback
  let nextId = base
  let counter = 2

  while (used.has(nextId)) {
    nextId = `${base}-${counter}`
    counter += 1
  }

  return nextId
}

function getSeriesPhotos(series) {
  return Array.isArray(series?.photos) ? series.photos : []
}

function getHiddenPhotos(series) {
  return Array.isArray(series?.hiddenPhotos)
    ? series.hiddenPhotos.map(item => String(item || '').trim()).filter(Boolean)
    : []
}

function isPhotoHidden(series, photoName) {
  return getHiddenPhotos(series).includes(photoName)
}

function getVisibleSeriesPhotos(series) {
  const hiddenPhotos = new Set(getHiddenPhotos(series))
  return getSeriesPhotos(series).filter(photoName => !hiddenPhotos.has(photoName))
}

function setPhotoHidden(series, photoName, hidden) {
  const hiddenPhotos = new Set(getHiddenPhotos(series))

  if (hidden) {
    hiddenPhotos.add(photoName)
  } else {
    hiddenPhotos.delete(photoName)
  }

  if (hiddenPhotos.size) {
    series.hiddenPhotos = Array.from(hiddenPhotos)
  } else {
    delete series.hiddenPhotos
  }
}

function getPhotoThumbUrl(photoName, size = UI_CONFIG.photoThumbSize) {
  if (!CONFIG.cos.BaseUrl) {
    return ''
  }

  return `${CONFIG.cos.BaseUrl}/portfolio/${encodeURIComponent(photoName)}?imageMogr2/format/webp/thumbnail/${size}x/quality/75`
}

function getCosAssetUrl(assetPath) {
  if (!CONFIG.cos.BaseUrl || !assetPath) {
    return ''
  }

  const normalizedPath = String(assetPath).replace(/^\/+/, '')
  return `${CONFIG.cos.BaseUrl}/${normalizedPath}`
}

function resetUploadSelection() {
  selectedFiles.forEach(item => {
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl)
    }
  })

  selectedFiles = []
  document.getElementById('previewList').innerHTML = ''
  document.getElementById('uploadSummary').textContent = ''
  document.getElementById('fileInput').value = ''
  document.getElementById('uploadBtn').disabled = true
}

function renderUploadPreview() {
  const previewList = document.getElementById('previewList')
  const uploadSummary = document.getElementById('uploadSummary')

  const totalSize = selectedFiles.reduce((sum, item) => sum + item.file.size, 0)
  uploadSummary.textContent = selectedFiles.length > 0
    ? `已选择 ${selectedFiles.length} 张，共 ${formatFileSize(totalSize)}`
    : ''

  previewList.innerHTML = selectedFiles.map(item => `
    <div class="preview-item">
      <img src="${item.previewUrl}" alt="${escapeHtml(item.file.name)}" loading="lazy">
      <button class="remove-preview" onclick="removeFile(${item.id})">×</button>
    </div>
  `).join('')

  document.getElementById('uploadBtn').disabled = selectedFiles.length === 0
}

function formatFileSize(size) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function getUploadStatusMeta(status) {
  switch (status) {
    case 'queued':
      return { label: '排队中', tone: 'info' }
    case 'running':
      return { label: '上传中', tone: 'info' }
    case 'completed':
      return { label: '已完成', tone: 'success' }
    case 'failed':
      return { label: '失败', tone: 'error' }
    default:
      return { label: '未知', tone: 'info' }
  }
}

function renderUploadTasks() {
  const panel = document.getElementById('uploadQueuePanel')
  const list = document.getElementById('uploadQueueList')
  const clearBtn = document.getElementById('clearFinishedUploadsBtn')

  if (!panel || !list) return

  if (uploadTasks.length === 0) {
    panel.style.display = 'none'
    list.innerHTML = ''
    if (clearBtn) clearBtn.disabled = true
    return
  }

  panel.style.display = 'block'
  if (clearBtn) {
    const hasFinishedTasks = uploadTasks.some(task => task.status === 'completed' || task.status === 'failed')
    clearBtn.disabled = !hasFinishedTasks
  }
  list.innerHTML = uploadTasks.map(task => {
    const meta = getUploadStatusMeta(task.status)
    const percent = Number.isFinite(task.progress) ? task.progress : 0
    const progressWidth = Math.max(0, Math.min(100, percent))
    const detail = `${task.completedFiles}/${task.totalFiles} 张 · ${formatFileSize(task.uploadedBytes || 0)} / ${formatFileSize(task.totalBytes || 0)}`

    return `
      <div class="upload-task-card">
        <div class="upload-task-header">
          <div>
            <div class="upload-task-title">${escapeHtml(task.themeName)} / ${escapeHtml(task.seriesTitle)}</div>
            <div class="upload-task-meta">${detail}</div>
          </div>
          <span class="upload-task-badge ${meta.tone}">${meta.label}</span>
        </div>
        <div class="upload-progress-track">
          <div class="upload-progress-bar ${meta.tone}" style="width: ${progressWidth}%"></div>
        </div>
        <div class="upload-task-message">${escapeHtml(task.error || task.message || '')}</div>
      </div>
    `
  }).join('')
}

async function clearFinishedUploads() {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/uploads/finished`, {
      method: 'DELETE'
    })
    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || '清理失败')
    }

    uploadTasks = uploadTasks.filter(task => task.status === 'queued' || task.status === 'running')
    renderUploadTasks()
    updateUploadPolling()
    showToast(`已清理 ${result.clearedCount} 条已结束任务`, 'success')
  } catch (error) {
    console.error('清理上传任务失败:', error)
    showToast('清理上传任务失败: ' + error.message, 'error')
  }
}

function updateUploadPolling() {
  const hasActiveTask = uploadTasks.some(task => task.status === 'queued' || task.status === 'running')

  if (hasActiveTask && !uploadPollTimer) {
    uploadPollTimer = setInterval(() => {
      syncUploadTasks()
    }, 2000)
  }

  if (!hasActiveTask && uploadPollTimer) {
    clearInterval(uploadPollTimer)
    uploadPollTimer = null
  }
}

async function syncUploadTasks({ silent = true } = {}) {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/uploads`)
    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || '获取上传任务失败')
    }

    const previousStatusMap = new Map(uploadTasks.map(task => [task.id, task.status]))
    uploadTasks = result.tasks || []
    renderUploadTasks()
    updateUploadPolling()

    const completedTasks = uploadTasks.filter(task => {
      const previousStatus = previousStatusMap.get(task.id)
      return previousStatus && previousStatus !== 'completed' && task.status === 'completed'
    })

    const failedTasks = uploadTasks.filter(task => {
      const previousStatus = previousStatusMap.get(task.id)
      return previousStatus && previousStatus !== 'failed' && task.status === 'failed'
    })

    if (completedTasks.length > 0) {
      await reloadPortfolioData()
      showToast(`后台上传完成：${completedTasks[0].seriesTitle}`, 'success')
    }

    if (failedTasks.length > 0) {
      showToast(`后台上传失败：${failedTasks[0].seriesTitle}`, 'error')
    }
  } catch (error) {
    console.error('获取上传任务失败:', error)
    if (!silent) {
      showToast('获取上传任务失败: ' + error.message, 'error')
    }
  }
}

async function reloadPortfolioData({ showLoadingToast = false, showSuccessToast = false } = {}) {
  if (showLoadingToast) {
    showToast('刷新中...', 'info')
  }

  await loadConfig()

  const nextTheme = currentTheme
    ? portfolioData.themes.find(theme => theme.id === currentTheme.id)
    : null
  currentTheme = nextTheme || portfolioData.themes.find(theme => theme.enabled !== false) || portfolioData.themes[0] || null

  if (currentTheme) {
    renderSeriesList()
    document.getElementById('currentThemeName').textContent = currentTheme.name
    document.getElementById('addSeriesBtn').style.display = 'block'
  } else {
    document.getElementById('currentThemeName').textContent = '暂无作品分类'
    document.getElementById('addSeriesBtn').style.display = 'none'
    document.getElementById('seriesContainer').innerHTML = '<div class="empty-state"><p>请先新增作品分类</p></div>'
  }

  renderThemeList()
  updateStats()

  if (showSuccessToast) {
    showToast('刷新完成', 'success')
  }
}

// 渲染作品分类列表
function renderThemeList() {
  const themeList = document.getElementById('themeList')
  const normalizedQuery = themeSearchQuery.trim().toLowerCase()
  const filteredThemes = portfolioData.themes.filter(theme => {
    const matchesQuery = !normalizedQuery || String(theme.name || '').toLowerCase().includes(normalizedQuery)
    const matchesStatus = themeStatusFilter === 'all'
      || (themeStatusFilter === 'enabled' && theme.enabled !== false)
      || (themeStatusFilter === 'disabled' && theme.enabled === false)
    return matchesQuery && matchesStatus
  })

  const summary = document.getElementById('themeFilterSummary')
  if (summary) {
    summary.textContent = filteredThemes.length === portfolioData.themes.length
      ? `共 ${portfolioData.themes.length} 个分类`
      : `找到 ${filteredThemes.length} 个，共 ${portfolioData.themes.length} 个分类`
  }

  if (!filteredThemes.length) {
    themeList.innerHTML = '<li class="theme-filter-empty">没有找到符合条件的分类</li>'
    return
  }

  themeList.innerHTML = filteredThemes.map(theme => {
    const displayPosition = portfolioData.themes.indexOf(theme) + 1

    return `
      <li class="theme-item ${currentTheme && currentTheme.id === theme.id ? 'active' : ''} ${theme.enabled === false ? 'is-disabled' : ''}" onclick="selectThemeById('${escapeHtml(theme.id)}')">
        <div class="theme-item-copy">
          <div class="theme-item-title">${escapeHtml(theme.name)}</div>
          <div class="theme-item-meta">
            <span>顺序 ${displayPosition} · ${theme.series.length} 个作品集</span>
            ${theme.enabled === false ? '<span class="status-badge">已下架</span>' : ''}
          </div>
        </div>
        <div class="theme-item-actions">
          <button type="button" class="theme-row-action" onclick="moveThemeByOffset(event, '${escapeHtml(theme.id)}', -1)" title="向前移动" aria-label="向前移动" ${displayPosition === 1 ? 'disabled' : ''}>↑</button>
          <button type="button" class="theme-row-action" onclick="moveThemeByOffset(event, '${escapeHtml(theme.id)}', 1)" title="向后移动" aria-label="向后移动" ${displayPosition === portfolioData.themes.length ? 'disabled' : ''}>↓</button>
          <button type="button" class="theme-row-action" onclick="openEditThemeModalById(event, '${escapeHtml(theme.id)}')" title="编辑分类">编辑</button>
          <button type="button" class="theme-row-action danger" onclick="deleteThemePermanently(event, '${escapeHtml(theme.id)}')" title="永久删除分类">删除</button>
        </div>
      </li>
    `
  }).join('')
}

function normalizeThemePosition(value, fallbackPosition, maxPosition) {
  const normalizedValue = String(value ?? '').trim()
  const parsedPosition = Number.parseInt(normalizedValue, 10)
  const safeMaxPosition = Math.max(Number.parseInt(maxPosition, 10) || 1, 1)
  const safeFallbackPosition = Math.min(Math.max(Number.parseInt(fallbackPosition, 10) || 1, 1), safeMaxPosition)

  if (!normalizedValue || !Number.isFinite(parsedPosition)) {
    return safeFallbackPosition
  }

  return Math.min(Math.max(parsedPosition, 1), safeMaxPosition)
}

function moveArrayItemToPosition(items, sourceIndex, requestedPosition) {
  if (!Array.isArray(items) || sourceIndex < 0 || sourceIndex >= items.length) {
    return sourceIndex
  }

  const targetIndex = normalizeThemePosition(requestedPosition, sourceIndex + 1, items.length) - 1
  if (targetIndex === sourceIndex) {
    return sourceIndex
  }

  const [item] = items.splice(sourceIndex, 1)
  items.splice(targetIndex, 0, item)
  return targetIndex
}

async function moveThemeByOffset(event, themeId, offset) {
  event.stopPropagation()
  if (themeReorderInProgress) return

  const sourceIndex = portfolioData.themes.findIndex(theme => theme.id === themeId)
  const targetIndex = sourceIndex + Number(offset)
  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= portfolioData.themes.length) return

  const previousThemes = portfolioData.themes.slice()
  themeReorderInProgress = true
  moveArrayItemToPosition(portfolioData.themes, sourceIndex, targetIndex + 1)
  renderThemeList()

  const saved = await saveConfig()
  if (!saved) {
    portfolioData.themes = previousThemes
    currentTheme = currentTheme
      ? portfolioData.themes.find(theme => theme.id === currentTheme.id) || null
      : null
    renderThemeList()
    themeReorderInProgress = false
    return
  }

  currentTheme = currentTheme
    ? portfolioData.themes.find(theme => theme.id === currentTheme.id) || null
    : null
  themeReorderInProgress = false
  showToast(offset < 0 ? '分类已向前移动' : '分类已向后移动', 'success')
}

function onThemeFilterChange() {
  themeSearchQuery = document.getElementById('themeSearchInput')?.value || ''
  themeStatusFilter = document.getElementById('themeStatusFilter')?.value || 'all'
  renderThemeList()
}

function selectThemeById(themeId) {
  const theme = portfolioData.themes.find(item => item.id === themeId)
  if (theme) {
    selectTheme(theme)
  }
}

// 选择作品分类
function selectTheme(theme) {
  currentTheme = theme
  renderThemeList()
  renderSeriesList()
  document.getElementById('currentThemeName').textContent = theme.name
  document.getElementById('addSeriesBtn').style.display = 'block'
}

// 渲染作品集列表
function renderSeriesList() {
  const container = document.getElementById('seriesContainer')

  if (!currentTheme || currentTheme.series.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>暂无作品集，点击右上角新增</p>
      </div>
    `
    return
  }

  container.innerHTML = `
    <div class="series-grid">
      ${currentTheme.series.map((series, index) => {
        const seriesKey = getSeriesStateKey(currentTheme.id, series.id)
        const isExpanded = expandedSeriesKeys.has(seriesKey)
        const allPhotos = getSeriesPhotos(series)
        const activePhotoCount = getVisibleSeriesPhotos(series).length
        const visiblePhotos = isExpanded
          ? allPhotos
          : allPhotos.slice(0, UI_CONFIG.maxVisiblePhotos)
        const hasMorePhotos = allPhotos.length > UI_CONFIG.maxVisiblePhotos
        const photosHtml = visiblePhotos.map((photo, photoIndex) => `
      <div class="photo-item ${isPhotoHidden(series, photo) ? 'is-disabled' : ''}">
        <img loading="lazy" decoding="async" src="${getPhotoThumbUrl(photo)}" alt="${escapeHtml(photo)}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'60\\' height=\\'60\\'%3E%3Crect fill=\\'%23f5f5f4\\' width=\\'60\\' height=\\'60\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'%23a8a29e\\' font-size=\\'12\\'%3E?%3C/text%3E%3C/svg%3E'">
        <div class="photo-actions">
          <button type="button" class="photo-action" onclick="togglePhotoVisibility(${index}, ${photoIndex})" title="${isPhotoHidden(series, photo) ? '恢复照片' : '下架照片'}">${isPhotoHidden(series, photo) ? '恢复' : '下架'}</button>
          <button type="button" class="photo-action danger" onclick="deletePhotoPermanently(${index}, ${photoIndex})" title="永久删除照片">删除</button>
        </div>
      </div>
    `).join('')

        return `
    <div class="series-card ${series.enabled === false ? 'is-disabled' : ''}">
      <div class="series-header">
        <div class="series-copy">
          <div class="series-title">${escapeHtml(series.title)}${series.enabled === false ? '<span class="status-badge">已下架</span>' : ''}${series.featuredOnHome ? '<span class="status-badge">首页精选</span>' : ''}</div>
          <div class="series-meta">
            喜欢 ${series.likes} · 展示 ${activePhotoCount} / 共 ${allPhotos.length} 张${series.featuredOnHome && series.homeSort !== undefined ? ` · 首页排序 ${escapeHtml(series.homeSort)}` : ''}
          </div>
          ${series.bannerDescription ? `
            <div class="series-description">
              轮播描述：${escapeHtml(series.bannerDescription)}
            </div>
          ` : ''}
          ${series.description ? `
            <div class="series-description">
              作品集介绍：${escapeHtml(series.description)}
            </div>
          ` : ''}
          ${Array.isArray(series.tags) && series.tags.length ? `
            <div class="series-tags">
              ${series.tags.map(tag => `<span class="series-tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
          ` : ''}
        </div>
        <div class="series-actions">
          <button class="series-action-btn" onclick="openUploadModal(${index})">上传照片</button>
          <button class="series-action-btn" onclick="openEditSeriesModal(${index})">编辑</button>
          <button class="series-action-btn" onclick="toggleSeriesVisibility(${index})">${series.enabled === false ? '恢复' : '下架'}</button>
          <button class="series-action-btn danger" onclick="deleteSeriesPermanently(${index})">删除</button>
        </div>
      </div>
      <div class="photo-list">
        ${photosHtml}
        <button type="button" class="add-photo-btn" onclick="openUploadModal(${index})" title="添加照片"><span>+</span><small>照片</small></button>
      </div>
      ${hasMorePhotos ? `
        <button class="photo-toggle" onclick="toggleSeriesPhotos('${escapeHtml(seriesKey)}')">
          ${isExpanded ? '收起照片' : `展开全部 ${allPhotos.length} 张`}
        </button>
      ` : ''}
    </div>
        `
      }).join('')}
    </div>
  `
}

function toggleSeriesPhotos(seriesKey) {
  if (expandedSeriesKeys.has(seriesKey)) {
    expandedSeriesKeys.delete(seriesKey)
  } else {
    expandedSeriesKeys.add(seriesKey)
  }

  renderSeriesList()
}

// 更新统计
function updateStats() {
  let totalSeries = 0
  let totalPhotos = 0

  portfolioData.themes.forEach(theme => {
    totalSeries += theme.series.length
    theme.series.forEach(series => {
      totalPhotos += series.photos.length
    })
  })

  document.getElementById('themeCount').textContent = portfolioData.themes.length
  document.getElementById('seriesCount').textContent = totalSeries
  document.getElementById('photoCount').textContent = totalPhotos
}


// 打开编辑作品分类弹窗
function openEditThemeModalById(event, themeId) {
  event.stopPropagation()
  const themeIndex = portfolioData.themes.findIndex(t => t.id === themeId)
  const theme = portfolioData.themes[themeIndex]
  if (!theme) return

  document.getElementById('editThemeId').value = theme.id
  document.getElementById('editThemeName').value = theme.name
  const positionInput = document.getElementById('editThemePosition')
  positionInput.value = String(themeIndex + 1)
  positionInput.max = String(portfolioData.themes.length)
  const visibilityBtn = document.getElementById('themeVisibilityBtn')
  if (visibilityBtn) {
    visibilityBtn.textContent = theme.enabled === false ? '恢复分类' : '下架分类'
  }
  openModal('editThemeModal')
}

// 更新作品分类
async function updateTheme() {
  const id = document.getElementById('editThemeId').value
  const name = document.getElementById('editThemeName').value.trim()

  if (!name) {
    showToast('分类名称不能为空', 'error')
    return
  }

  const themeIndex = portfolioData.themes.findIndex(t => t.id === id)
  const theme = portfolioData.themes[themeIndex]
  if (theme) {
    const previousName = theme.name
    const previousPosition = themeIndex + 1
    theme.name = name
    const positionInput = document.getElementById('editThemePosition')
    const requestedPosition = normalizeThemePosition(positionInput.value, themeIndex + 1, portfolioData.themes.length)
    moveArrayItemToPosition(portfolioData.themes, themeIndex, requestedPosition)
    renderThemeList()
    // 如果当前选中的就是这个分类，更新标题
    if (currentTheme && currentTheme.id === id) {
      document.getElementById('currentThemeName').textContent = name
    }
    const saved = await saveConfig()
    if (!saved) {
      theme.name = previousName
      const movedIndex = portfolioData.themes.findIndex(t => t.id === id)
      moveArrayItemToPosition(portfolioData.themes, movedIndex, previousPosition)
      renderThemeList()
      if (currentTheme && currentTheme.id === id) {
        document.getElementById('currentThemeName').textContent = previousName
      }
      return
    }
    closeModal('editThemeModal')
    showToast('分类已更新', 'success')
  }
}

// 下架或恢复当前编辑的作品分类。只改展示状态，不删除 COS 文件。
async function deleteCurrentTheme() {
  const id = document.getElementById('editThemeId').value

  const index = portfolioData.themes.findIndex(t => t.id === id)
  if (index === -1) return

  const theme = portfolioData.themes[index]
  const willRestore = theme.enabled === false

  if (!willRestore && !confirm('确定下架这个分类吗？下架后小程序前台不会显示，但照片文件会保留，可以随时恢复。')) return

  theme.enabled = willRestore ? true : false

  renderThemeList()
  renderSeriesList()
  updateStats()
  await saveConfig()
  closeModal('editThemeModal')
  showToast(willRestore ? '分类已恢复，小程序会重新显示' : '分类已下架，照片没有删除', 'success')
}

async function deleteThemePermanently(event, themeId) {
  event?.stopPropagation()
  const theme = portfolioData.themes.find(item => item.id === themeId)
  if (!theme || deletionInProgress) return

  const seriesCount = Array.isArray(theme.series) ? theme.series.length : 0
  const photoCount = (theme.series || []).reduce((total, series) => total + getSeriesPhotos(series).length, 0)
  const confirmed = confirm(
    `确定永久删除分类“${theme.name}”吗？\n\n将删除其中 ${seriesCount} 个作品集、${photoCount} 张照片，无法恢复。仍被其他分类使用的相同照片文件会保留。`
  )
  if (!confirmed) return

  deletionInProgress = true
  try {
    showToast('正在永久删除分类...', 'info')
    const response = await fetch(`${CONFIG.apiUrl}/portfolio/theme`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeId: theme.id })
    })
    const result = await response.json()
    if (!response.ok || !result.success) {
      throw new Error(result.error || '删除失败')
    }

    if (currentTheme?.id === theme.id) {
      currentTheme = null
      document.getElementById('currentThemeName').textContent = '选择左侧作品分类'
      document.getElementById('addSeriesBtn').style.display = 'none'
      document.getElementById('seriesContainer').innerHTML = `
        <div class="empty-state">
          <p>请先选择左侧作品分类</p>
        </div>
      `
    }

    closeModal('editThemeModal')
    await reloadPortfolioData()
    showToast(result.warning || result.message, result.warning ? 'info' : 'success')
  } catch (error) {
    console.error('永久删除作品分类失败:', error)
    showToast('永久删除作品分类失败: ' + error.message, 'error')
  } finally {
    deletionInProgress = false
  }
}

// 打开编辑作品集弹窗
function openEditSeriesModal(index) {
  currentEditSeriesIndex = index
  const series = currentTheme.series[index]

  document.getElementById('editSeriesId').value = series.id
  document.getElementById('editSeriesTitle').value = series.title
  document.getElementById('editSeriesLikes').value = series.likes
  document.getElementById('editSeriesFeaturedOnHome').checked = Boolean(series.featuredOnHome)
  document.getElementById('editSeriesHomeSort').value = series.homeSort ?? ''
  document.getElementById('editSeriesBannerDescription').value = series.bannerDescription || ''
  document.getElementById('editSeriesDescription').value = series.description || ''
  document.getElementById('editSeriesSuitableFor').value = listToTextarea(series.suitableFor)
  document.getElementById('editSeriesScenes').value = listToTextarea(series.scenes)
  document.getElementById('editSeriesTags').value = listToTextarea(series.tags)
  document.getElementById('editSeriesRelatedPackageIds').value = listToTextarea(series.relatedPackageIds)
  document.getElementById('editSeriesRelatedPhotographerIds').value = listToTextarea(series.relatedPhotographerIds)
  openModal('editSeriesModal')
}

// 更新作品集
async function updateSeries() {
  if (!currentTheme || currentEditSeriesIndex === -1) return

  const title = document.getElementById('editSeriesTitle').value.trim()
  const likes = parseInt(document.getElementById('editSeriesLikes').value) || 0
  const featuredOnHome = document.getElementById('editSeriesFeaturedOnHome').checked
  const homeSort = Number(document.getElementById('editSeriesHomeSort').value)
  const bannerDescription = document.getElementById('editSeriesBannerDescription').value.trim()
  const description = document.getElementById('editSeriesDescription').value.trim()
  const suitableFor = document.getElementById('editSeriesSuitableFor').value
  const scenes = document.getElementById('editSeriesScenes').value
  const tags = document.getElementById('editSeriesTags').value
  const relatedPackageIds = document.getElementById('editSeriesRelatedPackageIds').value
  const relatedPhotographerIds = document.getElementById('editSeriesRelatedPhotographerIds').value

  if (!title) {
    showToast('标题不能为空', 'error')
    return
  }

  const series = currentTheme.series[currentEditSeriesIndex]
  series.title = title
  series.likes = likes
  series.featuredOnHome = featuredOnHome
  if (Number.isFinite(homeSort) && document.getElementById('editSeriesHomeSort').value.trim() !== '') {
    series.homeSort = homeSort
  } else {
    delete series.homeSort
  }
  setOptionalText(series, 'bannerDescription', bannerDescription)
  setOptionalText(series, 'description', description)
  setOptionalList(series, 'suitableFor', suitableFor)
  setOptionalList(series, 'scenes', scenes)
  setOptionalList(series, 'tags', tags)
  setOptionalList(series, 'relatedPackageIds', relatedPackageIds)
  setOptionalList(series, 'relatedPhotographerIds', relatedPhotographerIds)

  renderSeriesList()
  await saveConfig()
  closeModal('editSeriesModal')
  showToast('作品集已更新', 'success')
}

function openAddThemeModal() {
  document.getElementById('themeId').value = ''
  document.getElementById('themeName').value = ''
  const positionInput = document.getElementById('themePosition')
  const lastPosition = portfolioData.themes.length + 1
  positionInput.value = String(lastPosition)
  positionInput.max = String(lastPosition)
  openModal('addThemeModal')
}

// 添加作品分类
async function addTheme() {
  const name = document.getElementById('themeName').value.trim()
  const id = document.getElementById('themeId').value.trim()
    || createUniqueId('theme', name, portfolioData.themes.map(theme => theme.id))

  if (!name) {
    showToast('请填写分类名称', 'error')
    return
  }

  // 检查内部编号是否重复
  if (portfolioData.themes.find(t => t.id === id)) {
    showToast('这个分类名称已存在或过于相似，请换一个名称再试', 'error')
    return
  }

  const newTheme = {
    id,
    name,
    enabled: true,
    series: []
  }
  const requestedPosition = normalizeThemePosition(
    document.getElementById('themePosition').value,
    portfolioData.themes.length + 1,
    portfolioData.themes.length + 1
  )
  portfolioData.themes.splice(requestedPosition - 1, 0, newTheme)

  renderThemeList()
  updateStats()
  const saved = await saveConfig()
  if (!saved) {
    const addedIndex = portfolioData.themes.indexOf(newTheme)
    if (addedIndex >= 0) {
      portfolioData.themes.splice(addedIndex, 1)
    }
    renderThemeList()
    updateStats()
    return
  }

  closeModal('addThemeModal')
  showToast('分类添加成功', 'success')
}

// 打开添加作品集弹窗
function openAddSeriesModal() {
  if (!currentTheme) {
    showToast('请先选择一个作品分类', 'error')
    return
  }

  document.getElementById('seriesId').value = ''
  document.getElementById('seriesTitle').value = ''
  document.getElementById('seriesLikes').value = '100'
  document.getElementById('seriesFeaturedOnHome').checked = false
  document.getElementById('seriesHomeSort').value = ''
  document.getElementById('seriesBannerDescription').value = ''
  document.getElementById('seriesDescription').value = ''
  document.getElementById('seriesSuitableFor').value = ''
  document.getElementById('seriesScenes').value = ''
  document.getElementById('seriesTags').value = ''
  document.getElementById('seriesRelatedPackageIds').value = ''
  document.getElementById('seriesRelatedPhotographerIds').value = ''
  openModal('addSeriesModal')
}

// 添加作品集
function addSeries() {
  if (!currentTheme) return

  const title = document.getElementById('seriesTitle').value.trim()
  const id = document.getElementById('seriesId').value.trim()
    || createUniqueId('series', title, currentTheme.series.map(series => series.id))
  const likes = parseInt(document.getElementById('seriesLikes').value) || 100
  const featuredOnHome = document.getElementById('seriesFeaturedOnHome').checked
  const homeSort = Number(document.getElementById('seriesHomeSort').value)
  const bannerDescription = document.getElementById('seriesBannerDescription').value.trim()
  const description = document.getElementById('seriesDescription').value.trim()
  const suitableFor = document.getElementById('seriesSuitableFor').value
  const scenes = document.getElementById('seriesScenes').value
  const tags = document.getElementById('seriesTags').value
  const relatedPackageIds = document.getElementById('seriesRelatedPackageIds').value
  const relatedPhotographerIds = document.getElementById('seriesRelatedPhotographerIds').value

  if (!title) {
    showToast('请填写作品集名称', 'error')
    return
  }

  // 检查内部编号是否重复
  if (currentTheme.series.find(s => s.id === id)) {
    showToast('这个作品集名称已存在或过于相似，请换一个名称再试', 'error')
    return
  }

  const nextSeries = {
    id,
    title,
    likes,
    featuredOnHome,
    enabled: true,
    photos: []
  }

  if (Number.isFinite(homeSort) && document.getElementById('seriesHomeSort').value.trim() !== '') {
    nextSeries.homeSort = homeSort
  }

  setOptionalText(nextSeries, 'bannerDescription', bannerDescription)
  setOptionalText(nextSeries, 'description', description)
  setOptionalList(nextSeries, 'suitableFor', suitableFor)
  setOptionalList(nextSeries, 'scenes', scenes)
  setOptionalList(nextSeries, 'tags', tags)
  setOptionalList(nextSeries, 'relatedPackageIds', relatedPackageIds)
  setOptionalList(nextSeries, 'relatedPhotographerIds', relatedPhotographerIds)

  currentTheme.series.push(nextSeries)

  renderSeriesList()
  updateStats()
  saveConfig()
  closeModal('addSeriesModal')
  showToast('作品集添加成功', 'success')
}

// 下架或恢复作品集。只改展示状态，不删除 COS 文件。
async function toggleSeriesVisibility(seriesIndex) {
  const series = currentTheme.series[seriesIndex]
  if (!series) return

  const willRestore = series.enabled === false
  if (!willRestore && !confirm('确定下架这个作品集吗？下架后小程序前台不会显示，但照片文件会保留，可以随时恢复。')) return

  series.enabled = willRestore ? true : false
  renderSeriesList()
  updateStats()
  await saveConfig()
  showToast(willRestore ? '作品集已恢复，小程序会重新显示' : '作品集已下架，照片没有删除', 'success')
}

async function deleteSeriesPermanently(seriesIndex) {
  const series = currentTheme?.series?.[seriesIndex]
  if (!series || deletionInProgress) return

  const photoCount = getSeriesPhotos(series).length
  const confirmed = confirm(
    `确定永久删除作品集“${series.title}”吗？\n\n将删除这个作品集及其中 ${photoCount} 张照片，无法恢复。仍被其他作品集使用的相同照片文件会保留。`
  )
  if (!confirmed) return

  deletionInProgress = true
  try {
    showToast('正在永久删除作品集...', 'info')
    const response = await fetch(`${CONFIG.apiUrl}/portfolio/series`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeId: currentTheme.id, seriesId: series.id })
    })
    const result = await response.json()
    if (!response.ok || !result.success) {
      throw new Error(result.error || '删除失败')
    }

    expandedSeriesKeys.delete(getSeriesStateKey(currentTheme.id, series.id))
    await reloadPortfolioData()
    showToast(result.warning || result.message, result.warning ? 'info' : 'success')
  } catch (error) {
    console.error('永久删除作品集失败:', error)
    showToast('永久删除作品集失败: ' + error.message, 'error')
  } finally {
    deletionInProgress = false
  }
}

// 打开上传照片模态框
function openUploadModal(seriesIndex) {
  currentSeries = currentTheme.series[seriesIndex]
  resetUploadSelection()
  openModal('uploadPhotoModal')
}

// 处理文件选择
function handleFileSelect(event) {
  const files = Array.from(event.target.files)
  addFilesToPreview(files)
  event.target.value = ''
}

// 添加文件到预览
function addFilesToPreview(files) {
  files.forEach(file => {
    if (!file.type.startsWith('image/')) {
      showToast('只能上传图片文件', 'error')
      return
    }

    selectedFiles.push({
      id: nextSelectedFileId++,
      file,
      previewUrl: URL.createObjectURL(file)
    })
  })

  renderUploadPreview()
}

// 移除文件
function removeFile(fileId) {
  const target = selectedFiles.find(item => item.id === fileId)
  if (target?.previewUrl) {
    URL.revokeObjectURL(target.previewUrl)
  }

  selectedFiles = selectedFiles.filter(item => item.id !== fileId)
  renderUploadPreview()
}

// 上传照片
async function uploadPhotos() {
  if (!currentSeries || selectedFiles.length === 0) return

  const uploadBtn = document.getElementById('uploadBtn')
  uploadBtn.disabled = true
  uploadBtn.textContent = '提交中...'

  try {
    const formData = new FormData()
    formData.append('themeId', currentTheme.id)
    formData.append('seriesId', currentSeries.id)

    selectedFiles.forEach(item => {
      formData.append('photos', item.file)
    })

    closeModal('uploadPhotoModal')
    showToast('正在提交后台上传任务...', 'info')

    const response = await fetch(`${CONFIG.apiUrl}/upload`, {
      method: 'POST',
      body: formData
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error)
    }

    if (result.task) {
      uploadTasks = [result.task, ...uploadTasks.filter(task => task.id !== result.task.id)]
      renderUploadTasks()
      updateUploadPolling()
      await syncUploadTasks({ silent: true })
    }

    showToast('已加入后台上传队列', 'success')
  } catch (error) {
    console.error('❌ 上传失败:', error)
    showToast('上传失败: ' + error.message, 'error')
  } finally {
    uploadBtn.disabled = false
    uploadBtn.textContent = '上传'
  }
}

// 下架或恢复单张照片。只改展示状态，不删除 COS 文件。
async function togglePhotoVisibility(seriesIndex, photoIndex) {
  const series = currentTheme.series[seriesIndex]
  const photoName = getSeriesPhotos(series)[photoIndex]
  if (!series || !photoName) return

  const willRestore = isPhotoHidden(series, photoName)
  if (!willRestore && !confirm('确定下架这张照片吗？下架后小程序前台不会显示，照片文件会保留，可以随时恢复。')) return

  setPhotoHidden(series, photoName, !willRestore)

  renderSeriesList()
  updateStats()
  await saveConfig()
  showToast(willRestore ? '照片已恢复，小程序会重新显示' : '照片已下架，文件没有删除', 'success')
}

async function deletePhotoPermanently(seriesIndex, photoIndex) {
  const series = currentTheme?.series?.[seriesIndex]
  const photoName = getSeriesPhotos(series)[photoIndex]
  if (!series || !photoName || deletionInProgress) return

  if (!confirm('确定永久删除这张照片吗？\n\n后台记录和 COS 文件都会删除，无法恢复。')) return

  deletionInProgress = true
  try {
    showToast('正在永久删除照片...', 'info')
    const response = await fetch(`${CONFIG.apiUrl}/portfolio/photo`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        themeId: currentTheme.id,
        seriesId: series.id,
        photoName
      })
    })
    const result = await response.json()
    if (!response.ok || !result.success) {
      throw new Error(result.error || '删除失败')
    }

    await reloadPortfolioData()
    showToast(result.warning || result.message, result.warning ? 'info' : 'success')
  } catch (error) {
    console.error('永久删除照片失败:', error)
    showToast('永久删除照片失败: ' + error.message, 'error')
  } finally {
    deletionInProgress = false
  }
}

// 设置拖拽上传
function setupDragAndDrop() {
  const uploadArea = document.getElementById('uploadArea')

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault()
    uploadArea.classList.add('dragover')
  })

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover')
  })

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault()
    uploadArea.classList.remove('dragover')
    const files = Array.from(e.dataTransfer.files)
    addFilesToPreview(files)
  })
}

// 模态框操作
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active')
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active')
  if (modalId === 'uploadPhotoModal') {
    resetUploadSelection()
  }
  if (modalId === 'profileModal') {
    selectedAvatar = null
    const fileInput = document.getElementById('file-profile-avatar')
    const uploadBtn = document.getElementById('btn-upload-profile-avatar')
    if (fileInput) fileInput.value = ''
    if (uploadBtn) uploadBtn.style.display = 'none'
  }
}

// Toast 提示
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast')
  const toastMessage = document.getElementById('toastMessage')

  toastMessage.textContent = message
  toast.className = `toast ${type} show`

  setTimeout(() => {
    toast.classList.remove('show')
  }, 3000)
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', init)

// 刷新数据
async function refreshData() {
  await reloadPortfolioData({ showLoadingToast: true, showSuccessToast: true })
  await syncUploadTasks({ silent: true })
}

function ensureHomeBannerConfig() {
  if (!portfolioData.homeBanner) {
    portfolioData.homeBanner = { ...DEFAULT_HOME_BANNER }
  } else {
    portfolioData.homeBanner = {
      ...DEFAULT_HOME_BANNER,
      ...portfolioData.homeBanner
    }
  }

  return portfolioData.homeBanner
}

function ensureShareConfig() {
  portfolioData.share = {
    ...DEFAULT_SHARE_CONFIG,
    ...(portfolioData.share || {})
  }

  if (!String(portfolioData.share.title || '').trim()) {
    portfolioData.share.title = DEFAULT_SHARE_CONFIG.title
  }

  return portfolioData.share
}

function updateHomeSharePreview(imagePath) {
  const preview = document.getElementById('homeShareImagePreview')
  const empty = document.getElementById('homeShareImageEmpty')
  const value = String(imagePath || '').trim()

  if (!preview || !empty) return

  preview.onload = null
  preview.onerror = null
  preview.removeAttribute('src')
  preview.style.display = 'none'
  empty.style.display = 'flex'
  empty.textContent = value ? '正在加载封面预览...' : '暂未上传，将自动使用精选作品封面'

  if (!value) return

  const imageUrl = /^https?:\/\//i.test(value) ? value : getCosAssetUrl(value)
  if (!imageUrl) {
    empty.textContent = '封面已保存，连接云端后可预览'
    return
  }

  preview.onload = () => {
    preview.style.display = 'block'
    empty.style.display = 'none'
  }
  preview.onerror = () => {
    preview.style.display = 'none'
    empty.style.display = 'flex'
    empty.textContent = '封面暂时无法预览，请检查云端图片'
  }
  preview.src = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}preview=${Date.now()}`
}

function openHomeBannerModal() {
  const banner = ensureHomeBannerConfig()
  const share = ensureShareConfig()

  document.getElementById('homeBannerLogoText').value = banner.logoText || ''
  document.getElementById('homeBannerTagText').value = banner.tagText || ''
  document.getElementById('homeBannerDescription').value = banner.description || ''
  document.getElementById('homeShareTitle').value = share.title || ''
  document.getElementById('homeShareImagePath').value = share.imagePath || ''
  updateHomeSharePreview(share.imagePath)

  openModal('homeBannerModal')
}

async function saveHomeBanner() {
  const banner = ensureHomeBannerConfig()
  const share = ensureShareConfig()
  banner.logoText = document.getElementById('homeBannerLogoText').value.trim()
  banner.tagText = document.getElementById('homeBannerTagText').value.trim()
  banner.description = document.getElementById('homeBannerDescription').value.trim()
  share.title = document.getElementById('homeShareTitle').value.trim()
  share.imagePath = document.getElementById('homeShareImagePath').value.trim()

  if (!banner.logoText || !banner.tagText || !banner.description) {
    showToast('请填写完整的首页轮播文案', 'error')
    return
  }

  if (!share.title) {
    showToast('请填写微信分享标题', 'error')
    return
  }

  const success = await saveConfig()
  if (success) {
    closeModal('homeBannerModal')
    showToast('首页和分享卡片已更新', 'success')
  }
}

function setSelectValue(id, value) {
  const element = document.getElementById(id)
  if (!element) return

  const hasOption = Array.from(element.options || []).some(option => option.value === value)
  element.value = hasOption ? value : (element.options?.[0]?.value || '')
}

function normalizeConfigurableIcon(value, fallback = '', allowEmpty = false) {
  const icon = String(value || '').trim()
  if (allowEmpty && !icon) return ''
  return CONFIGURABLE_ICON_NAMES.has(icon) ? icon : fallback
}

function getIconMeta(name) {
  return CONFIGURABLE_ICONS.find(item => item.name === name) || null
}

function renderIconPickerButton(value, targetKey, allowEmpty = false) {
  const icon = normalizeConfigurableIcon(value, '', allowEmpty)
  const iconMeta = getIconMeta(icon)
  const label = iconMeta?.label || (allowEmpty ? '不显示图标' : '选择图标')
  const preview = icon
    ? `<img src="/mini-icons/${icon}.svg" alt="">`
    : '<span class="icon-picker-empty">无</span>'

  return `
    <button type="button" class="icon-picker-trigger" onclick="openIconPicker('${targetKey}')">
      <span class="icon-picker-preview">${preview}</span>
      <span class="icon-picker-label">${escapeHtml(label)}</span>
      <span class="icon-picker-change">更换</span>
    </button>
  `
}

function getIconTarget(targetKey) {
  const parts = String(targetKey || '').split('.')

  if (parts[0] === 'section') {
    const pageKey = parts[1]
    const index = Number(parts[2])
    const section = decorationEditorState?.[pageKey]?.sections?.[index]
    const fallback = DEFAULT_DECORATION_CONFIG?.[pageKey]?.sections?.find(item => item.type === section?.type)
    if (!section) return null

    return {
      label: `${DECORATION_SECTION_NAMES[pageKey]?.[section.type] || section.type}标题图标`,
      current: section.icon || '',
      defaultValue: fallback?.icon || '',
      allowEmpty: true,
      set(value) {
        section.icon = value
      },
      render() {
        renderDecorationSectionEditor(pageKey)
      }
    }
  }

  if (parts[0] === 'field') {
    const index = Number(parts[1])
    const field = decorationEditorState?.booking?.fields?.[index]
    const fallback = DEFAULT_DECORATION_CONFIG.booking.fields.find(item => item.id === field?.id)
    if (!field) return null

    return {
      label: `${field.label || field.id}字段图标`,
      current: field.icon,
      defaultValue: fallback?.icon || 'image',
      allowEmpty: false,
      set(value) {
        field.icon = value
      },
      render: renderBookingFieldEditor
    }
  }

  if (parts[0] === 'icons') {
    const group = parts[1]
    const key = parts[2]
    const labels = {
      navigation: { portfolio: '作品集导航图标', about: '简介导航图标', booking: '咨询导航图标' },
      quickJump: { trigger: '快捷入口按钮图标', portfolio: '作品集快捷图标', booking: '咨询快捷图标' },
      contact: { wechat: '微信图标', email: '邮箱图标', location: '地址图标', phone: '电话图标' }
    }
    const currentGroup = decorationEditorState?.icons?.[group]
    const defaultGroup = DEFAULT_DECORATION_CONFIG.icons?.[group]
    if (!currentGroup || !defaultGroup || !(key in defaultGroup)) return null

    return {
      label: labels[group]?.[key] || '页面图标',
      current: currentGroup[key],
      defaultValue: defaultGroup[key],
      allowEmpty: false,
      set(value) {
        currentGroup[key] = value
      },
      render: renderGlobalIconEditors
    }
  }

  return null
}

function renderIconEditorGroup(containerId, items) {
  const container = document.getElementById(containerId)
  if (!container) return

  container.innerHTML = items.map(item => {
    const target = getIconTarget(item.targetKey)
    return `
      <div class="icon-setting-item">
        <span>${escapeHtml(item.label)}</span>
        ${renderIconPickerButton(target?.current, item.targetKey, target?.allowEmpty)}
      </div>
    `
  }).join('')
}

function renderGlobalIconEditors() {
  renderIconEditorGroup('navigationIconEditor', [
    { label: '作品集', targetKey: 'icons.navigation.portfolio' },
    { label: '简介', targetKey: 'icons.navigation.about' },
    { label: '咨询', targetKey: 'icons.navigation.booking' }
  ])
  renderIconEditorGroup('quickJumpIconEditor', [
    { label: '展开按钮', targetKey: 'icons.quickJump.trigger' },
    { label: '作品集入口', targetKey: 'icons.quickJump.portfolio' },
    { label: '咨询入口', targetKey: 'icons.quickJump.booking' }
  ])
  renderIconEditorGroup('contactIconEditor', [
    { label: '微信', targetKey: 'icons.contact.wechat' },
    { label: '邮箱', targetKey: 'icons.contact.email' },
    { label: '地址', targetKey: 'icons.contact.location' },
    { label: '电话', targetKey: 'icons.contact.phone' }
  ])
}

function openIconPicker(targetKey) {
  const target = getIconTarget(targetKey)
  if (!target) return

  activeIconTargetKey = targetKey
  const title = document.getElementById('iconPickerTitle')
  const grid = document.getElementById('iconPickerGrid')
  const resetButton = document.getElementById('iconPickerReset')
  if (title) title.textContent = target.label
  if (resetButton) resetButton.textContent = target.allowEmpty ? '不显示图标' : '恢复默认'
  if (grid) {
    grid.innerHTML = CONFIGURABLE_ICONS.map(item => `
      <button type="button" class="icon-picker-option ${target.current === item.name ? 'selected' : ''}" onclick="selectDecorationIcon('${item.name}')">
        <img src="/mini-icons/${item.name}.svg" alt="">
        <span>${escapeHtml(item.label)}</span>
      </button>
    `).join('')
  }

  openModal('iconPickerModal')
}

function selectDecorationIcon(icon) {
  const target = getIconTarget(activeIconTargetKey)
  if (!target || !CONFIGURABLE_ICON_NAMES.has(icon)) return

  target.set(icon)
  target.render()
  closeIconPicker()
  updateThemePreview()
}

function resetActiveIcon() {
  const target = getIconTarget(activeIconTargetKey)
  if (!target) return

  target.set(target.allowEmpty ? '' : target.defaultValue)
  target.render()
  closeIconPicker()
  updateThemePreview()
}

function closeIconPicker() {
  closeModal('iconPickerModal')
  activeIconTargetKey = ''
}

function renderDecorationSectionEditor(pageKey) {
  const container = document.getElementById(`${pageKey}DecorationSections`)
  const sections = decorationEditorState?.[pageKey]?.sections || []
  if (!container) return

  container.innerHTML = sections.map((section, index) => {
    const sectionName = DECORATION_SECTION_NAMES[pageKey]?.[section.type] || section.type
    const sourceOnlySections = {
      home: ['hero', 'categories'],
      about: ['profile'],
      booking: ['hero'],
      series: ['hero']
    }
    const supportsCopy = !(sourceOnlySections[pageKey] || []).includes(section.type)
    const supportsAction = (
      (pageKey === 'home' && ['packages', 'schedule'].includes(section.type)) ||
      (pageKey === 'about' && section.type === 'packages') ||
      (pageKey === 'booking' && section.type === 'form') ||
      (pageKey === 'series' && section.type === 'action') ||
      (pageKey === 'success' && section.type === 'actions')
    )

    return `
      <div class="decoration-row ${section.enabled === false ? 'is-disabled' : ''}">
        <div class="decoration-row-toolbar">
          <div class="decoration-row-name">
            <span class="decoration-order">${index + 1}</span>
            <strong>${escapeHtml(sectionName)}</strong>
          </div>
          <div class="decoration-row-actions">
            <label class="compact-toggle">
              <input type="checkbox" ${section.enabled === false ? '' : 'checked'} onchange="updateDecorationSectionValue('${pageKey}', ${index}, 'enabled', this.checked)">
              <span>显示</span>
            </label>
            <button type="button" class="icon-control" title="向上移动" onclick="moveDecorationSection('${pageKey}', ${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" class="icon-control" title="向下移动" onclick="moveDecorationSection('${pageKey}', ${index}, 1)" ${index === sections.length - 1 ? 'disabled' : ''}>↓</button>
          </div>
        </div>
        ${supportsCopy ? `
          <div class="decoration-copy-grid">
            <label>区块标题<input type="text" value="${escapeHtml(section.title || '')}" oninput="updateDecorationSectionValue('${pageKey}', ${index}, 'title', this.value)"></label>
            <label>补充说明<input type="text" value="${escapeHtml(section.subtitle || '')}" oninput="updateDecorationSectionValue('${pageKey}', ${index}, 'subtitle', this.value)"></label>
            ${supportsAction ? `<label>操作文字<input type="text" value="${escapeHtml(section.actionText || '')}" oninput="updateDecorationSectionValue('${pageKey}', ${index}, 'actionText', this.value)"></label>` : ''}
            <div class="decoration-icon-field"><span>标题图标</span>${renderIconPickerButton(section.icon, `section.${pageKey}.${index}`, true)}</div>
          </div>
        ` : '<div class="decoration-row-note">内容来自对应页面资料，这里控制是否显示和所在位置。</div>'}
      </div>
    `
  }).join('')
}

function renderBookingFieldEditor() {
  const container = document.getElementById('bookingFieldEditor')
  const fields = decorationEditorState?.booking?.fields || []
  if (!container) return

  container.innerHTML = fields.map((field, index) => `
    <div class="decoration-row field-row ${field.enabled === false ? 'is-disabled' : ''}">
      <div class="decoration-row-toolbar">
        <div class="decoration-row-name">
          <span class="decoration-order">${index + 1}</span>
          <strong>${escapeHtml(field.label || field.id)}</strong>
        </div>
        <div class="decoration-row-actions">
          <label class="compact-toggle"><input type="checkbox" ${field.enabled === false ? '' : 'checked'} onchange="updateBookingFieldValue(${index}, 'enabled', this.checked)"><span>显示</span></label>
          <label class="compact-toggle"><input type="checkbox" ${field.required === true ? 'checked' : ''} onchange="updateBookingFieldValue(${index}, 'required', this.checked)"><span>必填</span></label>
          <button type="button" class="icon-control" title="向上移动" onclick="moveBookingField(${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="icon-control" title="向下移动" onclick="moveBookingField(${index}, 1)" ${index === fields.length - 1 ? 'disabled' : ''}>↓</button>
        </div>
      </div>
      <div class="decoration-copy-grid two-columns">
        <label>字段名称<input type="text" value="${escapeHtml(field.label || '')}" oninput="updateBookingFieldValue(${index}, 'label', this.value)"></label>
        <label>输入提示<input type="text" value="${escapeHtml(field.placeholder || '')}" oninput="updateBookingFieldValue(${index}, 'placeholder', this.value)"></label>
        <div class="decoration-icon-field"><span>字段图标</span>${renderIconPickerButton(field.icon, `field.${index}`)}</div>
      </div>
    </div>
  `).join('')
}

function renderDecorationEditors() {
  ['home', 'about', 'booking', 'packages', 'packageDetail', 'series', 'success']
    .forEach(renderDecorationSectionEditor)
  renderBookingFieldEditor()
  renderGlobalIconEditors()
}

function updateDecorationSectionValue(pageKey, index, fieldName, value) {
  const section = decorationEditorState?.[pageKey]?.sections?.[index]
  if (!section) return
  section[fieldName] = value

  if (fieldName === 'enabled') {
    renderDecorationSectionEditor(pageKey)
  }
  updateThemePreview()
}

function moveDecorationSection(pageKey, index, direction) {
  const sections = decorationEditorState?.[pageKey]?.sections
  const targetIndex = index + direction
  if (!sections || targetIndex < 0 || targetIndex >= sections.length) return

  const [moved] = sections.splice(index, 1)
  sections.splice(targetIndex, 0, moved)
  renderDecorationSectionEditor(pageKey)
  updateThemePreview()
}

function updateBookingFieldValue(index, fieldName, value) {
  const field = decorationEditorState?.booking?.fields?.[index]
  if (!field) return
  field[fieldName] = value

  if (fieldName === 'enabled' || fieldName === 'required') {
    renderBookingFieldEditor()
  }
  updateThemePreview()
}

function moveBookingField(index, direction) {
  const fields = decorationEditorState?.booking?.fields
  const targetIndex = index + direction
  if (!fields || targetIndex < 0 || targetIndex >= fields.length) return

  const [moved] = fields.splice(index, 1)
  fields.splice(targetIndex, 0, moved)
  renderBookingFieldEditor()
  updateThemePreview()
}

function switchDecorationPage(pageKey) {
  document.querySelectorAll('[data-decoration-tab]').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.decorationTab === pageKey)
  })
  document.querySelectorAll('[data-decoration-panel]').forEach(panel => {
    panel.classList.toggle('active', panel.dataset.decorationPanel === pageKey)
  })
  if (SKIN_PREVIEW_PAGE_KEYS.has(pageKey)) {
    activeSkinPreviewPage = pageKey
    skinPreviewQuickJumpOpen = false
    updateThemePreview()
  }
}

function collectDecorationSettings() {
  const decoration = normalizeDecorationConfig(decorationEditorState)
  Object.keys(DEFAULT_DECORATION_CONFIG.terminology).forEach(key => {
    const element = document.getElementById(`term-${key}`)
    decoration.terminology[key] = element?.value.trim() || DEFAULT_DECORATION_CONFIG.terminology[key]
  })
  decoration.navigation.portfolioText = document.getElementById('navPortfolioText').value.trim() || DEFAULT_DECORATION_CONFIG.navigation.portfolioText
  decoration.navigation.aboutText = document.getElementById('navAboutText').value.trim() || DEFAULT_DECORATION_CONFIG.navigation.aboutText
  decoration.navigation.bookingText = document.getElementById('navBookingText').value.trim() || DEFAULT_DECORATION_CONFIG.navigation.bookingText
  decoration.navigation.style = document.getElementById('navStyle').value
  decoration.home.heroVariant = document.getElementById('homeHeroVariant').value
  decoration.home.galleryVariant = document.getElementById('homeGalleryVariant').value
  decoration.home.galleryColumns = Number(document.getElementById('homeGalleryColumns').value) === 1 ? 1 : 2
  decoration.home.imageRatio = document.getElementById('homeImageRatio').value
  decoration.about.headerVariant = document.getElementById('aboutHeaderVariant').value
  decoration.booking.headerVariant = document.getElementById('bookingHeaderVariant').value
  decoration.booking.formVariant = document.getElementById('bookingFormVariant').value
  decoration.packages.layoutVariant = document.getElementById('packagesLayoutVariant').value
  decoration.packageDetail.layoutVariant = document.getElementById('packageDetailLayoutVariant').value
  decoration.series.galleryVariant = document.getElementById('seriesGalleryVariant').value
  decoration.success.layoutVariant = document.getElementById('successLayoutVariant').value
  return normalizeDecorationConfig(decoration)
}

const THEME_VISUAL_FIELDS = [
  'primaryColor',
  'secondaryColor',
  'accentColor',
  'backgroundColor',
  'surfaceColor',
  'surfaceMutedColor',
  'textColor',
  'mutedTextColor',
  'dividerColor',
  'buttonTextColor',
  'cardStyle',
  'buttonStyle',
  'fontStyle',
  'headingStyle',
  'quickJumpStyle',
  'imageRadius',
  'layoutDensity'
]

const THEME_FIELD_IDS = {
  primaryColor: 'themePrimaryColor',
  secondaryColor: 'themeSecondaryColor',
  accentColor: 'themeAccentColor',
  backgroundColor: 'themeBackgroundColor',
  surfaceColor: 'themeSurfaceColor',
  surfaceMutedColor: 'themeSurfaceMutedColor',
  textColor: 'themeTextColor',
  mutedTextColor: 'themeMutedTextColor',
  dividerColor: 'themeDividerColor',
  buttonTextColor: 'themeButtonTextColor',
  cardStyle: 'themeCardStyle',
  buttonStyle: 'themeButtonStyle',
  fontStyle: 'themeFontStyle',
  headingStyle: 'themeHeadingStyle',
  quickJumpStyle: 'themeQuickJumpStyle',
  imageRadius: 'themeImageRadius',
  layoutDensity: 'themeLayoutDensity'
}

function setThemeEditorValues(theme) {
  document.getElementById('themeEnabled').checked = theme.enabled !== false
  setSelectValue('themePreset', theme.preset || 'minimal')
  document.getElementById('themeBrandName').value = theme.brandName || ''

  THEME_VISUAL_FIELDS.forEach(field => {
    const element = document.getElementById(THEME_FIELD_IDS[field])
    const fallback = DEFAULT_V11_CONFIG.theme[field]
    if (!element) return
    if (element.tagName === 'SELECT') {
      setSelectValue(element.id, theme[field] || fallback)
    } else {
      element.value = theme[field] || fallback
    }
  })
  document.getElementById('themeShowDecorations').checked = theme.showDecorations !== false
}

function getThemeEditorValues() {
  const preset = document.getElementById('themePreset').value || 'minimal'
  const values = {
    enabled: document.getElementById('themeEnabled').checked,
    preset,
    brandName: document.getElementById('themeBrandName').value.trim(),
    homeLayout: portfolioData.theme?.homeLayout || THEME_PRESETS[preset]?.homeLayout || 'portfolio-first',
    showDecorations: document.getElementById('themeShowDecorations').checked
  }

  THEME_VISUAL_FIELDS.forEach(field => {
    const element = document.getElementById(THEME_FIELD_IDS[field])
    values[field] = element?.value || DEFAULT_V11_CONFIG.theme[field]
  })
  return values
}

function getDecorationVariantState() {
  return {
    navigationStyle: document.getElementById('navStyle').value,
    homeHero: document.getElementById('homeHeroVariant').value,
    homeGallery: document.getElementById('homeGalleryVariant').value,
    homeColumns: Number(document.getElementById('homeGalleryColumns').value) === 1 ? 1 : 2,
    homeRatio: document.getElementById('homeImageRatio').value,
    aboutHeader: document.getElementById('aboutHeaderVariant').value,
    bookingHeader: document.getElementById('bookingHeaderVariant').value,
    bookingForm: document.getElementById('bookingFormVariant').value,
    packagesLayout: document.getElementById('packagesLayoutVariant').value,
    packageDetailLayout: document.getElementById('packageDetailLayoutVariant').value,
    seriesGallery: document.getElementById('seriesGalleryVariant').value,
    successLayout: document.getElementById('successLayoutVariant').value
  }
}

function applyDecorationVariantState(variants) {
  if (!variants || !decorationEditorState) return

  decorationEditorState.navigation.style = variants.navigationStyle
  decorationEditorState.home.heroVariant = variants.homeHero
  decorationEditorState.home.galleryVariant = variants.homeGallery
  decorationEditorState.home.galleryColumns = Number(variants.homeColumns) === 1 ? 1 : 2
  decorationEditorState.home.imageRatio = variants.homeRatio
  decorationEditorState.about.headerVariant = variants.aboutHeader
  decorationEditorState.booking.headerVariant = variants.bookingHeader
  decorationEditorState.booking.formVariant = variants.bookingForm
  decorationEditorState.packages.layoutVariant = variants.packagesLayout
  decorationEditorState.packageDetail.layoutVariant = variants.packageDetailLayout
  decorationEditorState.series.galleryVariant = variants.seriesGallery
  decorationEditorState.success.layoutVariant = variants.successLayout

  setSelectValue('navStyle', variants.navigationStyle)
  setSelectValue('homeHeroVariant', variants.homeHero)
  setSelectValue('homeGalleryVariant', variants.homeGallery)
  setSelectValue('homeGalleryColumns', String(Number(variants.homeColumns) === 1 ? 1 : 2))
  setSelectValue('homeImageRatio', variants.homeRatio)
  setSelectValue('aboutHeaderVariant', variants.aboutHeader)
  setSelectValue('bookingHeaderVariant', variants.bookingHeader)
  setSelectValue('bookingFormVariant', variants.bookingForm)
  setSelectValue('packagesLayoutVariant', variants.packagesLayout)
  setSelectValue('packageDetailLayoutVariant', variants.packageDetailLayout)
  setSelectValue('seriesGalleryVariant', variants.seriesGallery)
  setSelectValue('successLayoutVariant', variants.successLayout)
}

function renderThemePresetCards() {
  const container = document.getElementById('skinPresetGrid')
  if (!container) return
  const current = document.getElementById('themePreset').value || 'editorial-studio'
  const currentPreset = THEME_PRESETS[current]
  const previewImages = getSkinPreviewImages()
  const legacyNotice = currentPreset?.commercial === false
    ? '<div class="skin-legacy-notice"><strong>当前使用的是旧版风格</strong><span>旧风格会继续正常显示。请选择下面任一新皮肤，才能获得完整的新版页面设计。</span></div>'
    : ''
  const commercialPresets = Object.entries(THEME_PRESETS)
    .filter(([, preset]) => preset.commercial === true)
    .sort(([, left], [, right]) => (left.order || 99) - (right.order || 99))

  container.innerHTML = legacyNotice + commercialPresets.map(([key, preset]) => {
    const active = key === current
    return `
      <button type="button" class="skin-preset-card skin-${key} ${active ? 'active' : ''}" data-skin="${key}" aria-pressed="${active}" onclick="selectThemePreset('${key}')">
        <span class="skin-preset-visual">
          ${previewImages.hero ? `<img src="${escapeHtml(previewImages.hero)}" alt="" loading="lazy">` : '<span class="skin-preset-fallback"></span>'}
          <span class="skin-preset-veil"></span>
          <span class="skin-preset-code">${escapeHtml(preset.code || '')}</span>
          <span class="skin-preset-visual-title">${escapeHtml(preset.name)}</span>
          <span class="skin-preset-line"></span>
        </span>
        <span class="skin-preset-head">
          <strong>${escapeHtml(preset.name)}</strong>
          <span class="skin-preset-state">${active ? '使用中' : '查看'}</span>
        </span>
        <span class="skin-preset-description">${escapeHtml(preset.description)}</span>
      </button>
    `
  }).join('')
}

const SKIN_PREVIEW_PAGE_KEYS = new Set(['home', 'about', 'booking'])

function getSkinPreviewPhotoUrl(photoName, size = 700) {
  const value = String(photoName || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value) || /^data:image\//i.test(value)) return value
  return getPhotoThumbUrl(value.replace(/^portfolio\//, ''), size)
}

function getSkinPreviewAssetUrl(assetPath) {
  const value = String(assetPath || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value) || /^data:image\//i.test(value)) return value
  return getCosAssetUrl(value)
}

function getSkinPreviewSeriesItems() {
  const items = []

  for (const theme of Array.isArray(portfolioData?.themes) ? portfolioData.themes : []) {
    if (theme?.enabled === false) continue
    const category = String(theme?.name || '作品').trim() || '作品'

    for (const series of Array.isArray(theme?.series) ? theme.series : []) {
      if (series?.enabled === false) continue
      const photos = getVisibleSeriesPhotos(series)
      if (!photos.length) continue
      items.push({
        id: String(series.id || `${theme.id || category}-${items.length}`),
        title: String(series.title || category).trim() || category,
        category,
        imageUrl: getSkinPreviewPhotoUrl(photos[0], 900),
        photoCount: photos.length,
        likes: Number(series.likes) || 0,
        featuredOnHome: series.featuredOnHome === true,
        homeSort: Number.isFinite(Number(series.homeSort)) ? Number(series.homeSort) : Number.MAX_SAFE_INTEGER,
        description: String(series.description || series.bannerDescription || '').trim(),
        tags: Array.isArray(series.tags) ? series.tags.filter(Boolean).slice(0, 3) : []
      })
    }
  }

  return items
}

function getSkinPreviewImages() {
  const seriesItems = getSkinPreviewSeriesItems()
  const featuredItems = seriesItems.filter(item => item.featuredOnHome)
  const bannerCandidates = (featuredItems.length ? featuredItems : seriesItems)
    .slice()
    .sort((left, right) => {
      if (featuredItems.length && left.homeSort !== right.homeSort) return left.homeSort - right.homeSort
      return right.likes - left.likes
    })

  const configuredBanner = String(portfolioData?.homeBanner?.mainImage || '').trim()
  const fallbackBanner = configuredBanner
    ? getSkinPreviewAssetUrl(configuredBanner)
    : getSkinPreviewAssetUrl('banner/main-banner.jpg')
  const hero = bannerCandidates[0]?.imageUrl || fallbackBanner || seriesItems[0]?.imageUrl || ''

  return {
    hero,
    work: seriesItems[1]?.imageUrl || seriesItems[0]?.imageUrl || hero,
    seriesItems,
    bannerItems: bannerCandidates.slice(0, 6)
  }
}

function getSkinPreviewDraftDecoration() {
  try {
    return collectDecorationSettings()
  } catch (error) {
    return normalizeDecorationConfig(decorationEditorState || portfolioData.decoration)
  }
}

function getSkinPreviewModel(theme) {
  const decoration = getSkinPreviewDraftDecoration()
  const previewImages = getSkinPreviewImages()
  const modules = fillMissingObject(portfolioData.modules, DEFAULT_V11_CONFIG.modules)
  const profile = fillMissingObject(portfolioData.photographer, {
    name: theme.brandName || '您的门店名称',
    title: '用作品介绍门店风格',
    location: '',
    avatar: '',
    stats: PROFILE_STAT_FIELDS.map(field => ({ value: field.fallbackValue, label: field.label })),
    bio: '',
    skills: [],
    contact: { wechat: '', email: '' },
    studio: { name: '', address: '' }
  })
  const homeBanner = {
    ...DEFAULT_HOME_BANNER,
    ...(portfolioData.homeBanner || {}),
    logoText: theme.brandName || portfolioData.homeBanner?.logoText || DEFAULT_HOME_BANNER.logoText
  }
  const packages = (Array.isArray(portfolioData.packages) ? portfolioData.packages : [])
    .filter(item => item?.enabled !== false)
    .sort((left, right) => (Number(left.sort) || 999) - (Number(right.sort) || 999))
  const testimonials = (Array.isArray(portfolioData.testimonials) ? portfolioData.testimonials : [])
    .filter(item => item?.enabled !== false)
    .sort((left, right) => (Number(left.sort) || 999) - (Number(right.sort) || 999))
  const photographers = (Array.isArray(portfolioData.photographers) ? portfolioData.photographers : [])
    .filter(item => item?.enabled !== false)
  const stores = (Array.isArray(portfolioData.stores) ? portfolioData.stores : [])
    .filter(item => item?.enabled !== false)
  const categories = ['全部', ...Array.from(new Set(previewImages.seriesItems.map(item => item.category)))]

  return {
    theme,
    decoration,
    modules,
    profile,
    homeBanner,
    packages,
    testimonials,
    photographers,
    stores,
    categories,
    seriesItems: previewImages.seriesItems,
    bannerItems: previewImages.bannerItems,
    heroImage: previewImages.hero,
    aboutCover: getSkinPreviewAssetUrl('banner/about-banner.jpg') || previewImages.hero,
    bookingCover: getSkinPreviewAssetUrl('banner/booking-banner.jpg') || previewImages.hero,
    avatarImage: getSkinPreviewAssetUrl(profile.avatar) || previewImages.hero,
    consultation: fillMissingObject(portfolioData.consultation, DEFAULT_V11_CONFIG.consultation),
    schedule: fillMissingObject(portfolioData.schedule, DEFAULT_V11_CONFIG.schedule),
    serviceFlow: fillMissingObject(portfolioData.serviceFlow, DEFAULT_V11_CONFIG.serviceFlow),
    faq: fillMissingObject(portfolioData.faq, DEFAULT_V11_CONFIG.faq),
    quickJump: fillMissingObject(portfolioData.quickJump, DEFAULT_V11_CONFIG.quickJump),
    booking: {
      styleOptions: normalizeBookingStyleOptions(portfolioData.booking?.styleOptions || FALLBACK_BOOKING_CONFIG.styleOptions)
    }
  }
}

function renderSkinPreviewIcon(name, className = '') {
  const normalized = normalizeConfigurableIcon(name, 'image')
  return `<img class="customer-preview-icon ${escapeHtml(className)}" src="/mini-icons/${normalized}.svg" alt="">`
}

function renderSkinPreviewImage(url, className, alt, fallbackUrl = '') {
  const safeUrl = escapeHtml(url)
  if (!safeUrl) return `<span class="${escapeHtml(className)} customer-preview-image-empty"></span>`
  const safeFallback = escapeHtml(fallbackUrl)
  return `<img class="${escapeHtml(className)}" src="${safeUrl}" data-fallback="${safeFallback}" alt="${escapeHtml(alt)}" onerror="if(this.dataset.fallback && this.src !== this.dataset.fallback){this.src=this.dataset.fallback}else{this.hidden=true;this.parentElement?.classList.add('customer-preview-image-missing')}">`
}

function renderSkinPreviewHeading(section, trailing = '') {
  const title = String(section?.title || '').trim()
  const subtitle = String(section?.subtitle || '').trim()
  if (!title && !subtitle && !trailing) return ''
  return `
    <div class="customer-preview-section-heading">
      <div class="customer-preview-section-copy">
        ${title ? `<div class="customer-preview-section-title">${section.icon ? renderSkinPreviewIcon(section.icon) : ''}<span>${escapeHtml(title)}</span></div>` : ''}
        ${subtitle ? `<div class="customer-preview-section-subtitle">${escapeHtml(subtitle)}</div>` : ''}
      </div>
      ${trailing ? `<div class="customer-preview-section-trailing">${escapeHtml(trailing)}</div>` : ''}
    </div>
  `
}

function renderSkinPreviewHome(model) {
  const { decoration, homeBanner, bannerItems, seriesItems } = model
  const heroItem = bannerItems[0] || seriesItems[0]
  const terms = decoration.terminology

  return decoration.home.sections.map(section => {
    if (section.enabled === false) return ''

    if (section.type === 'hero') {
      return `
        <section class="customer-preview-hero">
          ${renderSkinPreviewImage(heroItem?.imageUrl || model.heroImage, 'customer-preview-hero-image', '首页作品图')}
          <div class="customer-preview-hero-shade"></div>
          <div class="customer-preview-hero-brand">${escapeHtml(homeBanner.logoText)}</div>
          <div class="customer-preview-hero-copy">
            <div class="customer-preview-hero-kicker"><span></span>${escapeHtml(homeBanner.tagText)}</div>
            <div class="customer-preview-hero-title">${escapeHtml(heroItem?.title || homeBanner.logoText)}</div>
            <div class="customer-preview-hero-meta">${escapeHtml(heroItem?.category || '')}</div>
            <div class="customer-preview-hero-description">${escapeHtml(heroItem?.description || homeBanner.description)}</div>
          </div>
        </section>
      `
    }

    if (section.type === 'categories' && model.categories.length > 1) {
      return `<div class="customer-preview-categories">${model.categories.slice(0, 5).map((item, index) => `<span class="${index === 0 ? 'active' : ''}">${escapeHtml(item)}</span>`).join('')}</div>`
    }

    if (section.type === 'portfolio') {
      const cards = seriesItems.slice(0, 6).map(item => `
        <article class="customer-preview-work-card">
          <div class="customer-preview-work-image-wrap">
            ${renderSkinPreviewImage(item.imageUrl, 'customer-preview-work-image', item.title)}
            <span class="customer-preview-series-badge">${renderSkinPreviewIcon('images')}<span>${escapeHtml(terms.workLabel)}集</span></span>
          </div>
          <div class="customer-preview-work-copy">
            <strong>${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.category)}</span>
          </div>
        </article>
      `).join('')
      return `
        <section class="customer-preview-page-section customer-preview-portfolio-section">
          ${renderSkinPreviewHeading(section, `${seriesItems.length} 组`)}
          <div class="customer-preview-work-grid columns-${decoration.home.galleryColumns} gallery-${decoration.home.galleryVariant} ratio-${decoration.home.imageRatio}">
            ${cards || `<div class="customer-preview-empty">上传作品后，这里会显示真实客片。</div>`}
          </div>
        </section>
      `
    }

    if (section.type === 'packages' && model.modules.packages && model.packages.length) {
      return `
        <section class="customer-preview-page-section customer-preview-package-section">
          ${renderSkinPreviewHeading(section, section.actionText || '')}
          <div class="customer-preview-package-list">${model.packages.slice(0, 2).map(item => `
            <article class="customer-preview-package-card">
              <div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.subtitle || '')}</span></div>
              <b>${escapeHtml(item.priceText || '')}</b>
            </article>
          `).join('')}</div>
        </section>
      `
    }

    if (section.type === 'schedule' && model.modules.schedule && model.schedule.enabled !== false) {
      return `
        <section class="customer-preview-page-section customer-preview-schedule-section">
          <span>${escapeHtml(section.title || model.schedule.title)}</span>
          <strong>${escapeHtml(model.schedule.availableText)}</strong>
          <small>${escapeHtml(model.schedule.notice)}</small>
        </section>
      `
    }

    if (section.type === 'testimonials' && model.modules.testimonials && model.testimonials.length) {
      const review = model.testimonials[0]
      return `
        <section class="customer-preview-page-section customer-preview-review-section">
          ${renderSkinPreviewHeading(section)}
          <blockquote>“${escapeHtml(review.content || '')}”</blockquote>
          <span>${escapeHtml([review.name, review.shootType, review.dateText].filter(Boolean).join(' · '))}</span>
        </section>
      `
    }

    if (section.type === 'serviceFlow' && model.modules.serviceFlow && model.serviceFlow.enabled !== false) {
      return `
        <section class="customer-preview-page-section customer-preview-flow-section">
          ${renderSkinPreviewHeading(section)}
          <div class="customer-preview-flow-list">${(model.serviceFlow.steps || []).slice(0, 4).map((item, index) => `<div><b>0${index + 1}</b><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.description)}</small></span></div>`).join('')}</div>
        </section>
      `
    }

    return ''
  }).join('')
}

function renderSkinPreviewProfile(model) {
  const stats = Array.isArray(model.profile.stats) && model.profile.stats.length
    ? model.profile.stats
    : PROFILE_STAT_FIELDS.map(field => ({ value: field.fallbackValue, label: field.label }))
  return `
    <section class="customer-preview-profile">
      <div class="customer-preview-profile-media">
        ${renderSkinPreviewImage(model.aboutCover, 'customer-preview-profile-cover', '门店简介封面', model.heroImage)}
        <span></span>
      </div>
      <div class="customer-preview-profile-card">
        <div class="customer-preview-avatar-wrap">
          ${renderSkinPreviewImage(model.avatarImage, 'customer-preview-avatar', '门店头像', model.heroImage)}
          <i>${renderSkinPreviewIcon('circle-check')}</i>
        </div>
        <div class="customer-preview-profile-copy">
          <strong>${escapeHtml(model.profile.name || model.theme.brandName || '您的门店名称')}</strong>
          <span>${escapeHtml(model.profile.title || '')}</span>
          ${model.profile.location ? `<small>${renderSkinPreviewIcon(model.decoration.icons.contact.location)}${escapeHtml(model.profile.location)}</small>` : ''}
        </div>
        <div class="customer-preview-stats">${stats.slice(0, 3).map(stat => `<div><strong>${escapeHtml(stat.value)}</strong><span>${escapeHtml(stat.label)}</span></div>`).join('')}</div>
      </div>
    </section>
  `
}

function renderSkinPreviewAbout(model) {
  const sections = model.decoration.about.sections
  return sections.map(section => {
    if (section.enabled === false) return ''
    if (section.type === 'profile') return renderSkinPreviewProfile(model)

    if (section.type === 'bio' && model.profile.bio) {
      return `<section class="customer-preview-page-section customer-preview-about-section">${renderSkinPreviewHeading(section)}<div class="customer-preview-bio"><i></i><p>${escapeHtml(model.profile.bio).replace(/\r?\n/g, '<br>')}</p></div></section>`
    }

    if (section.type === 'skills' && Array.isArray(model.profile.skills) && model.profile.skills.length) {
      return `<section class="customer-preview-page-section customer-preview-about-section">${renderSkinPreviewHeading(section)}<div class="customer-preview-skills">${model.profile.skills.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div></section>`
    }

    if (section.type === 'contact') {
      const contactRows = []
      if (model.profile.contact?.wechat) contactRows.push({ icon: model.decoration.icons.contact.wechat, label: '微信', value: model.profile.contact.wechat })
      if (model.profile.contact?.email) contactRows.push({ icon: model.decoration.icons.contact.email, label: '邮箱', value: model.profile.contact.email })
      if (model.profile.studio?.name || model.profile.studio?.address) contactRows.push({ icon: model.decoration.icons.contact.location, label: '到店地址', value: model.profile.studio?.name || model.profile.studio?.address })
      if (!contactRows.length) return ''
      return `<section class="customer-preview-page-section customer-preview-about-section">${renderSkinPreviewHeading(section)}<div class="customer-preview-contact-list">${contactRows.map(row => `<div>${renderSkinPreviewIcon(row.icon)}<span><small>${escapeHtml(row.label)}</small><strong>${escapeHtml(row.value)}</strong></span>${renderSkinPreviewIcon('chevron-right')}</div>`).join('')}</div></section>`
    }

    if (section.type === 'stores' && model.modules.stores && model.stores.length) {
      return `<section class="customer-preview-page-section customer-preview-about-section">${renderSkinPreviewHeading(section)}<div class="customer-preview-simple-list">${model.stores.slice(0, 2).map((item, index) => `<div><b>0${index + 1}</b><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.address || item.businessHours || '')}</small></span></div>`).join('')}</div></section>`
    }

    if (section.type === 'team' && model.modules.photographers && model.photographers.length) {
      return `<section class="customer-preview-page-section customer-preview-about-section">${renderSkinPreviewHeading(section)}<div class="customer-preview-team">${model.photographers.slice(0, 2).map(item => `<div>${renderSkinPreviewImage(getSkinPreviewAssetUrl(item.avatar), 'customer-preview-team-avatar', item.name, model.avatarImage)}<strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.title || '')}</span></div>`).join('')}</div></section>`
    }

    if (section.type === 'packages' && model.modules.packages && model.packages.length) {
      const item = model.packages[0]
      return `<section class="customer-preview-page-section customer-preview-about-section">${renderSkinPreviewHeading(section)}<div class="customer-preview-about-package"><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.subtitle || '')}</small></span><b>${escapeHtml(item.priceText || '')}</b></div></section>`
    }

    if (section.type === 'serviceFlow' && model.modules.serviceFlow && model.serviceFlow.enabled !== false) {
      return `<section class="customer-preview-page-section customer-preview-about-section">${renderSkinPreviewHeading(section)}<div class="customer-preview-simple-list">${(model.serviceFlow.steps || []).slice(0, 3).map((item, index) => `<div><b>0${index + 1}</b><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.description)}</small></span></div>`).join('')}</div></section>`
    }

    if (section.type === 'faq' && model.modules.faq && model.faq.enabled !== false) {
      return `<section class="customer-preview-page-section customer-preview-about-section">${renderSkinPreviewHeading(section)}<div class="customer-preview-faq">${(model.faq.items || []).slice(0, 2).map(item => `<div><strong>${escapeHtml(item.question)}</strong><span>${escapeHtml(item.answer)}</span></div>`).join('')}</div></section>`
    }

    if (section.type === 'testimonials' && model.modules.testimonials && model.testimonials.length) {
      const review = model.testimonials[0]
      return `<section class="customer-preview-page-section customer-preview-about-section customer-preview-review-section">${renderSkinPreviewHeading(section)}<blockquote>“${escapeHtml(review.content || '')}”</blockquote><span>${escapeHtml([review.name, review.shootType].filter(Boolean).join(' · '))}</span></section>`
    }
    return ''
  }).join('')
}

function renderSkinPreviewBookingField(field, model) {
  const required = field.required === true ? '<em>必填</em>' : ''
  if (field.id === 'style') {
    const styles = model.booking.styleOptions.slice(0, 4)
    return `<div class="customer-preview-form-field"><label>${renderSkinPreviewIcon(field.icon)}<span>${escapeHtml(field.label)}</span>${required}</label><div class="customer-preview-style-options">${styles.map((item, index) => `<span class="${index === 0 ? 'active' : ''}">${escapeHtml(item)}</span>`).join('')}</div></div>`
  }
  return `<div class="customer-preview-form-field"><label>${renderSkinPreviewIcon(field.icon)}<span>${escapeHtml(field.label)}</span>${required}</label><div class="customer-preview-input">${escapeHtml(field.placeholder || '')}${['package', 'date', 'store', 'photographer'].includes(field.id) ? renderSkinPreviewIcon('chevron-right') : ''}</div></div>`
}

function renderSkinPreviewBooking(model) {
  const { booking, terminology } = model.decoration
  return booking.sections.map(section => {
    if (section.enabled === false) return ''

    if (section.type === 'hero') {
      return `
        <section class="customer-preview-booking-hero">
          ${renderSkinPreviewImage(model.bookingCover, 'customer-preview-booking-image', '咨询页封面', model.heroImage)}
          <div class="customer-preview-booking-shade"></div>
          <div class="customer-preview-booking-copy"><span>预约${escapeHtml(terminology.consultationLabel)}</span><strong>${escapeHtml(model.consultation.title)}</strong><p>${escapeHtml(model.consultation.description)}</p></div>
        </section>
      `
    }

    if (section.type === 'notice' && model.consultation.privacyTip) {
      return `<section class="customer-preview-page-section customer-preview-notice">${renderSkinPreviewIcon(section.icon || 'circle-check')}<span><strong>${escapeHtml(section.title)}</strong><small>${escapeHtml(model.consultation.privacyTip)}</small></span></section>`
    }

    if (section.type === 'schedule' && model.modules.schedule && model.schedule.enabled !== false) {
      return `<section class="customer-preview-page-section customer-preview-booking-section">${renderSkinPreviewHeading(section)}<div class="customer-preview-schedule-card"><strong>${escapeHtml(model.schedule.availableText)}</strong><span>${escapeHtml(model.schedule.notice)}</span></div></section>`
    }

    if (section.type === 'form') {
      const fields = booking.fields.filter(field => field.enabled !== false)
      return `
        <section class="customer-preview-page-section customer-preview-booking-section customer-preview-form-section">
          ${renderSkinPreviewHeading(section)}
          <div class="customer-preview-form-fields">${fields.map(field => renderSkinPreviewBookingField(field, model)).join('')}</div>
          <div class="customer-preview-assurance"><span>不会自动上传客户信息</span><span>最终时间以沟通为准</span></div>
          <button type="button" tabindex="-1" class="customer-preview-submit">${escapeHtml(section.actionText || `生成${terminology.consultationLabel}内容`)}${renderSkinPreviewIcon('arrow-right')}</button>
        </section>
      `
    }

    if (section.type === 'serviceFlow' && model.modules.serviceFlow && model.serviceFlow.enabled !== false) {
      return `<section class="customer-preview-page-section customer-preview-booking-section">${renderSkinPreviewHeading(section)}<div class="customer-preview-simple-list">${(model.serviceFlow.steps || []).slice(0, 3).map((item, index) => `<div><b>0${index + 1}</b><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.description)}</small></span></div>`).join('')}</div></section>`
    }

    if (section.type === 'faq' && model.modules.faq && model.faq.enabled !== false) {
      return `<section class="customer-preview-page-section customer-preview-booking-section">${renderSkinPreviewHeading(section)}<div class="customer-preview-faq">${(model.faq.items || []).slice(0, 2).map(item => `<div><strong>${escapeHtml(item.question)}</strong><span>${escapeHtml(item.answer)}</span></div>`).join('')}</div></section>`
    }
    return ''
  }).join('')
}

function renderSkinPreviewNavigation(model) {
  const nav = document.getElementById('skinPreviewBottomNav')
  if (!nav) return
  const pages = [
    { key: 'home', text: model.decoration.navigation.portfolioText, icon: model.decoration.icons.navigation.portfolio },
    { key: 'about', text: model.decoration.navigation.aboutText, icon: model.decoration.icons.navigation.about },
    { key: 'booking', text: model.decoration.navigation.bookingText, icon: model.decoration.icons.navigation.booking }
  ]
  nav.className = `customer-preview-bottom-nav nav-${model.decoration.navigation.style}`
  nav.innerHTML = pages.map(item => `
    <button type="button" class="${activeSkinPreviewPage === item.key ? 'active' : ''}" onclick="switchSkinPreviewPage('${item.key}')">
      <i></i><span>${renderSkinPreviewIcon(item.icon)}</span><b>${escapeHtml(item.text)}</b>
    </button>
  `).join('')
}

function renderSkinPreviewQuickJump(model) {
  const quickJump = document.getElementById('skinPreviewQuickJump')
  if (!quickJump) return
  const visible = model.modules.quickJump !== false && model.quickJump.enabled !== false
  quickJump.hidden = !visible
  quickJump.classList.toggle('is-open', skinPreviewQuickJumpOpen)
  if (!visible) return
  quickJump.innerHTML = `
    <div class="customer-preview-quick-menu" ${skinPreviewQuickJumpOpen ? '' : 'hidden'}>
      <button type="button" onclick="switchSkinPreviewPage('booking')">${renderSkinPreviewIcon(model.decoration.icons.quickJump.booking)}<span>${escapeHtml(model.quickJump.bookingText || model.decoration.navigation.bookingText)}</span></button>
      <button type="button" onclick="switchSkinPreviewPage('home')">${renderSkinPreviewIcon(model.decoration.icons.quickJump.portfolio)}<span>${escapeHtml(model.quickJump.portfolioText || model.decoration.navigation.portfolioText)}</span></button>
    </div>
    <button type="button" class="customer-preview-quick-trigger" aria-label="快速跳转" aria-expanded="${skinPreviewQuickJumpOpen}" onclick="toggleSkinPreviewQuickJump()">${renderSkinPreviewIcon(model.decoration.icons.quickJump.trigger)}</button>
  `
}

function switchSkinPreviewPage(pageKey) {
  if (!SKIN_PREVIEW_PAGE_KEYS.has(pageKey)) return
  activeSkinPreviewPage = pageKey
  skinPreviewQuickJumpOpen = false
  updateThemePreview()
  const viewport = document.getElementById('skinPreviewViewport')
  if (viewport) viewport.scrollTop = 0
}

function toggleSkinPreviewQuickJump() {
  skinPreviewQuickJumpOpen = !skinPreviewQuickJumpOpen
  const quickJump = document.getElementById('skinPreviewQuickJump')
  if (!quickJump) return
  quickJump.classList.toggle('is-open', skinPreviewQuickJumpOpen)
  const menu = quickJump.querySelector('.customer-preview-quick-menu')
  const trigger = quickJump.querySelector('.customer-preview-quick-trigger')
  if (menu) menu.hidden = !skinPreviewQuickJumpOpen
  if (trigger) trigger.setAttribute('aria-expanded', String(skinPreviewQuickJumpOpen))
}

function updateThemePreview() {
  const preview = document.getElementById('skinLivePreview')
  const viewport = document.getElementById('skinPreviewViewport')
  if (!preview || !viewport) return
  const theme = getThemeEditorValues()
  const preset = THEME_PRESETS[theme.preset] || THEME_PRESETS.minimal
  const model = getSkinPreviewModel(theme)
  const fontFamilies = {
    clean: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    elegant: '"Songti SC", STSong, serif',
    soft: '"PingFang SC", "Microsoft YaHei", sans-serif',
    friendly: '"PingFang SC", "Microsoft YaHei", sans-serif'
  }
  const radiusMap = { small: '2px', medium: '8px', large: '16px' }
  const buttonRadiusMap = { square: '2px', rounded: '8px', pill: '28px' }
  const densityMap = { compact: '12px', comfortable: '16px', spacious: '20px', airy: '20px' }
  const cardShadowMap = {
    minimal: 'none',
    film: '0 6px 18px rgba(44, 37, 33, 0.08)',
    soft: '0 4px 14px rgba(38, 49, 44, 0.05)',
    elevated: '0 10px 24px rgba(36, 31, 31, 0.12)'
  }

  preview.style.setProperty('--preview-primary', theme.primaryColor)
  preview.style.setProperty('--preview-secondary', theme.secondaryColor)
  preview.style.setProperty('--preview-accent', theme.accentColor)
  preview.style.setProperty('--preview-bg', theme.backgroundColor)
  preview.style.setProperty('--preview-surface', theme.surfaceColor)
  preview.style.setProperty('--preview-muted-surface', theme.surfaceMutedColor)
  preview.style.setProperty('--preview-text', theme.textColor)
  preview.style.setProperty('--preview-muted-text', theme.mutedTextColor)
  preview.style.setProperty('--preview-divider', theme.dividerColor)
  preview.style.setProperty('--preview-button-text', theme.buttonTextColor)
  preview.style.setProperty('--preview-image-radius', radiusMap[theme.imageRadius] || radiusMap.medium)
  preview.style.setProperty('--preview-button-radius', buttonRadiusMap[theme.buttonStyle] || buttonRadiusMap.rounded)
  preview.style.setProperty('--preview-section-gap', densityMap[theme.layoutDensity] || densityMap.comfortable)
  preview.style.setProperty('--preview-card-shadow', cardShadowMap[theme.cardStyle] || 'none')
  preview.style.fontFamily = fontFamilies[theme.fontStyle] || fontFamilies.clean
  preview.dataset.skin = theme.preset
  preview.dataset.heading = theme.headingStyle
  preview.dataset.decorations = theme.showDecorations ? 'on' : 'off'
  preview.dataset.page = activeSkinPreviewPage
  preview.dataset.hero = model.decoration.home.heroVariant
  preview.dataset.gallery = model.decoration.home.galleryVariant
  preview.dataset.aboutHeader = model.decoration.about.headerVariant
  preview.dataset.bookingHeader = model.decoration.booking.headerVariant
  preview.dataset.bookingForm = model.decoration.booking.formVariant

  if (activeSkinPreviewPage === 'about') viewport.innerHTML = renderSkinPreviewAbout(model)
  else if (activeSkinPreviewPage === 'booking') viewport.innerHTML = renderSkinPreviewBooking(model)
  else viewport.innerHTML = renderSkinPreviewHome(model)

  renderSkinPreviewNavigation(model)
  renderSkinPreviewQuickJump(model)

  document.querySelectorAll('[data-skin-preview-page]').forEach(button => {
    const active = button.dataset.skinPreviewPage === activeSkinPreviewPage
    button.classList.toggle('active', active)
    button.setAttribute('aria-selected', String(active))
  })

  const name = document.getElementById('skinPreviewName')
  const status = document.getElementById('skinPreviewStatus')
  if (name) name.textContent = preset.name
  if (status) {
    const customized = THEME_VISUAL_FIELDS.some(field => String(theme[field]).toLowerCase() !== String(preset[field]).toLowerCase())
    status.textContent = customized ? '当前草稿已微调，保存后生效' : '当前草稿，保存后生效'
  }
}

function selectThemePreset(presetKey) {
  setSelectValue('themePreset', presetKey)
  applySelectedThemePreset()
}

function restoreOriginalThemeSettings() {
  if (!themeEditorOriginalState) return
  setThemeEditorValues(themeEditorOriginalState.theme)
  applyDecorationVariantState(themeEditorOriginalState.variants)
  renderThemePresetCards()
  updateThemePreview()
  showToast('已恢复打开时的风格', 'success')
}

function bindThemePreviewDraftEvents() {
  const modal = document.getElementById('themeSettingsModal')
  if (!modal || modal.dataset.previewEventsBound === 'true') return

  const refreshPreview = event => {
    if (!event.target.matches('input, select, textarea')) return
    updateThemePreview()
  }
  modal.addEventListener('input', refreshPreview)
  modal.addEventListener('change', refreshPreview)
  modal.dataset.previewEventsBound = 'true'
}

function openThemeSettingsModal() {
  const config = ensureV11Config()
  const theme = fillMissingObject(config.theme, DEFAULT_V11_CONFIG.theme)
  const decoration = normalizeDecorationConfig(config.decoration)

  setThemeEditorValues(theme)

  decorationEditorState = deepClone(decoration)
  Object.keys(DEFAULT_DECORATION_CONFIG.terminology).forEach(key => {
    const element = document.getElementById(`term-${key}`)
    if (element) element.value = decoration.terminology[key]
  })
  document.getElementById('navPortfolioText').value = decoration.navigation.portfolioText
  document.getElementById('navAboutText').value = decoration.navigation.aboutText
  document.getElementById('navBookingText').value = decoration.navigation.bookingText
  setSelectValue('navStyle', decoration.navigation.style)
  setSelectValue('homeHeroVariant', decoration.home.heroVariant)
  setSelectValue('homeGalleryVariant', decoration.home.galleryVariant)
  setSelectValue('homeGalleryColumns', String(decoration.home.galleryColumns))
  setSelectValue('homeImageRatio', decoration.home.imageRatio)
  setSelectValue('aboutHeaderVariant', decoration.about.headerVariant)
  setSelectValue('bookingHeaderVariant', decoration.booking.headerVariant)
  setSelectValue('bookingFormVariant', decoration.booking.formVariant)
  setSelectValue('packagesLayoutVariant', decoration.packages.layoutVariant)
  setSelectValue('packageDetailLayoutVariant', decoration.packageDetail.layoutVariant)
  setSelectValue('seriesGalleryVariant', decoration.series.galleryVariant)
  setSelectValue('successLayoutVariant', decoration.success.layoutVariant)
  renderDecorationEditors()
  bindThemePreviewDraftEvents()
  activeSkinPreviewPage = 'home'
  skinPreviewQuickJumpOpen = false
  switchDecorationPage('home')
  themeEditorOriginalState = {
    theme: deepClone(getThemeEditorValues()),
    variants: deepClone(getDecorationVariantState())
  }
  renderThemePresetCards()
  updateThemePreview()

  openModal('themeSettingsModal')
}

function applySelectedThemePreset() {
  const presetKey = document.getElementById('themePreset').value
  const preset = THEME_PRESETS[presetKey]
  if (!preset) return

  THEME_VISUAL_FIELDS.forEach(field => {
    const element = document.getElementById(THEME_FIELD_IDS[field])
    if (!element || !preset[field]) return
    if (element.tagName === 'SELECT') setSelectValue(element.id, preset[field])
    else element.value = preset[field]
  })
  document.getElementById('themeShowDecorations').checked = preset.showDecorations !== false

  const pagePreset = DECORATION_PRESET_VARIANTS[presetKey]
  applyDecorationVariantState(pagePreset)
  renderThemePresetCards()
  updateThemePreview()
}

async function saveThemeSettings() {
  ensureV11Config()

  const brandName = document.getElementById('themeBrandName').value.trim()

  portfolioData.theme = {
    ...(portfolioData.theme || {}),
    ...getThemeEditorValues(),
    brandName,
    // 旧版字段继续保留，实际页面顺序由 decoration.*.sections 控制。
    homeLayout: portfolioData.theme?.homeLayout || 'portfolio-first',
  }
  portfolioData.decoration = collectDecorationSettings()
  portfolioData.modules = {
    ...(portfolioData.modules || {}),
    theme: document.getElementById('themeEnabled').checked
  }

  if (brandName && portfolioData.homeBanner) {
    portfolioData.homeBanner.logoText = brandName
  }

  const success = await saveConfig()
  if (success) {
    closeModal('themeSettingsModal')
    showToast('页面装修已更新', 'success')
  }
}

function ensureBookingConfig() {
  const currentBooking = portfolioData.booking || {}
  const styleOptions = Array.isArray(currentBooking.styleOptions)
    ? currentBooking.styleOptions
    : FALLBACK_BOOKING_CONFIG.styleOptions

  portfolioData.booking = {
    ...currentBooking,
    styleOptions: normalizeBookingStyleOptions(styleOptions)
  }

  return portfolioData.booking
}

function normalizeBookingStyleOptions(styleOptions) {
  const normalized = (styleOptions || [])
    .map(item => String(item).trim())
    .filter(item => item && item !== '其他')

  return Array.from(new Set(normalized))
}

function openBookingSettingsModal() {
  const booking = ensureBookingConfig()
  document.getElementById('bookingStyleOptions').value = booking.styleOptions.join('\n')
  openModal('bookingSettingsModal')
}

async function saveBookingSettings() {
  const rawOptions = document.getElementById('bookingStyleOptions').value
    .split(/\r?\n/)
  const styleOptions = normalizeBookingStyleOptions(rawOptions)

  if (styleOptions.length === 0) {
    showToast('请至少填写一个预约风格', 'error')
    return
  }

  portfolioData.booking = {
    ...(portfolioData.booking || {}),
    styleOptions
  }

  const success = await saveConfig()
  if (success) {
    closeModal('bookingSettingsModal')
    showToast('预约设置已更新', 'success')
  }
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

function fillMissingObject(target, defaults) {
  const output = { ...(target || {}) }

  Object.entries(defaults).forEach(([key, value]) => {
    if (output[key] === undefined) {
      output[key] = deepClone(value)
    } else if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      output[key] &&
      typeof output[key] === 'object' &&
      !Array.isArray(output[key])
    ) {
      output[key] = fillMissingObject(output[key], value)
    }
  })

  return output
}

function normalizeQuickJumpConfig(quickJump) {
  const normalized = fillMissingObject(quickJump, DEFAULT_V11_CONFIG.quickJump)
  delete normalized.showOnPages
  return normalized
}

function normalizeOrderedDecorationItems(items, defaults, keyName) {
  if (!Array.isArray(items)) return deepClone(defaults)

  const defaultMap = new Map(defaults.map(item => [item[keyName], item]))
  const seen = new Set()
  const normalized = []

  items.forEach(item => {
    if (!item || typeof item !== 'object') return
    const key = String(item[keyName] || (keyName === 'type' ? item.id : '') || '').trim()
    const fallback = defaultMap.get(key)
    if (!fallback || seen.has(key)) return

    seen.add(key)
    normalized.push({
      ...deepClone(fallback),
      ...item,
      [keyName]: key,
      ...(keyName === 'type' ? { id: key } : {}),
      enabled: item.enabled !== false
    })
  })

  defaults.forEach(item => {
    if (!seen.has(item[keyName])) normalized.push(deepClone(item))
  })

  return normalized
}

function normalizeDecorationConfig(decoration) {
  const normalized = fillMissingObject(decoration, DEFAULT_DECORATION_CONFIG)
  const pickValue = (value, allowed, fallback) => allowed.includes(value) ? value : fallback
  Object.keys(DEFAULT_DECORATION_CONFIG.terminology).forEach(key => {
    normalized.terminology[key] = String(normalized.terminology[key] || '').trim() || DEFAULT_DECORATION_CONFIG.terminology[key]
  })
  normalized.navigation.style = pickValue(
    normalized.navigation.style,
    ['line', 'quiet'],
    DEFAULT_DECORATION_CONFIG.navigation.style
  )
  Object.entries(DEFAULT_DECORATION_CONFIG.icons).forEach(([group, defaults]) => {
    Object.entries(defaults).forEach(([key, fallback]) => {
      normalized.icons[group][key] = normalizeConfigurableIcon(normalized.icons[group][key], fallback)
    })
  })
  normalized.home.heroVariant = pickValue(
    normalized.home.heroVariant,
    ['editorial', 'immersive', 'compact'],
    DEFAULT_DECORATION_CONFIG.home.heroVariant
  )
  normalized.home.galleryVariant = pickValue(
    normalized.home.galleryVariant,
    ['editorial', 'masonry', 'cards'],
    DEFAULT_DECORATION_CONFIG.home.galleryVariant
  )
  normalized.home.galleryColumns = Number(normalized.home.galleryColumns) === 1 ? 1 : 2
  normalized.home.imageRatio = pickValue(
    normalized.home.imageRatio,
    ['portrait', 'natural', 'square'],
    DEFAULT_DECORATION_CONFIG.home.imageRatio
  )
  normalized.about.headerVariant = pickValue(
    normalized.about.headerVariant,
    ['editorial', 'portrait', 'minimal'],
    DEFAULT_DECORATION_CONFIG.about.headerVariant
  )
  normalized.booking.headerVariant = pickValue(
    normalized.booking.headerVariant,
    ['editorial', 'image', 'compact'],
    DEFAULT_DECORATION_CONFIG.booking.headerVariant
  )
  normalized.booking.formVariant = pickValue(
    normalized.booking.formVariant,
    ['lines', 'soft'],
    DEFAULT_DECORATION_CONFIG.booking.formVariant
  )
  normalized.packages.layoutVariant = pickValue(
    normalized.packages.layoutVariant,
    ['cards', 'list'],
    DEFAULT_DECORATION_CONFIG.packages.layoutVariant
  )
  normalized.packageDetail.layoutVariant = pickValue(
    normalized.packageDetail.layoutVariant,
    ['editorial', 'compact'],
    DEFAULT_DECORATION_CONFIG.packageDetail.layoutVariant
  )
  normalized.series.galleryVariant = pickValue(
    normalized.series.galleryVariant,
    ['immersive', 'framed'],
    DEFAULT_DECORATION_CONFIG.series.galleryVariant
  )
  normalized.success.layoutVariant = pickValue(
    normalized.success.layoutVariant,
    ['centered', 'compact'],
    DEFAULT_DECORATION_CONFIG.success.layoutVariant
  )
  normalized.home.sections = normalizeOrderedDecorationItems(
    normalized.home.sections,
    DEFAULT_DECORATION_CONFIG.home.sections,
    'type'
  )
  normalized.about.sections = normalizeOrderedDecorationItems(
    normalized.about.sections,
    DEFAULT_DECORATION_CONFIG.about.sections,
    'type'
  )
  normalized.booking.sections = normalizeOrderedDecorationItems(
    normalized.booking.sections,
    DEFAULT_DECORATION_CONFIG.booking.sections,
    'type'
  )
  ;['packages', 'packageDetail', 'series', 'success'].forEach(pageKey => {
    normalized[pageKey].sections = normalizeOrderedDecorationItems(
      normalized[pageKey].sections,
      DEFAULT_DECORATION_CONFIG[pageKey].sections,
      'type'
    )
  })
  ;['home', 'about', 'booking', 'packages', 'packageDetail', 'series', 'success'].forEach(pageKey => {
    const defaultsByType = new Map(DEFAULT_DECORATION_CONFIG[pageKey].sections.map(section => [section.type, section]))
    normalized[pageKey].sections = normalized[pageKey].sections.map(section => ({
      ...section,
      icon: normalizeConfigurableIcon(section.icon, defaultsByType.get(section.type)?.icon || '', true)
    }))
  })
  const defaultBookingFieldsById = new Map(
    DEFAULT_DECORATION_CONFIG.booking.fields.map(field => [field.id, field])
  )
  normalized.booking.fields = normalizeOrderedDecorationItems(
    normalized.booking.fields,
    DEFAULT_DECORATION_CONFIG.booking.fields,
    'id'
  ).map(field => ({
    ...field,
    required: field.required === true,
    icon: normalizeConfigurableIcon(
      field.icon,
      defaultBookingFieldsById.get(field.id)?.icon || 'image'
    )
  }))

  return normalized
}

function ensureV11Config() {
  if (!portfolioData || typeof portfolioData !== 'object') {
    portfolioData = { themes: [] }
  }

  if (!Array.isArray(portfolioData.themes)) {
    portfolioData.themes = []
  }

  portfolioData.configVersion = DEFAULT_V11_CONFIG.configVersion
  portfolioData.modules = fillMissingObject(portfolioData.modules, DEFAULT_V11_CONFIG.modules)
  portfolioData.theme = fillMissingObject(portfolioData.theme, DEFAULT_V11_CONFIG.theme)
  portfolioData.decoration = normalizeDecorationConfig(portfolioData.decoration)
  portfolioData.share = fillMissingObject(portfolioData.share, DEFAULT_V11_CONFIG.share)
  portfolioData.packages = Array.isArray(portfolioData.packages)
    ? portfolioData.packages
    : deepClone(DEFAULT_V11_CONFIG.packages)
  portfolioData.schedule = fillMissingObject(portfolioData.schedule, DEFAULT_V11_CONFIG.schedule)
  portfolioData.homePortfolioCard = fillMissingObject(portfolioData.homePortfolioCard, DEFAULT_V11_CONFIG.homePortfolioCard)
  portfolioData.testimonials = Array.isArray(portfolioData.testimonials)
    ? portfolioData.testimonials
    : deepClone(DEFAULT_V11_CONFIG.testimonials)
  portfolioData.consultButton = fillMissingObject(portfolioData.consultButton, DEFAULT_V11_CONFIG.consultButton)
  portfolioData.quickJump = normalizeQuickJumpConfig(portfolioData.quickJump)
  portfolioData.consultation = fillMissingObject(portfolioData.consultation, DEFAULT_V11_CONFIG.consultation)
  portfolioData.serviceFlow = fillMissingObject(portfolioData.serviceFlow, DEFAULT_V11_CONFIG.serviceFlow)
  portfolioData.faq = fillMissingObject(portfolioData.faq, DEFAULT_V11_CONFIG.faq)
  portfolioData.photographers = Array.isArray(portfolioData.photographers)
    ? portfolioData.photographers
    : deepClone(DEFAULT_V11_CONFIG.photographers)
  portfolioData.stores = Array.isArray(portfolioData.stores)
    ? portfolioData.stores
    : deepClone(DEFAULT_V11_CONFIG.stores)

  return portfolioData
}

function setJsonTextarea(id, value) {
  document.getElementById(id).value = JSON.stringify(value, null, 2)
}

function parseJsonTextarea(id, label) {
  const raw = document.getElementById(id).value.trim()

  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new Error(`${label} 的高级配置格式不正确：${error.message}`)
  }
}

function requireArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} 的高级配置必须是列表格式`)
  }
}

function renderContentModuleStructuredEditors(config) {
  renderPackageEditor(config.packages || [])
  renderScheduleEditor(config.schedule || {})
  renderHomePortfolioCardEditor(config.homePortfolioCard || {})
  renderTestimonialEditor(config.testimonials || [])
  renderConsultButtonEditor(config.consultButton || {})
  renderQuickJumpEditor(config.quickJump || {})
  renderServiceFlowEditor(config.serviceFlow || {})
  renderFaqEditor(config.faq || {})
  renderPhotographerEditor(config.photographers || [])
  renderStoreEditor(config.stores || [])
}

function editorCardClass(item) {
  return `editor-card ${item?.enabled === false ? 'is-disabled' : ''}`
}

function editorStatusBadge(item) {
  return item?.enabled === false ? '<span class="status-badge">已下架</span>' : ''
}

function editorVisibilityButton(item) {
  return item?.enabled === false ? '恢复' : '下架'
}

function editorVisibilityCheckbox(item) {
  return `
    <label style="display: flex; align-items: center; gap: 8px;">
      <input type="checkbox" data-field="enabled" ${item?.enabled !== false ? 'checked' : ''}> 在小程序展示
    </label>
  `
}

function editorHiddenInput(field, value = '') {
  return `<input type="hidden" data-field="${field}" value="${escapeHtml(value)}">`
}

function editorAdvancedPanel(summary, content) {
  return `
    <details class="inline-advanced-panel">
      <summary>${escapeHtml(summary)}</summary>
      <div class="advanced-help">不确定时留空即可，普通展示不需要填写。</div>
      ${content}
    </details>
  `
}

function renderPackageEditor(packages) {
  const container = document.getElementById('packageEditorList')
  if (!container) return

  if (!packages.length) {
    container.innerHTML = '<div style="color: #78716c; font-size: 13px;">暂无套餐，点击“新增套餐”。</div>'
    return
  }

  container.innerHTML = packages.map((item, index) => {
    const itemId = item.id || createUniqueId('package', item.name || `套餐 ${index + 1}`, packages.map(packageItem => packageItem.id))
    return `
    <div data-index="${index}" class="${editorCardClass(item)}" style="background: #fff; border: 1px solid #e7e5e4; border-radius: 8px; padding: 14px; margin-bottom: 12px;">
      ${editorHiddenInput('id', itemId)}
      <div class="editor-card-header">
        <strong>${escapeHtml(item.name || `套餐 ${index + 1}`)}${editorStatusBadge(item)}</strong>
        <button class="btn btn-secondary" type="button" onclick="removePackageEditorItem(${index})">${editorVisibilityButton(item)}</button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;">
        ${editorInput('name', '套餐名称', item.name, '个人写真基础套餐')}
        ${editorInput('priceText', '价格文案', item.priceText, '¥699 起')}
        ${editorInput('subtitle', '副标题', item.subtitle, '适合头像、生日纪念')}
        ${editorInput('duration', '拍摄时长', item.duration, '约 2 小时')}
        ${editorInput('retouchCount', '精修数量', item.retouchCount, '6 张精修')}
        ${editorInput('originalPhotos', '底片说明', item.originalPhotos, '底片精选交付')}
        ${editorInput('makeupText', '妆造说明', item.makeupText, '含基础妆造')}
        ${editorInput('sort', '排序', item.sort ?? index + 1, '1', 'number')}
        ${editorVisibilityCheckbox(item)}
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" data-field="isRecommended" ${item.isRecommended ? 'checked' : ''}> 首页推荐
        </label>
      </div>
      ${editorTextarea('includes', '包含服务（一行一个）', item.includes)}
      ${editorTextarea('suitableFor', '适合人群（一行一个）', item.suitableFor)}
      ${editorAdvancedPanel('高级关联', `
        ${editorTextarea('relatedSeriesIds', '关联作品集（一行一个）', item.relatedSeriesIds)}
        ${editorTextarea('relatedPhotographerIds', '关联摄影师（一行一个）', item.relatedPhotographerIds)}
      `)}
    </div>
  `
  }).join('')
}

function renderScheduleEditor(schedule) {
  setCheckedValue('scheduleEnabled', schedule.enabled !== false)
  setInputValue('scheduleTitle', schedule.title || '')
  setInputValue('scheduleAvailableText', schedule.availableText || '')
  setInputValue('scheduleNotice', schedule.notice || '')
  setInputValue('scheduleRestDays', listToTextarea(schedule.restDays))
  setInputValue('scheduleBusyDates', listToTextarea(schedule.busyDates))
  setInputValue('scheduleSpecialNotes', listToTextarea(schedule.specialNotes))
}

function renderTestimonialEditor(testimonials) {
  const container = document.getElementById('testimonialEditorList')
  if (!container) return

  if (!testimonials.length) {
    container.innerHTML = '<div style="color: #78716c; font-size: 13px;">暂无评价，点击“新增评价”。</div>'
    return
  }

  container.innerHTML = testimonials.map((item, index) => {
    const itemId = item.id || createUniqueId('review', item.name || `评价 ${index + 1}`, testimonials.map(review => review.id))
    return `
    <div data-index="${index}" class="${editorCardClass(item)}" style="background: #fff; border: 1px solid #e7e5e4; border-radius: 8px; padding: 14px; margin-bottom: 12px;">
      ${editorHiddenInput('id', itemId)}
      <div class="editor-card-header">
        <strong>${escapeHtml(item.name || `评价 ${index + 1}`)}${editorStatusBadge(item)}</strong>
        <button class="btn btn-secondary" type="button" onclick="removeTestimonialEditorItem(${index})">${editorVisibilityButton(item)}</button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;">
        ${editorInput('name', '客户称呼', item.name, '客户称呼')}
        ${editorInput('shootType', '拍摄类型', item.shootType, '个人写真')}
        ${editorInput('dateText', '时间文案', item.dateText, '2026 年 6 月')}
        ${editorAssetInput('imageUrl', '评价图片', item.imageUrl, '', 'testimonial')}
        ${editorInput('sort', '排序', item.sort ?? index + 1, '1', 'number')}
        ${editorVisibilityCheckbox(item)}
      </div>
      ${editorTextarea('content', '评价内容', item.content ? [item.content] : [], 4)}
      ${editorAdvancedPanel('高级关联', `
        ${editorInput('relatedSeriesId', '关联作品集', item.relatedSeriesId, '')}
        ${editorInput('relatedPackageId', '关联套餐', item.relatedPackageId, '')}
      `)}
    </div>
  `
  }).join('')
}

function renderConsultButtonEditor(consultButton) {
  setCheckedValue('consultButtonEnabled', consultButton.enabled !== false)
  setInputValue('consultButtonText', consultButton.text || '')
  setInputValue('consultButtonAction', consultButton.action || 'booking')

  const showOnPages = Array.isArray(consultButton.showOnPages) ? consultButton.showOnPages : []
  document.querySelectorAll('[data-consult-page]').forEach(input => {
    input.checked = showOnPages.includes(input.dataset.consultPage)
  })
}

function renderQuickJumpEditor(quickJump) {
  setCheckedValue('quickJumpEnabled', quickJump.enabled !== false)
  setInputValue('quickJumpBookingText', quickJump.bookingText || '咨询')
  setInputValue('quickJumpPortfolioText', quickJump.portfolioText || '作品集')
}

function renderHomePortfolioCardEditor(homePortfolioCard) {
  setCheckedValue('homeCardShowPhotoCount', Boolean(homePortfolioCard.showPhotoCount))
  setCheckedValue('homeCardShowDescription', Boolean(homePortfolioCard.showDescription))
  setCheckedValue('homeCardShowTags', Boolean(homePortfolioCard.showTags))
}

function renderServiceFlowEditor(serviceFlow) {
  setCheckedValue('serviceFlowEnabled', serviceFlow.enabled !== false)
  const steps = Array.isArray(serviceFlow.steps) ? serviceFlow.steps : []
  const container = document.getElementById('serviceFlowEditorList')
  if (!container) return

  if (!steps.length) {
    container.innerHTML = '<div style="color: #78716c; font-size: 13px;">暂无服务流程，点击“新增步骤”。</div>'
    return
  }

  container.innerHTML = steps.map((item, index) => `
    <div data-index="${index}" style="background: #fff; border: 1px solid #e7e5e4; border-radius: 8px; padding: 14px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 12px;">
        <strong>步骤 ${index + 1}</strong>
        <button class="btn btn-secondary" type="button" onclick="removeServiceFlowEditorItem(${index})">删除步骤</button>
      </div>
      ${editorInput('title', '步骤标题', item.title, '咨询沟通')}
      ${editorTextarea('description', '步骤说明', item.description ? [item.description] : [], 3)}
    </div>
  `).join('')
}

function renderFaqEditor(faq) {
  setCheckedValue('faqEnabled', faq.enabled !== false)
  const items = Array.isArray(faq.items) ? faq.items : []
  const container = document.getElementById('faqEditorList')
  if (!container) return

  if (!items.length) {
    container.innerHTML = '<div style="color: #78716c; font-size: 13px;">暂无常见问题，点击“新增问题”。</div>'
    return
  }

  container.innerHTML = items.map((item, index) => `
    <div data-index="${index}" style="background: #fff; border: 1px solid #e7e5e4; border-radius: 8px; padding: 14px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 12px;">
        <strong>问题 ${index + 1}</strong>
        <button class="btn btn-secondary" type="button" onclick="removeFaqEditorItem(${index})">删除问题</button>
      </div>
      ${editorInput('question', '问题', item.question, '拍摄前需要准备什么？')}
      ${editorTextarea('answer', '回答', item.answer ? [item.answer] : [], 3)}
    </div>
  `).join('')
}

function renderPhotographerEditor(photographers) {
  const container = document.getElementById('photographerEditorList')
  if (!container) return

  if (!photographers.length) {
    container.innerHTML = '<div style="color: #78716c; font-size: 13px;">暂无团队摄影师，点击“新增摄影师”。个人摄影师资料仍可在“编辑资料”中维护。</div>'
    return
  }

  container.innerHTML = photographers.map((item, index) => {
    const itemId = item.id || createUniqueId('photographer', item.name || `摄影师 ${index + 1}`, photographers.map(photographer => photographer.id))
    return `
    <div data-index="${index}" class="${editorCardClass(item)}" style="background: #fff; border: 1px solid #e7e5e4; border-radius: 8px; padding: 14px; margin-bottom: 12px;">
      ${editorHiddenInput('id', itemId)}
      <div class="editor-card-header">
        <strong>${escapeHtml(item.name || `摄影师 ${index + 1}`)}${editorStatusBadge(item)}</strong>
        <button class="btn btn-secondary" type="button" onclick="removePhotographerEditorItem(${index})">${editorVisibilityButton(item)}</button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;">
        ${editorInput('name', '姓名', item.name, '阿泽')}
        ${editorInput('title', '职称/标签', item.title, '人像摄影师')}
        ${editorAssetInput('avatar', '头像图片', item.avatar, 'avatar/photographer.jpg', 'avatar')}
        ${editorInput('sort', '排序', item.sort ?? index + 1, '1', 'number')}
        ${editorVisibilityCheckbox(item)}
      </div>
      ${editorTextarea('bio', '简介', item.bio ? [item.bio] : [], 3)}
      ${editorTextarea('skills', '擅长技能（一行一个）', item.skills)}
      ${editorAdvancedPanel('高级关联', `
        ${editorTextarea('relatedSeriesIds', '关联作品集（一行一个）', item.relatedSeriesIds)}
        ${editorTextarea('relatedPackageIds', '关联套餐（一行一个）', item.relatedPackageIds)}
      `)}
    </div>
  `
  }).join('')
}

function renderStoreEditor(stores) {
  const container = document.getElementById('storeEditorList')
  if (!container) return

  if (!stores.length) {
    container.innerHTML = '<div style="color: #78716c; font-size: 13px;">暂无门店，点击“新增门店”。</div>'
    return
  }

  container.innerHTML = stores.map((item, index) => {
    const itemId = item.id || createUniqueId('store', item.name || `门店 ${index + 1}`, stores.map(store => store.id))
    return `
    <div data-index="${index}" class="${editorCardClass(item)}" style="background: #fff; border: 1px solid #e7e5e4; border-radius: 8px; padding: 14px; margin-bottom: 12px;">
      ${editorHiddenInput('id', itemId)}
      <div class="editor-card-header">
        <strong>${escapeHtml(item.name || `门店 ${index + 1}`)}${editorStatusBadge(item)}</strong>
        <button class="btn btn-secondary" type="button" onclick="removeStoreEditorItem(${index})">${editorVisibilityButton(item)}</button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;">
        ${editorInput('name', '门店名称', item.name, '主理人工作室')}
        ${editorInput('phone', '电话', item.phone, '13800000000')}
        ${editorInput('businessHours', '营业时间', item.businessHours, '10:00 - 20:00')}
        ${editorInput('latitude', '纬度', item.latitude ?? '', '30.000000', 'number')}
        ${editorInput('longitude', '经度', item.longitude ?? '', '120.000000', 'number')}
        ${editorInput('sort', '排序', item.sort ?? index + 1, '1', 'number')}
        ${editorVisibilityCheckbox(item)}
      </div>
      ${editorTextarea('address', '门店地址', item.address ? [item.address] : [], 2)}
      ${editorTextarea('transportTips', '交通提示', item.transportTips ? [item.transportTips] : [], 2)}
    </div>
  `
  }).join('')
}

function editorInput(field, label, value = '', placeholder = '', type = 'text', readonly = false) {
  const readonlyAttr = readonly ? ' readonly' : ''
  const readonlyStyle = readonly ? ' style="background: #f5f5f4; color: #78716c;"' : ''

  return `
    <label style="display: block;">
      <span style="display: block; font-size: 12px; color: #57534e; margin-bottom: 4px;">${label}</span>
      <input type="${type}" data-field="${field}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}"${readonlyAttr}${readonlyStyle}>
    </label>
  `
}

function editorAssetInput(field, label, value = '', placeholder = '', folder = 'avatar') {
  return `
    <label style="display: block;">
      <span style="display: block; font-size: 12px; color: #57534e; margin-bottom: 4px;">${label}</span>
      <div style="display: flex; gap: 8px;">
        <input type="text" data-field="${field}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}">
        <button class="btn btn-secondary" type="button" onclick="selectContentAsset(this, '${escapeHtml(folder)}')" style="white-space: nowrap;">上传</button>
      </div>
    </label>
  `
}

function editorTextarea(field, label, value, rows = 3) {
  return `
    <label style="display: block; margin-top: 12px;">
      <span style="display: block; font-size: 12px; color: #57534e; margin-bottom: 4px;">${label}</span>
      <textarea data-field="${field}" rows="${rows}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">${escapeHtml(listToTextarea(value))}</textarea>
    </label>
  `
}

function setInputValue(id, value) {
  const el = document.getElementById(id)
  if (el) el.value = value
}

function setCheckedValue(id, value) {
  const el = document.getElementById(id)
  if (el) el.checked = Boolean(value)
}

function selectContentAsset(button, folder) {
  const wrapper = button.closest('label')
  const input = wrapper?.querySelector('input[data-field]')
  const fileInput = document.getElementById('contentAssetInput')

  if (!input || !fileInput) {
    showToast('未找到图片字段', 'error')
    return
  }

  contentAssetUploadTarget = { input, folder }
  fileInput.accept = folder === 'share' ? 'image/jpeg,image/png' : 'image/*'
  fileInput.value = ''
  fileInput.click()
}

async function handleContentAssetSelected(event) {
  const file = event.target.files?.[0]
  if (!file || !contentAssetUploadTarget) return
  const target = contentAssetUploadTarget

  const formData = new FormData()
  formData.append('asset', file)
  formData.append('folder', target.folder)

  try {
    showToast('正在上传图片...', 'info')
    const response = await fetch(`${CONFIG.apiUrl}/upload/asset`, {
      method: 'POST',
      body: formData
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.error || '上传失败')

    target.input.value = result.assetPath
    if (target.folder === 'share') {
      updateHomeSharePreview(result.assetPath)
    }
    showToast('图片已上传，请点击保存更新小程序', 'success')
  } catch (error) {
    console.error('内容图片上传失败:', error)
    showToast('图片上传失败: ' + error.message, 'error')
  } finally {
    contentAssetUploadTarget = null
    event.target.accept = 'image/*'
    event.target.value = ''
  }
}

function getFieldValue(card, field) {
  const el = card.querySelector(`[data-field="${field}"]`)
  return el ? String(el.value || '').trim() : ''
}

function getFieldChecked(card, field) {
  const el = card.querySelector(`[data-field="${field}"]`)
  return el ? Boolean(el.checked) : false
}

function readPackageEditor() {
  return Array.from(document.querySelectorAll('#packageEditorList [data-index]')).map((card, index) => {
    const id = getFieldValue(card, 'id')
    const name = getFieldValue(card, 'name')

    if (!id || !name) {
      throw new Error(`第 ${index + 1} 个套餐必须填写套餐名称`)
    }

    return {
      id,
      name,
      priceText: getFieldValue(card, 'priceText'),
      subtitle: getFieldValue(card, 'subtitle'),
      duration: getFieldValue(card, 'duration'),
      retouchCount: getFieldValue(card, 'retouchCount'),
      originalPhotos: getFieldValue(card, 'originalPhotos'),
      makeupText: getFieldValue(card, 'makeupText'),
      includes: parseListInput(getFieldValue(card, 'includes')),
      suitableFor: parseListInput(getFieldValue(card, 'suitableFor')),
      relatedSeriesIds: parseListInput(getFieldValue(card, 'relatedSeriesIds')),
      relatedPhotographerIds: parseListInput(getFieldValue(card, 'relatedPhotographerIds')),
      isRecommended: getFieldChecked(card, 'isRecommended'),
      sort: Number(getFieldValue(card, 'sort')) || index + 1,
      enabled: getFieldChecked(card, 'enabled')
    }
  })
}

function readScheduleEditor() {
  return {
    enabled: Boolean(document.getElementById('scheduleEnabled')?.checked),
    title: document.getElementById('scheduleTitle')?.value.trim() || '',
    availableText: document.getElementById('scheduleAvailableText')?.value.trim() || '',
    notice: document.getElementById('scheduleNotice')?.value.trim() || '',
    restDays: parseListInput(document.getElementById('scheduleRestDays')?.value || ''),
    busyDates: parseListInput(document.getElementById('scheduleBusyDates')?.value || ''),
    specialNotes: parseListInput(document.getElementById('scheduleSpecialNotes')?.value || '')
  }
}

function readTestimonialEditor() {
  return Array.from(document.querySelectorAll('#testimonialEditorList [data-index]')).map((card, index) => {
    const id = getFieldValue(card, 'id')
    const name = getFieldValue(card, 'name')
    const content = getFieldValue(card, 'content')

    if (!id || !name || !content) {
      throw new Error(`第 ${index + 1} 条评价必须填写客户称呼和评价内容`)
    }

    return {
      id,
      name,
      shootType: getFieldValue(card, 'shootType'),
      content,
      imageUrl: getFieldValue(card, 'imageUrl'),
      relatedSeriesId: getFieldValue(card, 'relatedSeriesId'),
      relatedPackageId: getFieldValue(card, 'relatedPackageId'),
      dateText: getFieldValue(card, 'dateText'),
      sort: Number(getFieldValue(card, 'sort')) || index + 1,
      enabled: getFieldChecked(card, 'enabled')
    }
  })
}

function readConsultButtonEditor() {
  return {
    enabled: Boolean(document.getElementById('consultButtonEnabled')?.checked),
    text: document.getElementById('consultButtonText')?.value.trim() || '',
    action: document.getElementById('consultButtonAction')?.value || 'booking',
    showOnPages: Array.from(document.querySelectorAll('[data-consult-page]'))
      .filter(input => input.checked)
      .map(input => input.dataset.consultPage)
  }
}

function readQuickJumpEditor() {
  return {
    enabled: Boolean(document.getElementById('quickJumpEnabled')?.checked),
    bookingText: document.getElementById('quickJumpBookingText')?.value.trim() || '咨询',
    portfolioText: document.getElementById('quickJumpPortfolioText')?.value.trim() || '作品集'
  }
}

function readHomePortfolioCardEditor() {
  return {
    showPhotoCount: Boolean(document.getElementById('homeCardShowPhotoCount')?.checked),
    showDescription: Boolean(document.getElementById('homeCardShowDescription')?.checked),
    showTags: Boolean(document.getElementById('homeCardShowTags')?.checked)
  }
}

function readServiceFlowEditor() {
  return {
    enabled: Boolean(document.getElementById('serviceFlowEnabled')?.checked),
    steps: Array.from(document.querySelectorAll('#serviceFlowEditorList [data-index]')).map((card, index) => {
      const title = getFieldValue(card, 'title')
      const description = getFieldValue(card, 'description')

      if (!title || !description) {
        throw new Error(`第 ${index + 1} 个服务流程步骤必须填写标题和说明`)
      }

      return { title, description }
    })
  }
}

function readFaqEditor() {
  return {
    enabled: Boolean(document.getElementById('faqEnabled')?.checked),
    items: Array.from(document.querySelectorAll('#faqEditorList [data-index]')).map((card, index) => {
      const question = getFieldValue(card, 'question')
      const answer = getFieldValue(card, 'answer')

      if (!question || !answer) {
        throw new Error(`第 ${index + 1} 个常见问题必须填写问题和回答`)
      }

      return { question, answer }
    })
  }
}

function readPhotographerEditor() {
  return Array.from(document.querySelectorAll('#photographerEditorList [data-index]')).map((card, index) => {
    const id = getFieldValue(card, 'id')
    const name = getFieldValue(card, 'name')

    if (!id || !name) {
      throw new Error(`第 ${index + 1} 个摄影师必须填写姓名`)
    }

    return {
      id,
      name,
      title: getFieldValue(card, 'title'),
      avatar: getFieldValue(card, 'avatar'),
      bio: getFieldValue(card, 'bio'),
      skills: parseListInput(getFieldValue(card, 'skills')),
      relatedSeriesIds: parseListInput(getFieldValue(card, 'relatedSeriesIds')),
      relatedPackageIds: parseListInput(getFieldValue(card, 'relatedPackageIds')),
      sort: Number(getFieldValue(card, 'sort')) || index + 1,
      enabled: getFieldChecked(card, 'enabled')
    }
  })
}

function readStoreEditor() {
  return Array.from(document.querySelectorAll('#storeEditorList [data-index]')).map((card, index) => {
    const id = getFieldValue(card, 'id')
    const name = getFieldValue(card, 'name')

    if (!id || !name) {
      throw new Error(`第 ${index + 1} 个门店必须填写门店名称`)
    }

    const latitude = getFieldValue(card, 'latitude')
    const longitude = getFieldValue(card, 'longitude')

    return {
      id,
      name,
      address: getFieldValue(card, 'address'),
      phone: getFieldValue(card, 'phone'),
      businessHours: getFieldValue(card, 'businessHours'),
      transportTips: getFieldValue(card, 'transportTips'),
      latitude: latitude ? Number(latitude) : null,
      longitude: longitude ? Number(longitude) : null,
      sort: Number(getFieldValue(card, 'sort')) || index + 1,
      enabled: getFieldChecked(card, 'enabled')
    }
  })
}

function syncStructuredContentToJson() {
  setJsonTextarea('v11PackagesJson', readPackageEditor())
  setJsonTextarea('v11ScheduleJson', readScheduleEditor())
  setJsonTextarea('v11HomePortfolioCardJson', readHomePortfolioCardEditor())
  setJsonTextarea('v11TestimonialsJson', readTestimonialEditor())
  setJsonTextarea('v11ConsultButtonJson', readConsultButtonEditor())
  setJsonTextarea('v11QuickJumpJson', readQuickJumpEditor())
  setJsonTextarea('v11ServiceFlowJson', readServiceFlowEditor())
  setJsonTextarea('v11FaqJson', readFaqEditor())
  setJsonTextarea('v11PhotographersJson', readPhotographerEditor())
  setJsonTextarea('v11StoresJson', readStoreEditor())
}

function addPackageEditorItem() {
  const packages = readPackageEditor()
  packages.push({
    id: createUniqueId('package', `套餐 ${packages.length + 1}`, packages.map(item => item.id)),
    name: '新套餐',
    priceText: '',
    subtitle: '',
    includes: [],
    suitableFor: [],
    relatedSeriesIds: [],
    relatedPhotographerIds: [],
    sort: packages.length + 1,
    enabled: true
  })
  renderPackageEditor(packages)
  setJsonTextarea('v11PackagesJson', packages)
}

function removePackageEditorItem(index) {
  const packages = readPackageEditor()
  if (packages[index]) {
    packages[index].enabled = packages[index].enabled === false
  }
  renderPackageEditor(packages)
  setJsonTextarea('v11PackagesJson', packages)
}

function addTestimonialEditorItem() {
  const testimonials = readTestimonialEditor()
  testimonials.push({
    id: createUniqueId('review', `评价 ${testimonials.length + 1}`, testimonials.map(item => item.id)),
    name: '新客户',
    shootType: '',
    content: '这里填写客户评价内容。',
    sort: testimonials.length + 1,
    enabled: true
  })
  renderTestimonialEditor(testimonials)
  setJsonTextarea('v11TestimonialsJson', testimonials)
}

function removeTestimonialEditorItem(index) {
  const testimonials = readTestimonialEditor()
  if (testimonials[index]) {
    testimonials[index].enabled = testimonials[index].enabled === false
  }
  renderTestimonialEditor(testimonials)
  setJsonTextarea('v11TestimonialsJson', testimonials)
}

function addServiceFlowEditorItem() {
  const serviceFlow = readServiceFlowEditor()
  serviceFlow.steps.push({
    title: '新步骤',
    description: '这里填写服务流程说明。'
  })
  renderServiceFlowEditor(serviceFlow)
  setJsonTextarea('v11ServiceFlowJson', serviceFlow)
}

function removeServiceFlowEditorItem(index) {
  const serviceFlow = readServiceFlowEditor()
  serviceFlow.steps.splice(index, 1)
  renderServiceFlowEditor(serviceFlow)
  setJsonTextarea('v11ServiceFlowJson', serviceFlow)
}

function addFaqEditorItem() {
  const faq = readFaqEditor()
  faq.items.push({
    question: '新问题',
    answer: '这里填写回答。'
  })
  renderFaqEditor(faq)
  setJsonTextarea('v11FaqJson', faq)
}

function removeFaqEditorItem(index) {
  const faq = readFaqEditor()
  faq.items.splice(index, 1)
  renderFaqEditor(faq)
  setJsonTextarea('v11FaqJson', faq)
}

function addPhotographerEditorItem() {
  const photographers = readPhotographerEditor()
  photographers.push({
    id: createUniqueId('photographer', `摄影师 ${photographers.length + 1}`, photographers.map(item => item.id)),
    name: '新摄影师',
    title: '',
    avatar: '',
    bio: '',
    skills: [],
    relatedSeriesIds: [],
    relatedPackageIds: [],
    sort: photographers.length + 1,
    enabled: true
  })
  renderPhotographerEditor(photographers)
  setJsonTextarea('v11PhotographersJson', photographers)
}

function removePhotographerEditorItem(index) {
  const photographers = readPhotographerEditor()
  if (photographers[index]) {
    photographers[index].enabled = photographers[index].enabled === false
  }
  renderPhotographerEditor(photographers)
  setJsonTextarea('v11PhotographersJson', photographers)
}

function addStoreEditorItem() {
  const stores = readStoreEditor()
  stores.push({
    id: createUniqueId('store', `门店 ${stores.length + 1}`, stores.map(item => item.id)),
    name: '新门店',
    address: '',
    phone: '',
    businessHours: '',
    transportTips: '',
    latitude: null,
    longitude: null,
    sort: stores.length + 1,
    enabled: true
  })
  renderStoreEditor(stores)
  setJsonTextarea('v11StoresJson', stores)
}

function removeStoreEditorItem(index) {
  const stores = readStoreEditor()
  if (stores[index]) {
    stores[index].enabled = stores[index].enabled === false
  }
  renderStoreEditor(stores)
  setJsonTextarea('v11StoresJson', stores)
}

function openContentModulesModal() {
  const config = ensureV11Config()

  setJsonTextarea('v11ModulesJson', config.modules)
  setJsonTextarea('v11ThemeJson', config.theme)
  setJsonTextarea('v11PackagesJson', config.packages)
  setJsonTextarea('v11ScheduleJson', config.schedule)
  setJsonTextarea('v11HomePortfolioCardJson', config.homePortfolioCard)
  setJsonTextarea('v11TestimonialsJson', config.testimonials)
  setJsonTextarea('v11ConsultButtonJson', config.consultButton)
  setJsonTextarea('v11QuickJumpJson', config.quickJump)
  setJsonTextarea('v11ServiceFlowJson', config.serviceFlow)
  setJsonTextarea('v11FaqJson', config.faq)
  setJsonTextarea('v11PhotographersJson', config.photographers)
  setJsonTextarea('v11StoresJson', config.stores)
  renderContentModuleStructuredEditors(config)

  document.getElementById('v11ConsultationTitle').value = config.consultation.title || ''
  document.getElementById('v11ConsultationDescription').value = config.consultation.description || ''
  document.getElementById('v11ConsultationTemplate').value = config.consultation.template || DEFAULT_CONSULTATION_TEMPLATE
  document.getElementById('v11ConsultationPrivacyTip').value = config.consultation.privacyTip || ''

  openModal('contentModulesModal')
}

async function saveContentModules() {
  try {
    syncStructuredContentToJson()

    const modules = parseJsonTextarea('v11ModulesJson', '模块开关')
    const theme = parseJsonTextarea('v11ThemeJson', '主题设置')
    const packages = parseJsonTextarea('v11PackagesJson', '套餐')
    const schedule = parseJsonTextarea('v11ScheduleJson', '档期')
    const homePortfolioCard = parseJsonTextarea('v11HomePortfolioCardJson', '首页作品卡片')
    const testimonials = parseJsonTextarea('v11TestimonialsJson', '客户评价')
    const consultButton = parseJsonTextarea('v11ConsultButtonJson', '固定咨询按钮')
    const quickJump = parseJsonTextarea('v11QuickJumpJson', '右下角快捷入口')
    const serviceFlow = parseJsonTextarea('v11ServiceFlowJson', '服务流程')
    const faq = parseJsonTextarea('v11FaqJson', '常见问题')
    const photographers = parseJsonTextarea('v11PhotographersJson', '摄影师列表')
    const stores = parseJsonTextarea('v11StoresJson', '门店列表')

    requireArray(packages, '套餐')
    requireArray(testimonials, '客户评价')
    requireArray(photographers, '摄影师列表')
    requireArray(stores, '门店列表')

    const consultation = {
      title: document.getElementById('v11ConsultationTitle').value.trim(),
      description: document.getElementById('v11ConsultationDescription').value.trim(),
      template: document.getElementById('v11ConsultationTemplate').value.trim(),
      privacyTip: document.getElementById('v11ConsultationPrivacyTip').value.trim()
    }

    if (!consultation.title || !consultation.description || !consultation.template || !consultation.privacyTip) {
      throw new Error('请填写完整的咨询模板设置')
    }

    portfolioData.configVersion = DEFAULT_V11_CONFIG.configVersion
    portfolioData.modules = modules
    portfolioData.theme = theme
    portfolioData.packages = packages
    portfolioData.schedule = schedule
    portfolioData.homePortfolioCard = homePortfolioCard
    portfolioData.testimonials = testimonials
    portfolioData.consultButton = consultButton
    portfolioData.quickJump = normalizeQuickJumpConfig(quickJump)
    portfolioData.consultation = consultation
    portfolioData.serviceFlow = serviceFlow
    portfolioData.faq = faq
    portfolioData.photographers = photographers
    portfolioData.stores = stores

    const success = await saveConfig()
    if (success) {
      closeModal('contentModulesModal')
      showToast('内容已保存，小程序会显示最新内容', 'success')
    }
  } catch (error) {
    showToast(error.message, 'error')
  }
}

// 打开编辑个人资料模态框
function openProfileModal() {
  if (!portfolioData.photographer) {
    // 初始化默认数据 (如果配置文件中还没有)
    portfolioData.photographer = {
      name: '',
      title: '',
      location: '',
      avatar: '',
      bio: '',
      stats: PROFILE_STAT_FIELDS.map(field => ({ value: field.fallbackValue, label: field.label })),
      skills: [],
      contact: { wechat: '', email: '' },
      studio: { name: '', address: '', latitude: null, longitude: null }
    }
  }

  const p = portfolioData.photographer
  if (!p.studio) {
    p.studio = { name: '', address: '', latitude: null, longitude: null }
  }
  document.getElementById('profileName').value = p.name || ''
  document.getElementById('profileTitle').value = p.title || ''
  document.getElementById('profileLocation').value = p.location || ''
  document.getElementById('profileAvatar').value = p.avatar || ''
  renderProfileAvatarPreview(p.avatar)
  document.getElementById('profileAboutBanner').value = 'banner/about-banner.jpg'
  renderProfileAboutBannerPreview()
  PROFILE_STAT_FIELDS.forEach((field, index) => {
    const currentStat = (p.stats || [])[index] || {}
    document.getElementById(field.inputId).value = currentStat.value || field.fallbackValue
  })
  document.getElementById('profileBio').value = p.bio || ''
  document.getElementById('profileSkills').value = (p.skills || []).join('，')
  document.getElementById('profileWechat').value = p.contact?.wechat || ''
  document.getElementById('profileEmail').value = p.contact?.email || ''
  document.getElementById('profileStudioName').value = p.studio?.name || ''
  document.getElementById('profileStudioAddress').value = p.studio?.address || ''
  document.getElementById('profileStudioLatitude').value = p.studio?.latitude ?? ''
  document.getElementById('profileStudioLongitude').value = p.studio?.longitude ?? ''

  openModal('profileModal')
}

function renderProfileAvatarPreview(avatarPathOrUrl) {
  const preview = document.getElementById('profileAvatarPreview')
  const empty = document.getElementById('profileAvatarEmpty')
  const value = String(avatarPathOrUrl || '')
  const src = value.startsWith('http') || value.startsWith('data:')
    ? value
    : getCosAssetUrl(value)

  if (!preview || !empty) return

  if (!src) {
    preview.style.display = 'none'
    preview.src = ''
    empty.style.display = 'flex'
    return
  }

  preview.onload = () => {
    preview.style.display = 'block'
    empty.style.display = 'none'
  }
  preview.onerror = () => {
    preview.style.display = 'none'
    empty.style.display = 'flex'
  }
  preview.src = src.startsWith('data:')
    ? src
    : `${src}${src.includes('?') ? '&' : '?'}t=${Date.now()}`
}

function renderProfileAboutBannerPreview(srcOverride = '') {
  const preview = document.getElementById('profileAboutBannerPreview')
  const empty = document.getElementById('profileAboutBannerEmpty')
  if (!preview || !empty) return

  const src = srcOverride || getCosAssetUrl('banner/about-banner.jpg')

  if (!src) {
    preview.style.display = 'none'
    preview.src = ''
    empty.style.display = 'flex'
    return
  }

  preview.onload = () => {
    preview.style.display = 'block'
    empty.style.display = 'none'
  }
  preview.onerror = () => {
    preview.style.display = 'none'
    empty.style.display = 'flex'
  }
  preview.src = src.startsWith('data:')
    ? src
    : `${src}${src.includes('?') ? '&' : '?'}t=${Date.now()}`
}

// 保存个人资料
async function saveProfile() {
  const p = portfolioData.photographer
  p.name = document.getElementById('profileName').value.trim()
  p.title = document.getElementById('profileTitle').value.trim()
  p.location = document.getElementById('profileLocation').value.trim()
  p.avatar = document.getElementById('profileAvatar').value.trim()
  p.bio = document.getElementById('profileBio').value.trim()
  p.stats = PROFILE_STAT_FIELDS.map(field => ({
    value: document.getElementById(field.inputId).value.trim() || field.fallbackValue,
    label: field.label
  }))

  // 处理技能标签
  const skillsStr = document.getElementById('profileSkills').value.trim()
  if (skillsStr) {
    // 支持中英文逗号
    p.skills = skillsStr.split(/[,，]/).map(s => s.trim()).filter(s => s)
  } else {
    p.skills = []
  }

  if (!p.contact) p.contact = {}
  p.contact.wechat = document.getElementById('profileWechat').value.trim()
  p.contact.email = document.getElementById('profileEmail').value.trim()

  const studioName = document.getElementById('profileStudioName').value.trim()
  const studioAddress = document.getElementById('profileStudioAddress').value.trim()
  const latitudeInput = document.getElementById('profileStudioLatitude').value.trim()
  const longitudeInput = document.getElementById('profileStudioLongitude').value.trim()
  const hasCoordinateInput = latitudeInput || longitudeInput

  let latitude = null
  let longitude = null

  if (hasCoordinateInput) {
    if (!latitudeInput || !longitudeInput) {
      showToast('请同时填写纬度和经度', 'error')
      return
    }

    latitude = Number(latitudeInput)
    longitude = Number(longitudeInput)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      showToast('经纬度必须是有效数字', 'error')
      return
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      showToast('经纬度超出有效范围', 'error')
      return
    }
  }

  p.studio = {
    name: studioName,
    address: studioAddress,
    latitude,
    longitude
  }

  // 简单验证
  if (!p.name) {
    showToast('姓名不能为空', 'error')
    return
  }

  const success = await saveConfig()
  if (success) {
    closeModal('profileModal')
    showToast('个人资料已更新', 'success')
  }
}

// 打开设置模态框
async function openSettingsModal() {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/settings`)
    const result = await response.json()

    if (result.success) {
      document.getElementById('settingSecretId').value = result.config.SecretId
      document.getElementById('settingSecretKey').value = result.config.SecretKey
      document.getElementById('settingBucket').value = result.config.Bucket
      document.getElementById('settingRegion').value = result.config.Region
      document.getElementById('settingAppID').value = result.config.AppID

      // 重置日志区域
      const logDiv = document.getElementById('syncLogs')
      logDiv.style.display = 'none'
      logDiv.innerHTML = ''

      // 重置 Tab
      switchSettingsTab('cos')

      // 初始化 Banner 预览
      const bannerBase = `${CONFIG.cos.BaseUrl}/banner`
      const ts = Date.now() // 添加时间戳防止缓存

      const mainImg = document.getElementById('preview-main-banner')
      mainImg.src = `${bannerBase}/main-banner.jpg?t=${ts}`
      mainImg.style.display = 'block'
      mainImg.onerror = () => {
        mainImg.style.display = 'none'
        document.getElementById('no-main-banner').style.display = 'flex'
      }
      mainImg.onload = () => {
        mainImg.style.display = 'block'
        document.getElementById('no-main-banner').style.display = 'none'
      }

      const bookingImg = document.getElementById('preview-booking-banner')
      bookingImg.src = `${bannerBase}/booking-banner.jpg?t=${ts}`
      bookingImg.style.display = 'block'
      bookingImg.onerror = () => {
        bookingImg.style.display = 'none'
        document.getElementById('no-booking-banner').style.display = 'flex'
      }
      bookingImg.onload = () => {
        bookingImg.style.display = 'block'
        document.getElementById('no-booking-banner').style.display = 'none'
      }

      const aboutImg = document.getElementById('preview-about-banner')
      aboutImg.src = `${bannerBase}/about-banner.jpg?t=${ts}`
      aboutImg.style.display = 'block'
      aboutImg.onerror = () => {
        aboutImg.style.display = 'none'
        document.getElementById('no-about-banner').style.display = 'flex'
      }
      aboutImg.onload = () => {
        aboutImg.style.display = 'block'
        document.getElementById('no-about-banner').style.display = 'none'
      }

      openModal('settingsModal')
    } else {
      showToast('获取设置失败', 'error')
    }
  } catch (error) {
    console.error('获取设置错误:', error)
    showToast('获取设置错误', 'error')
  }
}

// 保存云端设置并更新小程序
async function saveAndSyncSettings() {
  const btn = document.getElementById('saveSettingsBtn')
  const logDiv = document.getElementById('syncLogs')

  btn.disabled = true
  btn.textContent = '正在保存...'
  logDiv.style.display = 'block'
  logDiv.innerHTML = '<div style="color: #61afef">> 开始提交配置...</div>'

  const settings = {
    SecretId: document.getElementById('settingSecretId').value.trim(),
    SecretKey: document.getElementById('settingSecretKey').value.trim(),
    Bucket: document.getElementById('settingBucket').value.trim(),
    Region: document.getElementById('settingRegion').value.trim(),
    AppID: document.getElementById('settingAppID').value.trim()
  }

  const requiredFields = [
    ['SecretId', '请填写腾讯云 SecretId'],
    ['Bucket', '请填写存储桶 Bucket'],
    ['Region', '请填写地域 Region，例如 ap-guangzhou']
  ]
  const missing = requiredFields.find(([key]) => !settings[key])
  if (missing) {
    const message = missing[1]
    logDiv.innerHTML = `<div style="color: #e06c75">[ERROR] ❌ ${message}</div>`
    showToast(message, 'error')
    btn.disabled = false
    btn.textContent = '💾 保存并更新小程序'
    return
  }

  try {
    const response = await fetch(`${CONFIG.apiUrl}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    })

    const result = await response.json()

    // 显示详细日志
    if (result.logs && result.logs.length > 0) {
      logDiv.innerHTML = result.logs.map(log => {
        let color = '#a6accd'
        if (log.includes('[ERROR]')) color = '#e06c75'
        if (log.includes('[WARN]')) color = '#e5c07b'
        if (log.includes('✅')) color = '#98c379'
        return `<div style="color: ${color}; margin-bottom: 4px;">${log}</div>`
      }).join('')
    }

    // 滚动到底部
    logDiv.scrollTop = logDiv.scrollHeight

    if (result.success) {
      showToast('云端设置已保存，小程序会显示最新内容', 'success')
      // 延迟关闭，让用户看完日志
      setTimeout(() => {
        // 重新加载配置以更新前端的 COS BaseURL
        // 注意：目前前端 BaseUrl 是硬编码在 app.js 开头的，
        // 理想情况下应该从 API 获取。
        // 这里我们简单刷新一下页面或重新初始化
        if (confirm('配置已更新，是否刷新页面以应用新配置？')) {
          location.reload()
        } else {
           closeModal('settingsModal')
        }
      }, 1500)
    } else {
      showToast('保存失败: ' + result.error, 'error')
    }

  } catch (error) {
    console.error('保存设置失败:', error)
    logDiv.innerHTML += `<div style="color: #e06c75">[ERROR] 网络请求失败: ${error.message}</div>`
    showToast('网络请求失败', 'error')
  } finally {
    btn.disabled = false
    btn.textContent = '💾 保存并更新小程序'
  }
}

// 从 COS 同步照片
async function syncFromCos() {
  if (!confirm('确定要扫描云端存储并同步照片吗？这可能会花费一些时间。')) return

  const btn = document.getElementById('syncCosBtn')
  const logDiv = document.getElementById('syncLogs')

  btn.disabled = true
  btn.textContent = '正在扫描...'
  logDiv.style.display = 'block'
  logDiv.innerHTML = '<div style="color: #61afef">> 开始扫描云端文件...</div>'

  try {
    const response = await fetch(`${CONFIG.apiUrl}/sync/cos`, {
      method: 'POST'
    })

    const result = await response.json()

    // 显示日志
    if (result.logs && result.logs.length > 0) {
      logDiv.innerHTML = result.logs.map(log => {
        let color = '#a6accd'
        if (log.includes('[ERROR]')) color = '#e06c75'
        if (log.includes('[WARN]')) color = '#e5c07b'
        if (log.includes('✅')) color = '#98c379'
        return `<div style="color: ${color}; margin-bottom: 4px;">${log}</div>`
      }).join('')
    }

    // 滚动到底部
    logDiv.scrollTop = logDiv.scrollHeight

    if (result.success) {
      if (result.updatedCount > 0) {
        showToast(`同步完成，恢复了 ${result.updatedCount} 张照片`, 'success')
        setTimeout(() => {
          if (confirm(`同步成功！恢复了 ${result.updatedCount} 张照片。是否刷新页面查看？`)) {
            location.reload()
          }
        }, 1000)
      } else {
        showToast('同步完成，未发现新照片', 'info')
      }
    } else {
      showToast('同步失败: ' + result.error, 'error')
    }

  } catch (error) {
    console.error('同步失败:', error)
    logDiv.innerHTML += `<div style="color: #e06c75">[ERROR] 网络请求失败: ${error.message}</div>`
    showToast('网络请求失败', 'error')
  } finally {
    btn.disabled = false
    btn.textContent = '开始扫描并同步'
  }
}

async function cleanupInvalidCosPhotos() {
  if (!confirm('扫描云端存储中未被当前配置引用的照片吗？此操作只扫描，不会删除文件。')) return

  const btn = document.getElementById('cleanupCosBtn')
  const logDiv = document.getElementById('syncLogs')

  btn.disabled = true
  btn.textContent = '正在扫描...'
  logDiv.style.display = 'block'
  logDiv.innerHTML = '<div style="color: #61afef">> 正在扫描未引用照片...</div>'

  try {
    const response = await fetch(`${CONFIG.apiUrl}/photos/orphans`)

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || '清理失败')
    }

    if (!result.count) {
      logDiv.innerHTML = '<div style="color: #98c379">[INFO] 未发现未引用照片</div>'
      showToast('未发现未引用照片', 'info')
      return
    }

    logDiv.innerHTML = [
      `<div style="color: #e5c07b">[WARN] 发现 ${result.count} 个未引用文件，已停止在扫描阶段，没有删除任何文件。</div>`,
      ...result.files.map(file => `<div style="color: #a6accd">${escapeHtml(file.key || file.name)}</div>`)
    ].join('')
    logDiv.scrollTop = logDiv.scrollHeight
    showToast(`发现 ${result.count} 个未引用文件，未删除`, 'info')
  } catch (error) {
    console.error('扫描未引用照片失败:', error)
    logDiv.innerHTML += `<div style="color: #e06c75">[ERROR] ${escapeHtml(error.message)}</div>`
    showToast('扫描未引用照片失败', 'error')
  } finally {
    btn.disabled = false
    btn.textContent = '扫描未引用照片'
  }
}

async function reconcileMissingCosPhotos() {
  const btn = document.getElementById('reconcileMissingCosBtn')
  const logDiv = document.getElementById('syncLogs')

  btn.disabled = true
  btn.textContent = '正在检查...'
  logDiv.style.display = 'block'
  logDiv.innerHTML = '<div style="color: #61afef">&gt; 正在核对后台记录和 COS 文件...</div>'

  try {
    const scanResponse = await fetch(`${CONFIG.apiUrl}/photos/missing-references`)
    const scanResult = await scanResponse.json()
    if (!scanResponse.ok || !scanResult.success) {
      throw new Error(scanResult.error || '检查失败')
    }

    if (!scanResult.count) {
      logDiv.innerHTML = '<div style="color: #98c379">[INFO] 后台照片记录与 COS 文件一致，无需清理。</div>'
      showToast('照片记录与 COS 一致', 'success')
      return
    }

    logDiv.innerHTML = [
      `<div style="color: #e5c07b">[WARN] 发现 ${scanResult.count} 条照片记录对应的 COS 文件已不存在。</div>`,
      ...scanResult.photoNames.map(name => `<div style="color: #a6accd">${escapeHtml(name)}</div>`)
    ].join('')

    if (!confirm(`发现 ${scanResult.count} 条失效照片记录。\n\n是否从后台和小程序配置中清理？此操作不会删除任何仍存在的 COS 文件。`)) {
      showToast('已取消清理', 'info')
      return
    }

    btn.textContent = '正在同步...'
    const cleanResponse = await fetch(`${CONFIG.apiUrl}/photos/reconcile-missing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmClean: 'CLEAN_MISSING_REFERENCES' })
    })
    const cleanResult = await cleanResponse.json()
    if (!cleanResponse.ok || !cleanResult.success) {
      throw new Error(cleanResult.error || '同步失败')
    }

    await reloadPortfolioData()
    logDiv.innerHTML += `<div style="color: #98c379">[INFO] 已清理 ${cleanResult.removedReferenceCount} 条失效照片记录。</div>`
    showToast(`已清理 ${cleanResult.removedReferenceCount} 条失效照片记录`, 'success')
  } catch (error) {
    console.error('同步已删除照片失败:', error)
    logDiv.innerHTML += `<div style="color: #e06c75">[ERROR] ${escapeHtml(error.message)}</div>`
    showToast('同步已删除照片失败: ' + error.message, 'error')
  } finally {
    btn.disabled = false
    btn.textContent = '同步已删除照片'
  }
}

// 切换设置 Tab
function switchSettingsTab(tabName) {
  // 更新 Tab 样式
  document.querySelectorAll('.tab-item').forEach(item => {
    item.classList.remove('active')
    item.style.borderBottomColor = 'transparent'
    item.style.color = '#78716c'
  })

  const activeTab = document.getElementById(`tab-${tabName}`)
  if (activeTab) {
    activeTab.classList.add('active')
    activeTab.style.borderBottomColor = '#7c6a5d'
    activeTab.style.color = '#292524'
  }

  // 切换面板显示
  document.querySelectorAll('.settings-panel').forEach(panel => {
    panel.style.display = 'none'
  })

  const activePanel = document.getElementById(`panel-${tabName}`)
  if (activePanel) {
    activePanel.style.display = 'block'
  }
}

// 处理 Banner 选择
let selectedBanners = {
  'main-banner': null,
  'booking-banner': null,
  'about-banner': null
}
let selectedAvatar = null
let selectedProfileAboutBanner = null

function handleBannerSelect(type, event) {
  const file = event.target.files[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件', 'error')
    return
  }

  selectedBanners[type] = file

  // 显示预览
  const reader = new FileReader()
  reader.onload = (e) => {
    const img = document.getElementById(`preview-${type}`)
    img.src = e.target.result
    img.style.display = 'block'
    document.getElementById(`no-${type}`).style.display = 'none'

    // 显示上传按钮
    document.getElementById(`btn-upload-${type}`).style.display = 'inline-block'
  }
  reader.readAsDataURL(file)
}

function handleAvatarSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件', 'error')
    return
  }

  selectedAvatar = file

  const reader = new FileReader()
  reader.onload = (e) => {
    renderProfileAvatarPreview(e.target.result)
    document.getElementById('btn-upload-profile-avatar').style.display = 'inline-block'
  }
  reader.readAsDataURL(file)
  event.target.value = ''
}

function handleProfileAboutBannerSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件', 'error')
    return
  }

  selectedProfileAboutBanner = file

  const reader = new FileReader()
  reader.onload = (e) => {
    renderProfileAboutBannerPreview(e.target.result)
    document.getElementById('btn-upload-profile-about-banner').style.display = 'inline-block'
  }
  reader.readAsDataURL(file)
  event.target.value = ''
}

async function uploadAvatar() {
  if (!selectedAvatar) return

  const btn = document.getElementById('btn-upload-profile-avatar')
  btn.disabled = true
  btn.textContent = '上传中...'

  try {
    const formData = new FormData()
    formData.append('avatar', selectedAvatar)

    const response = await fetch(`${CONFIG.apiUrl}/upload/avatar`, {
      method: 'POST',
      body: formData
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || '上传失败')
    }

    if (!portfolioData.photographer) {
      portfolioData.photographer = {}
    }

    portfolioData.photographer.avatar = result.avatarPath
    document.getElementById('profileAvatar').value = result.avatarPath
    renderProfileAvatarPreview(result.avatarPath)

    selectedAvatar = null
    btn.style.display = 'none'
    showToast('头像已上传并同步配置', 'success')
  } catch (error) {
    console.error('头像上传失败:', error)
    showToast('头像上传失败: ' + error.message, 'error')
  } finally {
    btn.disabled = false
    btn.textContent = '上传头像'
  }
}

async function uploadProfileAboutBanner() {
  if (!selectedProfileAboutBanner) return

  const btn = document.getElementById('btn-upload-profile-about-banner')
  btn.disabled = true
  btn.textContent = '上传中...'

  try {
    const formData = new FormData()
    formData.append('banner', selectedProfileAboutBanner)
    formData.append('type', 'about-banner')

    const response = await fetch(`${CONFIG.apiUrl}/upload/banner`, {
      method: 'POST',
      body: formData
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || '上传失败')
    }

    document.getElementById('profileAboutBanner').value = 'banner/about-banner.jpg'
    renderProfileAboutBannerPreview()

    selectedProfileAboutBanner = null
    btn.style.display = 'none'
    showToast('简介页背景封面已上传', 'success')
  } catch (error) {
    console.error('简介页背景封面上传失败:', error)
    showToast('封面上传失败: ' + error.message, 'error')
  } finally {
    btn.disabled = false
    btn.textContent = '上传封面'
  }
}

// 上传 Banner
async function uploadBanner(type) {
  const file = selectedBanners[type]
  if (!file) return

  const btn = document.getElementById(`btn-upload-${type}`)
  btn.disabled = true
  btn.textContent = '上传中...'

  try {
    const formData = new FormData()
    formData.append('banner', file)
    formData.append('type', type)

    const response = await fetch(`${CONFIG.apiUrl}/upload/banner`, {
      method: 'POST',
      body: formData
    })

    const result = await response.json()

    if (result.success) {
      showToast('Banner 上传成功', 'success')
      btn.style.display = 'none' // 上传成功后隐藏按钮

      // 刷新预览图 (加上时间戳)
      const img = document.getElementById(`preview-${type}`)
      // 注意：这里我们不需要重新加载，因为刚刚FileReader已经预览了。
      // 但为了确保链接有效性，我们最好更新一下src为远程地址
      // 稍微延迟一下，确保 COS CDN 缓存刷新（虽然我们加了 cache-control）
      setTimeout(() => {
         img.src = `${CONFIG.cos.BaseUrl}/banner/${result.fileName}?t=${Date.now()}`
      }, 1000)

      // 清除选择的文件
      selectedBanners[type] = null
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('Banner 上传失败:', error)
    showToast('上传失败: ' + error.message, 'error')
  } finally {
    btn.disabled = false
    btn.textContent = '上传'
  }
}
