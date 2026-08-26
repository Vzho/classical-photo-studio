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
let activeDecorationStage = 'appearance'
let activeDecorationPage = 'home'
let decorationHasUnsavedChanges = false
let skinPreviewQuickJumpOpen = false
let adminInitializationPromise = null
const decorationChangeRegistry = new Map()
let pendingDecorationPreviewFeedback = null
let lastDecorationPreviewFeedback = null
let decorationPreviewFeedbackTimer = null
let decorationPreviewResizeObserver = null
const decorationVisitedStages = new Set()
const DECORATION_STAGE_ORDER = ['appearance', 'copy', 'navigation', 'pages']
const DECORATION_STAGE_LABELS = {
  appearance: '外观风格',
  copy: '门店文字',
  navigation: '顾客入口',
  pages: '页面内容'
}
const DECORATION_PAGE_GUIDE = {
  home: { name: '作品首页', description: '顾客打开小程序后首先看到的作品页面。' },
  gallery: { name: '作品画廊', description: '顾客按分类浏览和搜索全部作品的页面。' },
  about: { name: '店铺简介', description: '展示门店介绍、团队、地址和联系方式。' },
  stores: { name: '门店信息', description: '展示门店地址、营业时间、电话和地图导航。' },
  booking: { name: '预约咨询', description: '顾客填写需求并生成咨询内容的页面。' },
  packages: { name: '套餐列表', description: '集中展示门店提供的套餐和价格。' },
  packageDetail: { name: '套餐详情', description: '顾客查看单个套餐完整服务内容的页面。' },
  series: { name: '作品详情', description: '顾客查看某个作品集全部照片的页面。' },
  success: { name: '咨询结果', description: '顾客提交咨询内容后看到的确认页面。' }
}
let themeSearchQuery = ''
let themeStatusFilter = 'all'
let themeReorderInProgress = false
const DECORATION_SPLIT_RATIO_STORAGE_KEY = 'photo-admin-decoration-preview-ratio'
const MANAGEMENT_MAIN_WORKBENCH_ID = 'worksManagementWorkspace'
const expandedSeriesKeys = new Set()
const UI_CONFIG = {
  maxVisiblePhotos: 8,
  photoThumbSize: 120,
  maxHomeFeaturedPhotos: 12
}
const DEFAULT_HOME_BANNER = {
  logoText: '摄影作品合集',
  tagText: '精选作品',
  description: ''
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
const PREVIEW_SYSTEM_ICON_NAMES = new Set(['arrow-right', 'chevron-down', 'chevron-right', 'copy', 'grid-2x2', 'plus', 'search', 'x'])
const CUSTOM_NAVIGATION_PREVIEW_PAGES = new Set(['home', 'gallery', 'about', 'booking'])
const PREVIEW_NATIVE_PAGE_TITLES = {
  stores: '门店信息',
  packages: '服务套餐',
  packageDetail: '套餐详情',
  series: '作品详情',
  success: '咨询内容'
}
const PREVIEW_BACK_PAGES = new Set(['packageDetail', 'series', 'success'])
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

const TERMINOLOGY_PRESETS = {
  photography: {
    workLabel: '客片',
    packageLabel: '套餐',
    consultationLabel: '咨询',
    professionalLabel: '摄影师',
    serviceLabel: '拍摄',
    customerServiceLabel: '客服'
  },
  styling: {
    workLabel: '作品',
    packageLabel: '套餐',
    consultationLabel: '预约',
    professionalLabel: '造型师',
    serviceLabel: '妆造',
    customerServiceLabel: '客服'
  },
  experience: {
    workLabel: '客片',
    packageLabel: '体验套餐',
    consultationLabel: '预约',
    professionalLabel: '妆造师',
    serviceLabel: '体验',
    customerServiceLabel: '店员'
  }
}

const DEFAULT_DECORATION_CONFIG = {
  schemaVersion: 2,
  framework: {
    id: 'legacy-classic',
    motion: 'subtle',
    sectionRhythm: 'balanced'
  },
  media: {
    heroFocalPoint: 'center',
    galleryFocalPoint: 'center',
    heroOverlay: 'balanced'
  },
  siteTemplate: 'classic',
  showcase: {
    heroActionText: '浏览作品',
    heroActionTarget: 'gallery',
    galleryTitle: '作品欣赏',
    gallerySubtitle: 'GALLERY',
    categoryMode: 'sidebar',
    galleryColumns: 2,
    showSearch: true,
    showTags: true,
    seriesActionText: '咨询这套',
    aboutQuote: '以光为序，记录值得珍藏的瞬间。',
    aboutGalleryLimit: 9
  },
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
    galleryText: '作品',
    aboutText: '简介',
    packagesText: '套餐',
    bookingText: '咨询',
    storesText: '门店',
    style: 'line',
    items: [
      { key: 'portfolio', enabled: true },
      { key: 'about', enabled: true },
      { key: 'booking', enabled: true },
      { key: 'gallery', enabled: false },
      { key: 'packages', enabled: false },
      { key: 'stores', enabled: false }
    ]
  },
  icons: {
    navigation: {
      portfolio: 'images',
      gallery: 'images',
      about: 'user-round',
      packages: 'briefcase-business',
      booking: 'calendar-days',
      stores: 'map-pin'
    },
    navigationCustom: {
      portfolio: '',
      gallery: '',
      about: '',
      packages: '',
      booking: '',
      stores: ''
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
    template: 'editorial-cover',
    heroVariant: 'editorial',
    galleryVariant: 'editorial',
    galleryColumns: 2,
    imageRatio: 'portrait',
    cardContent: 'compact',
    showTitle: true,
    showCategory: true,
    showDescription: false,
    galleryGap: 'standard',
    sections: [
      createDecorationSection('hero'),
      createDecorationSection('shortcuts', '快捷入口', '快速查看档期和客户评价'),
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

const NAVIGATION_ITEM_DEFINITIONS = {
  portfolio: { label: '首页', previewPage: 'home', textKey: 'portfolioText' },
  gallery: { label: '作品画廊', previewPage: 'gallery', textKey: 'galleryText' },
  about: { label: '简介页', previewPage: 'about', textKey: 'aboutText' },
  packages: { label: '套餐页', previewPage: 'packages', textKey: 'packagesText' },
  booking: { label: '咨询页', previewPage: 'booking', textKey: 'bookingText' },
  stores: { label: '门店页', previewPage: 'stores', textKey: 'storesText' }
}

const NAVIGATION_ITEM_KEYS = Object.keys(NAVIGATION_ITEM_DEFINITIONS)

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
    description: '漆墨留白、朱砂点睛与鎏金细线，适合国风妆造与高定客片',
    preset: 'oriental-premium',
    primaryColor: '#8A302B',
    secondaryColor: '#142C27',
    accentColor: '#C6A96B',
    backgroundColor: '#F1EFE8',
    surfaceColor: '#FCFBF7',
    surfaceMutedColor: '#E4DED2',
    textColor: '#161A18',
    mutedTextColor: '#6A655D',
    dividerColor: '#CCC1AF',
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
    description: '黑白大版、钴蓝切线与荧光点题，适合潮流写真和品牌客片',
    preset: 'editorial-studio',
    primaryColor: '#101010',
    secondaryColor: '#2D4BFF',
    accentColor: '#D9FF3F',
    backgroundColor: '#EFEFEB',
    surfaceColor: '#FFFFFF',
    surfaceMutedColor: '#DDDED8',
    textColor: '#101010',
    mutedTextColor: '#5B5D58',
    dividerColor: '#C8CAC3',
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
    description: '白场相纸、雾绿与浅天青，突出自然肤色和真实客片',
    preset: 'luminous-portrait',
    primaryColor: '#3F6658',
    secondaryColor: '#B66F7D',
    accentColor: '#8CB7C1',
    backgroundColor: '#F4F7F5',
    surfaceColor: '#FFFFFF',
    surfaceMutedColor: '#E6EFEB',
    textColor: '#1F2C27',
    mutedTextColor: '#68756F',
    dividerColor: '#D3DFD9',
    buttonTextColor: '#FFFFFF',
    cardStyle: 'minimal',
    buttonStyle: 'rounded',
    fontStyle: 'soft',
    headingStyle: 'understated',
    quickJumpStyle: 'soft',
    imageRadius: 'small',
    layoutDensity: 'airy',
    homeLayout: 'content-first',
    showDecorations: false
  },
  'cinematic-story': {
    commercial: true,
    order: 4,
    code: '电影叙事',
    name: '电影叙事',
    description: '宽银幕暗场、胶片红与字幕式排版，适合剧情写真和夜景客片',
    preset: 'cinematic-story',
    primaryColor: '#A63D40',
    secondaryColor: '#17302B',
    accentColor: '#E2C86F',
    backgroundColor: '#111513',
    surfaceColor: '#1A201D',
    surfaceMutedColor: '#272E2A',
    textColor: '#F2EFE7',
    mutedTextColor: '#A9ADA7',
    dividerColor: '#414843',
    buttonTextColor: '#FFFFFF',
    cardStyle: 'minimal',
    buttonStyle: 'square',
    fontStyle: 'elegant',
    headingStyle: 'editorial',
    quickJumpStyle: 'solid',
    imageRadius: 'none',
    layoutDensity: 'comfortable',
    homeLayout: 'banner-first',
    showDecorations: true
  },
  'gallery-monograph': {
    commercial: true,
    order: 5,
    code: '艺术收藏',
    name: '影像艺廊',
    description: '美术馆留白、作品编号与严格网格，适合艺术肖像和品牌形象',
    preset: 'gallery-monograph',
    primaryColor: '#C53B32',
    secondaryColor: '#244D46',
    accentColor: '#91A9C6',
    backgroundColor: '#F5F4EF',
    surfaceColor: '#FFFFFF',
    surfaceMutedColor: '#E9E8E2',
    textColor: '#181A19',
    mutedTextColor: '#6C706C',
    dividerColor: '#CFCFC8',
    buttonTextColor: '#FFFFFF',
    cardStyle: 'minimal',
    buttonStyle: 'square',
    fontStyle: 'clean',
    headingStyle: 'understated',
    quickJumpStyle: 'outline',
    imageRadius: 'none',
    layoutDensity: 'spacious',
    homeLayout: 'portfolio-first',
    showDecorations: false
  },
  'dark-gallery': {
    commercial: true,
    order: 6,
    code: '品牌画廊',
    name: '暗色品牌画廊',
    description: '沉浸封面、独立作品目录与通栏详情，适合强调品牌感和影像质感的门店',
    preset: 'dark-gallery',
    primaryColor: '#72DEDF',
    secondaryColor: '#F3A8B2',
    accentColor: '#FFFFFF',
    backgroundColor: '#111111',
    surfaceColor: '#1B1B1B',
    surfaceMutedColor: '#292929',
    textColor: '#F5F5F2',
    mutedTextColor: '#9B9B98',
    dividerColor: '#383838',
    buttonTextColor: '#111111',
    cardStyle: 'minimal',
    buttonStyle: 'square',
    fontStyle: 'clean',
    headingStyle: 'editorial',
    quickJumpStyle: 'solid',
    imageRadius: 'none',
    layoutDensity: 'compact',
    homeLayout: 'banner-first',
    showDecorations: false
  }
}

const HOME_TEMPLATE_PRESETS = {
  'editorial-cover': {
    name: '杂志封面',
    description: '大幅主视觉开场，适合强调招牌作品和品牌气质。',
    heroVariant: 'immersive',
    galleryVariant: 'mixed',
    galleryColumns: 2,
    imageRatio: 'portrait',
    cardContent: 'full',
    galleryGap: 'airy',
    sectionOrder: ['hero', 'shortcuts', 'categories', 'portfolio', 'packages', 'schedule', 'testimonials', 'serviceFlow']
  },
  'split-catalog': {
    name: '高定目录',
    description: '文字与照片左右分栏，适合妆造、婚纱和高定门店。',
    heroVariant: 'editorial',
    galleryVariant: 'horizontal',
    galleryColumns: 2,
    imageRatio: 'portrait',
    cardContent: 'compact',
    galleryGap: 'standard',
    sectionOrder: ['hero', 'shortcuts', 'categories', 'portfolio', 'testimonials', 'packages', 'schedule', 'serviceFlow']
  },
  'gallery-wall': {
    name: '影像画廊',
    description: '作品优先、密集陈列，适合客片丰富的摄影门店。',
    heroVariant: 'compact',
    galleryVariant: 'masonry',
    galleryColumns: 3,
    imageRatio: 'natural',
    cardContent: 'image-only',
    galleryGap: 'tight',
    sectionOrder: ['hero', 'shortcuts', 'portfolio', 'categories', 'testimonials', 'packages', 'schedule', 'serviceFlow']
  },
  'service-led': {
    name: '门店转化',
    description: '先展示套餐与档期，再展示作品，适合以咨询预约为目标。',
    heroVariant: 'compact',
    galleryVariant: 'cards',
    galleryColumns: 2,
    imageRatio: 'square',
    cardContent: 'compact',
    galleryGap: 'standard',
    sectionOrder: ['hero', 'shortcuts', 'packages', 'schedule', 'portfolio', 'testimonials', 'serviceFlow', 'categories']
  }
}

const FRAMEWORK_PRESETS = {
  'cinematic-gallery': {
    name: '影像叙事',
    description: '全屏影像、暗场留白和通栏详情，适合强调品牌氛围与代表作品。',
    siteTemplate: 'dark-gallery',
    themePreset: 'dark-gallery',
    navigationItems: ['portfolio', 'gallery', 'about'],
    navigationLabels: {
      portfolioText: '首页', galleryText: '作品', aboutText: '关于',
      packagesText: '套餐', bookingText: '联系', storesText: '门店'
    },
    media: { heroFocalPoint: 'center', galleryFocalPoint: 'center', heroOverlay: 'strong' },
    framework: { motion: 'subtle', sectionRhythm: 'tight' },
    variants: {
      navigationStyle: 'line', homeTemplate: 'editorial-cover', homeCardContent: 'image-only',
      homeGap: 'tight', homeHero: 'immersive', homeGallery: 'masonry', homeColumns: 2,
      homeRatio: 'portrait', aboutHeader: 'portrait', bookingHeader: 'image', bookingForm: 'lines',
      packagesLayout: 'list', packageDetailLayout: 'editorial', seriesGallery: 'immersive', successLayout: 'centered'
    },
    sectionOrder: {
      home: ['hero', 'categories', 'portfolio', 'testimonials', 'packages', 'schedule', 'serviceFlow', 'shortcuts'],
      about: ['profile', 'bio', 'skills', 'team', 'testimonials', 'contact', 'stores', 'packages', 'serviceFlow', 'faq'],
      booking: ['hero', 'notice', 'form', 'schedule', 'serviceFlow', 'faq']
    }
  },
  'editorial-journal': {
    name: '编辑画册',
    description: '大幅封面、克制文字和杂志式网格，适合写真、妆造与高定品牌。',
    siteTemplate: 'classic',
    themePreset: 'gallery-monograph',
    navigationItems: ['portfolio', 'about', 'booking'],
    navigationLabels: {
      portfolioText: '首页', galleryText: '作品', aboutText: '品牌',
      packagesText: '服务', bookingText: '咨询', storesText: '门店'
    },
    media: { heroFocalPoint: 'center', galleryFocalPoint: 'center', heroOverlay: 'balanced' },
    framework: { motion: 'subtle', sectionRhythm: 'airy' },
    variants: {
      navigationStyle: 'line', homeTemplate: 'split-catalog', homeCardContent: 'compact',
      homeGap: 'airy', homeHero: 'immersive', homeGallery: 'mixed', homeColumns: 2,
      homeRatio: 'portrait', aboutHeader: 'editorial', bookingHeader: 'image', bookingForm: 'lines',
      packagesLayout: 'list', packageDetailLayout: 'editorial', seriesGallery: 'immersive', successLayout: 'centered'
    },
    sectionOrder: {
      home: ['hero', 'categories', 'portfolio', 'testimonials', 'packages', 'schedule', 'serviceFlow', 'shortcuts'],
      about: ['profile', 'bio', 'skills', 'team', 'testimonials', 'contact', 'stores', 'packages', 'serviceFlow', 'faq'],
      booking: ['hero', 'notice', 'form', 'schedule', 'serviceFlow', 'faq']
    }
  },
  'atelier-conversion': {
    name: '门店高定',
    description: '首图、服务、档期和咨询路径更清晰，适合以到店预约和成交为目标。',
    siteTemplate: 'classic',
    themePreset: 'luminous-portrait',
    navigationItems: ['portfolio', 'packages', 'about', 'booking'],
    navigationLabels: {
      portfolioText: '首页', galleryText: '客片', aboutText: '介绍',
      packagesText: '套餐', bookingText: '预约', storesText: '门店'
    },
    media: { heroFocalPoint: 'center', galleryFocalPoint: 'center', heroOverlay: 'light' },
    framework: { motion: 'subtle', sectionRhythm: 'balanced' },
    variants: {
      navigationStyle: 'quiet', homeTemplate: 'service-led', homeCardContent: 'compact',
      homeGap: 'standard', homeHero: 'compact', homeGallery: 'cards', homeColumns: 2,
      homeRatio: 'square', aboutHeader: 'portrait', bookingHeader: 'compact', bookingForm: 'soft',
      packagesLayout: 'cards', packageDetailLayout: 'compact', seriesGallery: 'framed', successLayout: 'compact'
    },
    sectionOrder: {
      home: ['hero', 'shortcuts', 'packages', 'schedule', 'portfolio', 'testimonials', 'serviceFlow', 'categories'],
      about: ['profile', 'contact', 'stores', 'packages', 'testimonials', 'skills', 'bio', 'team', 'serviceFlow', 'faq'],
      booking: ['notice', 'form', 'schedule', 'hero', 'serviceFlow', 'faq']
    }
  }
}

const DECORATION_PRESET_VARIANTS = {
  minimal: {
    navigationStyle: 'line',
    homeTemplate: 'editorial-cover',
    homeCardContent: 'full',
    homeGap: 'standard',
    homeHero: 'compact',
    homeGallery: 'mixed',
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
    homeTemplate: 'gallery-wall',
    homeCardContent: 'compact',
    homeGap: 'tight',
    homeHero: 'editorial',
    homeGallery: 'masonry',
    homeColumns: 3,
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
    homeTemplate: 'split-catalog',
    homeCardContent: 'full',
    homeGap: 'airy',
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
    homeTemplate: 'service-led',
    homeCardContent: 'compact',
    homeGap: 'standard',
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
    homeTemplate: 'editorial-cover',
    homeCardContent: 'full',
    homeGap: 'airy',
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
    homeTemplate: 'editorial-cover',
    homeCardContent: 'full',
    homeGap: 'airy',
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
    homeTemplate: 'editorial-cover',
    homeCardContent: 'full',
    homeGap: 'airy',
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
    homeTemplate: 'split-catalog',
    homeCardContent: 'compact',
    homeGap: 'standard',
    homeHero: 'editorial',
    homeGallery: 'horizontal',
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
    homeTemplate: 'split-catalog',
    homeCardContent: 'compact',
    homeGap: 'airy',
    homeHero: 'compact',
    homeGallery: 'horizontal',
    homeColumns: 2,
    homeRatio: 'natural',
    aboutHeader: 'portrait',
    bookingHeader: 'image',
    bookingForm: 'soft',
    packagesLayout: 'cards',
    packageDetailLayout: 'editorial',
    seriesGallery: 'framed',
    successLayout: 'centered'
  },
  'cinematic-story': {
    navigationStyle: 'line',
    homeTemplate: 'gallery-wall',
    homeCardContent: 'image-only',
    homeGap: 'tight',
    homeHero: 'immersive',
    homeGallery: 'masonry',
    homeColumns: 3,
    homeRatio: 'natural',
    aboutHeader: 'editorial',
    bookingHeader: 'image',
    bookingForm: 'lines',
    packagesLayout: 'list',
    packageDetailLayout: 'editorial',
    seriesGallery: 'immersive',
    successLayout: 'compact'
  },
  'gallery-monograph': {
    navigationStyle: 'line',
    homeTemplate: 'gallery-wall',
    homeCardContent: 'compact',
    homeGap: 'standard',
    homeHero: 'editorial',
    homeGallery: 'mixed',
    homeColumns: 3,
    homeRatio: 'square',
    aboutHeader: 'minimal',
    bookingHeader: 'compact',
    bookingForm: 'lines',
    packagesLayout: 'list',
    packageDetailLayout: 'compact',
    seriesGallery: 'framed',
    successLayout: 'compact'
  },
  'dark-gallery': {
    navigationStyle: 'line',
    homeTemplate: 'editorial-cover',
    homeCardContent: 'image-only',
    homeGap: 'tight',
    homeHero: 'immersive',
    homeGallery: 'cards',
    homeColumns: 2,
    homeRatio: 'portrait',
    aboutHeader: 'minimal',
    bookingHeader: 'image',
    bookingForm: 'lines',
    packagesLayout: 'list',
    packageDetailLayout: 'compact',
    seriesGallery: 'immersive',
    successLayout: 'compact'
  }
}

const DECORATION_SECTION_NAMES = {
  home: {
    hero: '首页首图',
    shortcuts: '快捷入口',
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
  setupDecorationSplitter()
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
  setupManagementWorkbenches()
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
  const activeWorkbenchId = window.AdminWorkbench?.getActiveId?.() || ''
  if (activeWorkbenchId) window.AdminWorkbench.setState(activeWorkbenchId, 'saving')
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
      if (activeWorkbenchId) window.AdminWorkbench.setState(activeWorkbenchId, 'clean')
      refreshManagementPreview()
      return true
    } else {
      throw new Error(result.error || '保存失败')
    }
  } catch (error) {
    console.error('❌ 保存失败:', error)
    showToast('保存失败: ' + error.message, 'error')
    if (activeWorkbenchId) window.AdminWorkbench.setState(activeWorkbenchId, 'dirty')
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

function getHomeFeaturedPhotos(series) {
  const visiblePhotos = getVisibleSeriesPhotos(series)
  const visiblePhotoSet = new Set(visiblePhotos)

  if (Array.isArray(series?.homeFeaturedPhotos)) {
    return Array.from(new Set(
      series.homeFeaturedPhotos
        .map(item => String(item || '').trim())
        .filter(photoName => visiblePhotoSet.has(photoName))
    ))
  }

  // 兼容旧配置：原来按整个作品集精选时，保留该作品集第一张可见照片。
  return series?.featuredOnHome === true && visiblePhotos.length ? [visiblePhotos[0]] : []
}

function isPhotoFeaturedOnHome(series, photoName) {
  return getHomeFeaturedPhotos(series).includes(photoName)
}

function setPhotoFeaturedOnHome(series, photoName, featured) {
  const selectedPhotos = getHomeFeaturedPhotos(series).filter(item => item !== photoName)
  if (featured) selectedPhotos.push(photoName)

  series.homeFeaturedPhotos = selectedPhotos
  series.featuredOnHome = selectedPhotos.length > 0
}

function getTotalHomeFeaturedPhotoCount() {
  return (portfolioData.themes || []).reduce((themeTotal, theme) => {
    if (theme?.enabled === false) return themeTotal
    return themeTotal + (theme.series || []).reduce((seriesTotal, series) => {
      if (series?.enabled === false) return seriesTotal
      return seriesTotal + getHomeFeaturedPhotos(series).length
    }, 0)
  }, 0)
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
  window.AdminWorkbench?.setSaveEnabled('uploadPhotoModal', false)
  window.AdminWorkbench?.refresh('uploadPhotoModal')
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
  window.AdminWorkbench?.setSaveEnabled('uploadPhotoModal', selectedFiles.length > 0)
  window.AdminWorkbench?.refresh('uploadPhotoModal')
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
  const matchedThemes = portfolioData.themes.filter(theme => (
    !normalizedQuery || String(theme.name || '').toLowerCase().includes(normalizedQuery)
  ))
  const matchedEnabledThemes = matchedThemes.filter(theme => theme.enabled !== false)
  const matchedDisabledThemes = matchedThemes.filter(theme => theme.enabled === false)
  const filteredThemes = themeStatusFilter === 'enabled'
    ? matchedEnabledThemes
    : themeStatusFilter === 'disabled'
      ? matchedDisabledThemes
      : [...matchedEnabledThemes, ...matchedDisabledThemes]
  const enabledThemes = getEnabledThemeEntries(portfolioData.themes).map(entry => entry.theme)
  const displayPositionById = new Map(enabledThemes.map((theme, index) => [theme.id, index + 1]))

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

  const themeRows = filteredThemes.map(theme => {
    const isDisabled = theme.enabled === false
    const displayPosition = displayPositionById.get(theme.id)
    const positionMeta = isDisabled
      ? `已下架，不参与展示顺序 · ${theme.series.length} 个作品集`
      : `顺序 ${displayPosition} · ${theme.series.length} 个作品集`
    const reorderActions = isDisabled
      ? ''
      : `
          <button type="button" class="theme-row-action" onclick="moveThemeByOffset(event, '${escapeHtml(theme.id)}', -1)" title="向前移动" aria-label="向前移动" ${displayPosition === 1 ? 'disabled' : ''}>↑</button>
          <button type="button" class="theme-row-action" onclick="moveThemeByOffset(event, '${escapeHtml(theme.id)}', 1)" title="向后移动" aria-label="向后移动" ${displayPosition === enabledThemes.length ? 'disabled' : ''}>↓</button>
        `

    return `
      <li class="theme-item ${currentTheme && currentTheme.id === theme.id ? 'active' : ''} ${isDisabled ? 'is-disabled' : ''}" onclick="selectThemeById('${escapeHtml(theme.id)}')">
        <div class="theme-item-copy">
          <div class="theme-item-title">${escapeHtml(theme.name)}</div>
          <div class="theme-item-meta">
            <span>${positionMeta}</span>
          </div>
        </div>
        <div class="theme-item-actions">
          ${reorderActions}
          <button type="button" class="theme-row-action" onclick="openEditThemeModalById(event, '${escapeHtml(theme.id)}')" title="编辑分类">编辑</button>
          <button type="button" class="theme-row-action danger" onclick="deleteThemePermanently(event, '${escapeHtml(theme.id)}')" title="永久删除分类">删除</button>
        </div>
      </li>
    `
  })

  if (themeStatusFilter === 'all' && matchedDisabledThemes.length) {
    themeRows.splice(matchedEnabledThemes.length, 0, '<li class="theme-list-section-label">已下架分类 · 不参与展示顺序</li>')
  }

  themeList.innerHTML = themeRows.join('')
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

function getEnabledThemeEntries(items) {
  if (!Array.isArray(items)) return []

  return items.reduce((entries, theme, index) => {
    if (theme && theme.enabled !== false) {
      entries.push({ theme, index })
    }
    return entries
  }, [])
}

function getThemeDisplayPosition(items, themeId) {
  const enabledIndex = getEnabledThemeEntries(items)
    .findIndex(entry => entry.theme.id === themeId)
  return enabledIndex >= 0 ? enabledIndex + 1 : null
}

// 只重排展示中的分类，已下架分类保留底层位置，恢复时仍有稳定锚点。
function moveEnabledThemeToPosition(items, themeId, requestedPosition) {
  const enabledEntries = getEnabledThemeEntries(items)
  const sourcePosition = enabledEntries.findIndex(entry => entry.theme.id === themeId)
  if (sourcePosition < 0) return -1

  const targetPosition = normalizeThemePosition(
    requestedPosition,
    sourcePosition + 1,
    enabledEntries.length
  ) - 1
  if (targetPosition === sourcePosition) return sourcePosition

  const reorderedThemes = enabledEntries.map(entry => entry.theme)
  const [movedTheme] = reorderedThemes.splice(sourcePosition, 1)
  reorderedThemes.splice(targetPosition, 0, movedTheme)
  enabledEntries.forEach((entry, index) => {
    items[entry.index] = reorderedThemes[index]
  })
  return targetPosition
}

function insertEnabledThemeAtPosition(items, theme, requestedPosition) {
  if (!Array.isArray(items) || !theme) return -1

  const enabledEntries = getEnabledThemeEntries(items)
  const displayPosition = normalizeThemePosition(
    requestedPosition,
    enabledEntries.length + 1,
    enabledEntries.length + 1
  )
  const insertionIndex = displayPosition <= enabledEntries.length
    ? enabledEntries[displayPosition - 1].index
    : enabledEntries.length
      ? enabledEntries[enabledEntries.length - 1].index + 1
      : items.length

  items.splice(insertionIndex, 0, theme)
  return insertionIndex
}

async function moveThemeByOffset(event, themeId, offset) {
  event.stopPropagation()
  if (themeReorderInProgress) return

  const sourcePosition = getThemeDisplayPosition(portfolioData.themes, themeId)
  const enabledThemeCount = getEnabledThemeEntries(portfolioData.themes).length
  const targetPosition = Number(sourcePosition) + Number(offset)
  if (!sourcePosition || targetPosition < 1 || targetPosition > enabledThemeCount) return

  const previousThemes = portfolioData.themes.slice()
  themeReorderInProgress = true
  moveEnabledThemeToPosition(portfolioData.themes, themeId, targetPosition)
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
  refreshManagementPreview()
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

  const totalFeaturedPhotoCount = getTotalHomeFeaturedPhotoCount()

  container.innerHTML = `
    <div class="home-featured-guide">
      <div>
        <strong>首页精选照片</strong>
        <span>点击照片左上角星标选择；首页大图最多展示 ${UI_CONFIG.maxHomeFeaturedPhotos} 张。</span>
      </div>
      <span class="home-featured-count">已选 ${totalFeaturedPhotoCount} / ${UI_CONFIG.maxHomeFeaturedPhotos}</span>
    </div>
    <div class="series-grid">
      ${currentTheme.series.map((series, index) => {
        const seriesKey = getSeriesStateKey(currentTheme.id, series.id)
        const isExpanded = expandedSeriesKeys.has(seriesKey)
        const allPhotos = getSeriesPhotos(series)
        const activePhotoCount = getVisibleSeriesPhotos(series).length
        const featuredPhotos = getHomeFeaturedPhotos(series)
        const featuredPhotoSet = new Set(featuredPhotos)
        const featuredPhotoCount = featuredPhotos.length
        const visiblePhotos = isExpanded
          ? allPhotos
          : allPhotos.slice(0, UI_CONFIG.maxVisiblePhotos)
        const hasMorePhotos = allPhotos.length > UI_CONFIG.maxVisiblePhotos
        const photosHtml = visiblePhotos.map((photo, photoIndex) => {
          const photoHidden = isPhotoHidden(series, photo)
          const photoFeatured = featuredPhotoSet.has(photo)

          return `
      <div class="photo-item ${photoHidden ? 'is-disabled' : ''} ${photoFeatured ? 'is-featured' : ''}">
        <img loading="lazy" decoding="async" src="${getPhotoThumbUrl(photo)}" alt="${escapeHtml(photo)}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'60\\' height=\\'60\\'%3E%3Crect fill=\\'%23f5f5f4\\' width=\\'60\\' height=\\'60\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'%23a8a29e\\' font-size=\\'12\\'%3E?%3C/text%3E%3C/svg%3E'">
        <button type="button" class="photo-feature-action ${photoFeatured ? 'active' : ''}" onclick="togglePhotoFeatured(${index}, ${photoIndex})" title="${photoFeatured ? '取消首页精选' : '设为首页精选'}" aria-label="${photoFeatured ? '取消首页精选' : '设为首页精选'}" ${photoHidden || series.enabled === false ? 'disabled' : ''}>${photoFeatured ? '★' : '☆'}</button>
        <div class="photo-actions">
          <button type="button" class="photo-action" onclick="togglePhotoVisibility(${index}, ${photoIndex})" title="${photoHidden ? '恢复照片' : '下架照片'}">${photoHidden ? '恢复' : '下架'}</button>
          <button type="button" class="photo-action danger" onclick="deletePhotoPermanently(${index}, ${photoIndex})" title="永久删除照片">删除</button>
        </div>
        ${photoFeatured ? '<span class="photo-featured-label">精选</span>' : ''}
      </div>
    `
        }).join('')

        return `
    <div class="series-card ${series.enabled === false ? 'is-disabled' : ''}">
      <div class="series-header">
        <div class="series-copy">
          <div class="series-title">${escapeHtml(series.title)}${series.enabled === false ? '<span class="status-badge">已下架</span>' : ''}${featuredPhotoCount ? `<span class="status-badge">首页精选 ${featuredPhotoCount} 张</span>` : ''}</div>
          <div class="series-meta">
            喜欢 ${series.likes} · 展示 ${activePhotoCount} / 共 ${allPhotos.length} 张${featuredPhotoCount && series.homeSort !== undefined ? ` · 首页排序 ${escapeHtml(series.homeSort)}` : ''}
          </div>
          ${series.bannerDescription ? `
            <div class="series-description">
              首页大图说明：${escapeHtml(series.bannerDescription)}
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
  const positionHelp = document.getElementById('editThemePositionHelp')
  const enabledThemeCount = getEnabledThemeEntries(portfolioData.themes).length
  const displayPosition = getThemeDisplayPosition(portfolioData.themes, theme.id)
  const isDisabled = theme.enabled === false
  positionInput.value = isDisabled ? '' : String(displayPosition)
  positionInput.max = String(Math.max(enabledThemeCount, 1))
  positionInput.disabled = isDisabled
  if (positionHelp) {
    positionHelp.textContent = isDisabled
      ? '已下架分类不参与展示排序；恢复后会回到下架前的相对位置。'
      : '仅计算展示中的分类，数字越小越靠前；已下架分类不会占位。'
  }
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
    const previousThemes = portfolioData.themes.slice()
    const previousName = theme.name
    theme.name = name
    if (theme.enabled !== false) {
      const positionInput = document.getElementById('editThemePosition')
      const currentDisplayPosition = getThemeDisplayPosition(portfolioData.themes, id)
      const enabledThemeCount = getEnabledThemeEntries(portfolioData.themes).length
      const requestedPosition = normalizeThemePosition(
        positionInput.value,
        currentDisplayPosition,
        enabledThemeCount
      )
      moveEnabledThemeToPosition(portfolioData.themes, id, requestedPosition)
    }
    renderThemeList()
    // 如果当前选中的就是这个分类，更新标题
    if (currentTheme && currentTheme.id === id) {
      document.getElementById('currentThemeName').textContent = name
    }
    const saved = await saveConfig()
    if (!saved) {
      theme.name = previousName
      portfolioData.themes = previousThemes
      currentTheme = currentTheme
        ? portfolioData.themes.find(item => item.id === currentTheme.id) || null
        : null
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
  const previousEnabled = theme.enabled

  if (!willRestore && !confirm('确定下架这个分类吗？下架后小程序前台不会显示，但照片文件会保留，可以随时恢复。')) return

  theme.enabled = willRestore ? true : false

  renderThemeList()
  renderSeriesList()
  updateStats()
  const saved = await saveConfig()
  if (!saved) {
    theme.enabled = previousEnabled
    renderThemeList()
    renderSeriesList()
    updateStats()
    return
  }
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
  const featuredPhotos = getHomeFeaturedPhotos(series)
  series.title = title
  series.likes = likes
  series.homeFeaturedPhotos = featuredPhotos
  series.featuredOnHome = featuredPhotos.length > 0
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
  const lastPosition = getEnabledThemeEntries(portfolioData.themes).length + 1
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
  const enabledThemeCount = getEnabledThemeEntries(portfolioData.themes).length
  const requestedPosition = normalizeThemePosition(
    document.getElementById('themePosition').value,
    enabledThemeCount + 1,
    enabledThemeCount + 1
  )
  insertEnabledThemeAtPosition(portfolioData.themes, newTheme, requestedPosition)

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
    featuredOnHome: false,
    homeFeaturedPhotos: [],
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
  window.AdminWorkbench?.setState('uploadPhotoModal', 'saving')
  uploadBtn.disabled = true
  uploadBtn.textContent = '提交中...'

  try {
    const formData = new FormData()
    formData.append('themeId', currentTheme.id)
    formData.append('seriesId', currentSeries.id)

    selectedFiles.forEach(item => {
      formData.append('photos', item.file)
    })

    closeModal('uploadPhotoModal', true)
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

async function togglePhotoFeatured(seriesIndex, photoIndex) {
  const series = currentTheme?.series?.[seriesIndex]
  const photoName = getSeriesPhotos(series)[photoIndex]
  if (!series || !photoName) return

  if (series.enabled === false) {
    showToast('请先恢复这个作品集，再设置首页精选', 'info')
    return
  }
  if (isPhotoHidden(series, photoName)) {
    showToast('已下架照片不能设为首页精选，请先恢复照片', 'info')
    return
  }

  const willRemove = isPhotoFeaturedOnHome(series, photoName)
  if (!willRemove && getTotalHomeFeaturedPhotoCount() >= UI_CONFIG.maxHomeFeaturedPhotos) {
    showToast(`首页最多展示 ${UI_CONFIG.maxHomeFeaturedPhotos} 张精选照片，请先取消一张`, 'info')
    return
  }

  const hadExplicitFeaturedPhotos = Array.isArray(series.homeFeaturedPhotos)
  const previousFeaturedPhotos = hadExplicitFeaturedPhotos ? [...series.homeFeaturedPhotos] : null
  const previousFeaturedOnHome = series.featuredOnHome
  setPhotoFeaturedOnHome(series, photoName, !willRemove)
  renderSeriesList()

  const saved = await saveConfig()
  if (!saved) {
    if (hadExplicitFeaturedPhotos) series.homeFeaturedPhotos = previousFeaturedPhotos
    else delete series.homeFeaturedPhotos
    series.featuredOnHome = previousFeaturedOnHome
    renderSeriesList()
    return
  }

  showToast(willRemove ? '已取消首页精选' : '已加入首页精选', 'success')
}

// 下架或恢复单张照片。只改展示状态，不删除 COS 文件。
async function togglePhotoVisibility(seriesIndex, photoIndex) {
  const series = currentTheme.series[seriesIndex]
  const photoName = getSeriesPhotos(series)[photoIndex]
  if (!series || !photoName) return

  const willRestore = isPhotoHidden(series, photoName)
  if (!willRestore && !confirm('确定下架这张照片吗？下架后小程序前台不会显示，照片文件会保留，可以随时恢复。')) return

  const previousHiddenPhotos = Array.isArray(series.hiddenPhotos) ? [...series.hiddenPhotos] : null
  const previousFeaturedPhotos = Array.isArray(series.homeFeaturedPhotos) ? [...series.homeFeaturedPhotos] : null
  const previousFeaturedOnHome = series.featuredOnHome
  const wasFeatured = isPhotoFeaturedOnHome(series, photoName)
  if (!willRestore && wasFeatured) {
    setPhotoFeaturedOnHome(series, photoName, false)
  }
  setPhotoHidden(series, photoName, !willRestore)

  renderSeriesList()
  updateStats()
  const saved = await saveConfig()
  if (!saved) {
    if (previousHiddenPhotos) series.hiddenPhotos = previousHiddenPhotos
    else delete series.hiddenPhotos
    if (previousFeaturedPhotos) series.homeFeaturedPhotos = previousFeaturedPhotos
    else delete series.homeFeaturedPhotos
    series.featuredOnHome = previousFeaturedOnHome
    renderSeriesList()
    updateStats()
    return
  }

  const message = willRestore
    ? '照片已恢复，小程序会重新显示'
    : wasFeatured
      ? '照片已下架，并已从首页精选移除'
      : '照片已下架，文件没有删除'
  showToast(message, 'success')
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

function getDecorationSplitParts() {
  return {
    workspace: document.querySelector('.decoration-workspace'),
    preview: document.querySelector('.decoration-preview-pane'),
    splitter: document.getElementById('decorationSplitter')
  }
}

function getDecorationPreviewWidthBounds(workspaceWidth) {
  const minPreview = workspaceWidth <= 900 ? 260 : 300
  const minEditor = Math.min(640, Math.max(420, workspaceWidth * 0.55))
  const maxPreview = Math.max(
    minPreview,
    Math.min(workspaceWidth * 0.5, workspaceWidth - minEditor)
  )

  return { minPreview, maxPreview }
}

function updateDecorationSplitterAria(previewWidth) {
  const { workspace, splitter } = getDecorationSplitParts()
  if (!workspace || !splitter) return

  const workspaceWidth = workspace.getBoundingClientRect().width
  if (!workspaceWidth) return

  const { minPreview, maxPreview } = getDecorationPreviewWidthBounds(workspaceWidth)
  const previewPercent = Math.round((previewWidth / workspaceWidth) * 100)
  const editorPercent = 100 - previewPercent
  splitter.setAttribute('aria-valuemin', String(Math.round((minPreview / workspaceWidth) * 100)))
  splitter.setAttribute('aria-valuemax', String(Math.round((maxPreview / workspaceWidth) * 100)))
  splitter.setAttribute('aria-valuenow', String(previewPercent))
  splitter.setAttribute('aria-valuetext', `预览栏 ${previewPercent}%，编辑栏 ${editorPercent}%`)
}

function setDecorationPreviewWidth(targetWidth, { persist = false } = {}) {
  const { workspace } = getDecorationSplitParts()
  if (!workspace) return 0

  const workspaceWidth = workspace.getBoundingClientRect().width
  if (!workspaceWidth) return 0

  const { minPreview, maxPreview } = getDecorationPreviewWidthBounds(workspaceWidth)
  const previewWidth = Math.round(Math.min(maxPreview, Math.max(minPreview, targetWidth)))
  workspace.style.setProperty('--decoration-preview-width', `${previewWidth}px`)
  updateDecorationSplitterAria(previewWidth)

  if (persist) {
    try {
      localStorage.setItem(
        DECORATION_SPLIT_RATIO_STORAGE_KEY,
        String(previewWidth / workspaceWidth)
      )
    } catch {
    }
  }

  return previewWidth
}

function restoreDecorationSplitter() {
  const { workspace, preview } = getDecorationSplitParts()
  if (!workspace || !preview) return

  if (window.matchMedia('(max-width: 760px)').matches) {
    workspace.style.removeProperty('--decoration-preview-width')
    return
  }

  const workspaceWidth = workspace.getBoundingClientRect().width
  if (!workspaceWidth) return

  let storedRatio = 0
  try {
    storedRatio = Number(localStorage.getItem(DECORATION_SPLIT_RATIO_STORAGE_KEY))
  } catch {
  }

  if (Number.isFinite(storedRatio) && storedRatio > 0) {
    setDecorationPreviewWidth(workspaceWidth * storedRatio)
    return
  }

  workspace.style.removeProperty('--decoration-preview-width')
  requestAnimationFrame(() => updateDecorationSplitterAria(preview.getBoundingClientRect().width))
}

function resetDecorationSplitter({ notify = false } = {}) {
  const { workspace, preview } = getDecorationSplitParts()
  if (!workspace || !preview) return

  try {
    localStorage.removeItem(DECORATION_SPLIT_RATIO_STORAGE_KEY)
  } catch {
  }
  workspace.style.removeProperty('--decoration-preview-width')
  requestAnimationFrame(() => updateDecorationSplitterAria(preview.getBoundingClientRect().width))
  if (notify) showToast('已恢复默认栏宽', 'success')
}

function setupDecorationSplitter() {
  const { workspace, preview, splitter } = getDecorationSplitParts()
  if (!workspace || !preview || !splitter || splitter.dataset.bound === 'true') return

  splitter.dataset.bound = 'true'
  let dragging = false
  let resizeFrame = 0

  const moveSplitter = event => {
    if (!dragging) return
    const workspaceRect = workspace.getBoundingClientRect()
    setDecorationPreviewWidth(workspaceRect.right - event.clientX)
  }

  const finishDragging = event => {
    if (!dragging) return
    dragging = false
    splitter.classList.remove('is-dragging')
    document.body.classList.remove('decoration-resizing')
    window.removeEventListener('pointermove', moveSplitter)
    window.removeEventListener('pointerup', finishDragging)
    window.removeEventListener('pointercancel', finishDragging)
    setDecorationPreviewWidth(preview.getBoundingClientRect().width, { persist: true })
    if (event?.pointerId !== undefined && splitter.hasPointerCapture?.(event.pointerId)) {
      splitter.releasePointerCapture(event.pointerId)
    }
  }

  splitter.addEventListener('pointerdown', event => {
    if (event.button !== 0 || window.matchMedia('(max-width: 760px)').matches) return
    event.preventDefault()
    dragging = true
    splitter.classList.add('is-dragging')
    document.body.classList.add('decoration-resizing')
    splitter.setPointerCapture?.(event.pointerId)
    moveSplitter(event)
    window.addEventListener('pointermove', moveSplitter)
    window.addEventListener('pointerup', finishDragging)
    window.addEventListener('pointercancel', finishDragging)
  })

  splitter.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Home') {
      resetDecorationSplitter({ notify: true })
      return
    }

    const step = event.shiftKey ? 40 : 16
    const direction = event.key === 'ArrowLeft' ? 1 : -1
    setDecorationPreviewWidth(
      preview.getBoundingClientRect().width + (step * direction),
      { persist: true }
    )
  })

  splitter.addEventListener('dblclick', () => resetDecorationSplitter({ notify: true }))

  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeFrame)
    resizeFrame = requestAnimationFrame(() => {
      if (!window.matchMedia('(max-width: 760px)').matches) {
        toggleDecorationMobilePreview(false)
      }
      if (document.getElementById('themeSettingsModal')?.classList.contains('active')) {
        restoreDecorationSplitter()
      }
    })
  })
}

function getWorksManagementPreviewPage() {
  return normalizeDecorationConfig(portfolioData.decoration).siteTemplate === 'dark-gallery'
    ? 'gallery'
    : 'home'
}

function mountSharedCustomerPreview(host, pageKey) {
  const sharedPreview = document.getElementById('sharedCustomerPreview')
  if (!host || !sharedPreview) return
  if (sharedPreview.parentElement !== host) host.replaceChildren(sharedPreview)
  activeSkinPreviewPage = SKIN_PREVIEW_PAGE_KEYS.has(pageKey) ? pageKey : 'home'
  updateThemePreview()
  requestAnimationFrame(updateSkinPreviewScale)
}

function restoreManagementMainPreview() {
  const host = window.AdminWorkbench?.getHost(MANAGEMENT_MAIN_WORKBENCH_ID)
  if (host) mountSharedCustomerPreview(host, getWorksManagementPreviewPage())
}

function refreshManagementPreview() {
  const activeId = window.AdminWorkbench?.getActiveId?.()
  if (activeId) {
    window.AdminWorkbench.refresh(activeId)
    return
  }
  if (document.getElementById('themeSettingsModal')?.classList.contains('active')) {
    updateThemePreview()
    return
  }
  window.AdminWorkbench?.refresh(MANAGEMENT_MAIN_WORKBENCH_ID)
}

function renderSettingsWorkbenchPreview(host) {
  if (!host) return
  const bannerPanelActive = document.getElementById('panel-banner')?.style.display !== 'none'
  if (bannerPanelActive) {
    const banners = [
      ['main-banner', '首页 Banner'],
      ['booking-banner', '预约页 Banner'],
      ['about-banner', '简介页 Banner']
    ]
    host.innerHTML = `
      <section class="management-system-preview">
        <header><span>顾客端图片预览</span><h4>Banner 管理</h4></header>
        <div class="management-banner-preview-grid">
          ${banners.map(([type, label]) => {
            const image = document.getElementById(`preview-${type}`)
            const source = image?.style.display !== 'none' && image.complete && image.naturalWidth > 0
              ? image.src
              : ''
            return `
              <figure class="management-banner-preview-card">
                <div>${source ? `<img src="${escapeHtml(source)}" alt="${escapeHtml(label)}">` : '<span>暂无图片</span>'}</div>
                <figcaption><strong>${escapeHtml(label)}</strong><small>${selectedBanners[type] ? '已选择新图片，等待上传' : '当前云端图片'}</small></figcaption>
              </figure>
            `
          }).join('')}
        </div>
        <div class="management-system-card"><span>更新方式</span><strong>左侧选择图片后，可先在这里确认画面，再点击对应的上传按钮。</strong></div>
      </section>
    `
    return
  }
  const bucket = getManagementInputValue('settingBucket')
  const region = getManagementInputValue('settingRegion')
  const appId = getManagementInputValue('settingAppID')
  const configKey = configDiagnostics?.cos?.configKey || 'config/portfolio-config.json'
  const ready = Boolean(bucket && region)
  host.innerHTML = `
    <section class="management-system-preview">
      <header><span>云端连接预览</span><h4>${ready ? '配置可以进行连接验证' : '还需要补充云端信息'}</h4></header>
      <div class="management-system-card ${ready ? 'is-ready' : 'is-warning'}"><span>连接状态</span><strong>${ready ? 'Bucket 和地域已填写' : '请填写 Bucket 与地域'}</strong></div>
      <div class="management-system-card"><span>存储桶</span><code>${escapeHtml(bucket || '尚未填写')}</code></div>
      <div class="management-system-card"><span>地域</span><code>${escapeHtml(region || '尚未填写')}</code></div>
      <div class="management-system-card"><span>小程序 AppID</span><code>${escapeHtml(appId || '尚未填写')}</code></div>
      <div class="management-system-card"><span>小程序读取配置</span><code>${escapeHtml(configKey)}</code></div>
      <div class="management-system-card"><span>安全说明</span><strong>右侧不会显示 SecretKey；保存后由后台验证连接并同步配置。</strong></div>
    </section>
  `
}

function renderUploadWorkbenchPreview(host) {
  if (!host) return
  const totalSize = selectedFiles.reduce((sum, item) => sum + item.file.size, 0)
  const photos = selectedFiles.slice(0, 12).map(item => `
    <figure style="margin:0; aspect-ratio:1; overflow:hidden; border-radius:6px; background:#edf0ed;">
      <img src="${escapeHtml(item.previewUrl)}" alt="${escapeHtml(item.file.name)}" style="width:100%; height:100%; object-fit:cover;">
    </figure>
  `).join('')
  host.innerHTML = `
    <section class="management-system-preview">
      <header><span>照片上传预览</span><h4>${escapeHtml(currentSeries?.title || '当前作品集')}</h4></header>
      <div class="management-system-card ${selectedFiles.length ? 'is-ready' : 'is-warning'}"><span>本次选择</span><strong>${selectedFiles.length ? `${selectedFiles.length} 张，共 ${formatFileSize(totalSize)}` : '还没有选择照片'}</strong></div>
      <div style="display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px;">${photos}</div>
      <div class="management-system-card"><span>上传位置</span><strong>${escapeHtml(currentTheme?.name || '未选择分类')} / ${escapeHtml(currentSeries?.title || '未选择作品集')}</strong></div>
    </section>
  `
}

function setupManagementWorkbenches() {
  if (!window.AdminWorkbench) return
  const close = id => closeModal(id)
  const customerPreview = pageKey => host => mountSharedCustomerPreview(host, pageKey)
  const modalConfigs = [
    ['profileModal', '修改门店介绍、头像、数据和联系方式', 'about'],
    ['homeBannerModal', '修改首页文字和微信分享内容', 'home'],
    ['bookingSettingsModal', '修改顾客预约时可以选择的风格', 'booking'],
    ['contentModulesModal', '修改套餐、档期、评价、流程和常见问题', 'packages'],
    ['addThemeModal', '新增分类并查看顾客端分类入口', 'home'],
    ['editThemeModal', '修改分类名称和显示顺序', 'home'],
    ['addSeriesModal', '新增作品集并预览详情结构', 'series'],
    ['editSeriesModal', '修改作品集资料并实时查看效果', 'series']
  ]
  modalConfigs.forEach(([id, subtitle, pageKey]) => {
    window.AdminWorkbench.registerModal(id, {
      subtitle,
      onRequestClose: close,
      onPreview: customerPreview(pageKey),
      onClose: restoreManagementMainPreview
    })
  })
  window.AdminWorkbench.registerModal('uploadPhotoModal', {
    subtitle: '左侧选择照片，右侧确认文件和归属作品集',
    saveText: '开始上传',
    mobileSaveText: '上传',
    onRequestClose: close,
    onPreview: renderUploadWorkbenchPreview,
    onClose: restoreManagementMainPreview
  })
  window.AdminWorkbench.registerModal('settingsModal', {
    subtitle: '配置云端存储并查看连接目标和同步状态',
    onRequestClose: close,
    onPreview: renderSettingsWorkbenchPreview,
    onClose: restoreManagementMainPreview
  })

  window.AdminWorkbench.createMainSurface(document.querySelector('.main-content'), {
    id: MANAGEMENT_MAIN_WORKBENCH_ID,
    onPreview: host => mountSharedCustomerPreview(host, getWorksManagementPreviewPage())
  })
}

// 模态框操作
function openModal(modalId) {
  if (modalId === 'themeSettingsModal') {
    mountSharedCustomerPreview(document.querySelector('#themeSettingsModal .decoration-preview-pane'), 'home')
    document.getElementById(modalId).classList.add('active')
    document.body.classList.add('decoration-workspace-open')
    requestAnimationFrame(restoreDecorationSplitter)
    return
  }
  if (window.AdminWorkbench?.open(modalId)) return
  document.getElementById(modalId).classList.add('active')
}

function closeModal(modalId, forceClose = false) {
  if (!forceClose && modalId === 'themeSettingsModal' && decorationHasUnsavedChanges) {
    const shouldClose = window.confirm('还有未保存的装修修改，确定退出吗？')
    if (!shouldClose) return
    setDecorationSaveState('clean')
  }
  if (!forceClose && window.AdminWorkbench?.hasUnsaved(modalId)) {
    const shouldClose = window.confirm('还有未保存的修改，确定退出吗？')
    if (!shouldClose) return
  }
  const workbenchClosed = window.AdminWorkbench?.close(modalId) || false
  if (!workbenchClosed) document.getElementById(modalId).classList.remove('active')
  if (modalId === 'themeSettingsModal') {
    document.body.classList.remove('decoration-workspace-open')
    toggleDecorationMobilePreview(false)
  }
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
  if (workbenchClosed || modalId === 'themeSettingsModal') restoreManagementMainPreview()
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
window.addEventListener('DOMContentLoaded', () => {
  adminInitializationPromise = init()
})

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

  if (!banner.logoText || !banner.tagText) {
    showToast('请填写首页名称和角标文案', 'error')
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

function normalizeCustomIconPath(value) {
  const iconPath = String(value || '').trim()
  if (!iconPath) return ''
  if (/^https?:\/\/[^\s]+$/i.test(iconPath)) return iconPath
  return /^icon\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.png$/i.test(iconPath) ? iconPath : ''
}

function getNavigationIconKey(targetKey) {
  const match = /^icons\.navigation\.(portfolio|about|packages|booking|stores)$/.exec(String(targetKey || ''))
  return match?.[1] || ''
}

function getNavigationCustomIconPath(targetKey) {
  const key = getNavigationIconKey(targetKey)
  if (!key) return ''
  return normalizeCustomIconPath(decorationEditorState?.icons?.navigationCustom?.[key])
}

function setNavigationCustomIconPath(targetKey, iconPath) {
  const key = getNavigationIconKey(targetKey)
  if (!key || !decorationEditorState?.icons) return false
  if (!decorationEditorState.icons.navigationCustom) {
    decorationEditorState.icons.navigationCustom = deepClone(DEFAULT_DECORATION_CONFIG.icons.navigationCustom)
  }
  decorationEditorState.icons.navigationCustom[key] = normalizeCustomIconPath(iconPath)
  return true
}

function getIconMeta(name) {
  return CONFIGURABLE_ICONS.find(item => item.name === name) || null
}

function renderIconPickerButton(value, targetKey, allowEmpty = false) {
  const icon = normalizeConfigurableIcon(value, '', allowEmpty)
  const iconMeta = getIconMeta(icon)
  const customIconPath = getNavigationCustomIconPath(targetKey)
  const customIconUrl = getSkinPreviewAssetUrl(customIconPath)
  const label = customIconPath
    ? '自定义图标'
    : (iconMeta?.label || (allowEmpty ? '不显示图标' : '选择图标'))
  const preview = customIconUrl
    ? `<img src="${escapeHtml(customIconUrl)}" alt="">`
    : (icon
        ? `<img src="/mini-icons/${icon}.svg" alt="">`
        : '<span class="icon-picker-empty">无</span>')
  const actionLabel = `${label}，点击更换`

  return `
    <button type="button" class="icon-picker-trigger" onclick="openIconPicker('${targetKey}')" aria-label="${escapeHtml(actionLabel)}" title="${escapeHtml(actionLabel)}">
      <span class="icon-picker-preview">${preview}</span>
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
      navigation: { portfolio: '作品集导航图标', about: '简介导航图标', packages: '套餐导航图标', booking: '咨询导航图标', stores: '门店导航图标' },
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
      render: group === 'navigation' ? renderNavigationEditor : renderGlobalIconEditors
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

function createNavigationChangeContext(key, detail) {
  const definition = NAVIGATION_ITEM_DEFINITIONS[key]
  return {
    key: `navigation:item:${key}:${detail}`,
    stage: 'navigation',
    label: `${definition?.label || '底部入口'}${detail === 'order' ? '顺序' : detail === 'enabled' ? '显示状态' : '文字'}`,
    editorElement: document.getElementById(`navigation-${key}-card`),
    previewSelector: '#skinPreviewBottomNav'
  }
}

function renderNavigationEditor() {
  const container = document.getElementById('navigationConfigEditor')
  if (!container || !decorationEditorState?.navigation) return

  const items = normalizeNavigationItems(decorationEditorState.navigation.items)
  decorationEditorState.navigation.items = items
  const enabledItems = items.filter(item => item.enabled)

  container.innerHTML = items.map(item => {
    const definition = NAVIGATION_ITEM_DEFINITIONS[item.key]
    const enabledIndex = enabledItems.findIndex(enabledItem => enabledItem.key === item.key)
    const text = decorationEditorState.navigation[definition.textKey] || DEFAULT_DECORATION_CONFIG.navigation[definition.textKey]
    const targetKey = `icons.navigation.${item.key}`
    const icon = decorationEditorState.icons.navigation[item.key]
    const canMoveUp = item.enabled && enabledIndex > 0
    const canMoveDown = item.enabled && enabledIndex >= 0 && enabledIndex < enabledItems.length - 1

    return `
      <article class="navigation-config-card ${item.enabled ? '' : 'is-disabled'}" id="navigation-${item.key}-card">
        <div class="navigation-config-card-head">
          <div class="navigation-config-card-head-main">
            <span class="decoration-order">${item.enabled ? enabledIndex + 1 : '—'}</span>
            <div class="navigation-config-card-title"><strong>${escapeHtml(definition.label)}</strong><div class="navigation-entry-status">${item.enabled ? `底部入口 ${enabledIndex + 1}` : '未显示'}</div></div>
          </div>
          <div class="navigation-config-card-actions">
            <div class="navigation-config-order-actions">
              <button type="button" class="icon-control" title="向前移动" aria-label="向前移动${escapeHtml(definition.label)}" onclick="moveNavigationItem('${item.key}', -1)" ${canMoveUp ? '' : 'disabled'}>↑</button>
              <button type="button" class="icon-control" title="向后移动" aria-label="向后移动${escapeHtml(definition.label)}" onclick="moveNavigationItem('${item.key}', 1)" ${canMoveDown ? '' : 'disabled'}>↓</button>
            </div>
            <label class="compact-toggle"><input type="checkbox" ${item.enabled ? 'checked' : ''} onchange="toggleNavigationItem('${item.key}', this.checked)"><span>显示</span></label>
          </div>
        </div>
        <div class="form-group"><label>显示文字</label><input type="text" id="nav-${item.key}-text" maxlength="6" value="${escapeHtml(text)}" oninput="updateNavigationItemText('${item.key}', this.value)"></div>
        <div class="icon-setting-item"><span>显示图标</span>${renderIconPickerButton(icon, targetKey)}</div>
      </article>
    `
  }).join('')
}

function updateNavigationItemText(key, value) {
  const definition = NAVIGATION_ITEM_DEFINITIONS[key]
  if (!definition || !decorationEditorState?.navigation) return
  decorationEditorState.navigation[definition.textKey] = String(value || '').slice(0, 6)
  markDecorationChanged(createNavigationChangeContext(key, 'text'))
  updateThemePreview()
}

function toggleNavigationItem(key, enabled) {
  const items = normalizeNavigationItems(decorationEditorState?.navigation?.items)
  const item = items.find(entry => entry.key === key)
  if (!item) return

  const enabledCount = items.filter(entry => entry.enabled).length
  if (!enabled && enabledCount <= 2) {
    showToast('底部导航至少保留 2 个入口', 'error')
    renderNavigationEditor()
    return
  }

  if (enabled && enabledCount >= 5) {
    showToast('底部导航最多显示 5 个入口', 'error')
    renderNavigationEditor()
    return
  }

  item.enabled = Boolean(enabled)
  decorationEditorState.navigation.items = normalizeNavigationItems(items)
  renderNavigationEditor()
  markDecorationChanged(createNavigationChangeContext(key, 'enabled'))
  updateThemePreview()
}

function moveNavigationItem(key, direction) {
  const items = normalizeNavigationItems(decorationEditorState?.navigation?.items)
  const currentIndex = items.findIndex(item => item.key === key && item.enabled)
  const targetIndex = currentIndex + direction
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= items.length || !items[targetIndex]?.enabled) return

  ;[items[currentIndex], items[targetIndex]] = [items[targetIndex], items[currentIndex]]
  decorationEditorState.navigation.items = items
  renderNavigationEditor()
  markDecorationChanged(createNavigationChangeContext(key, 'order'))
  updateThemePreview()
}

function renderGlobalIconEditors() {
  renderNavigationEditor()
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
  const customIconPath = getNavigationCustomIconPath(targetKey)
  const customIconUrl = getSkinPreviewAssetUrl(customIconPath)
  const title = document.getElementById('iconPickerTitle')
  const grid = document.getElementById('iconPickerGrid')
  const resetButton = document.getElementById('iconPickerReset')
  if (title) title.textContent = target.label
  if (resetButton) resetButton.textContent = target.allowEmpty ? '不显示图标' : '恢复默认'
  if (grid) {
    const presetOptions = CONFIGURABLE_ICONS.map(item => `
      <button type="button" class="icon-picker-option ${!customIconPath && target.current === item.name ? 'selected' : ''}" onclick="selectDecorationIcon('${item.name}')" aria-label="${escapeHtml(item.label)}" title="${escapeHtml(item.label)}">
        <img src="/mini-icons/${item.name}.svg" alt="">
      </button>
    `).join('')
    const customOption = getNavigationIconKey(targetKey)
      ? `
        <button type="button" class="icon-picker-option icon-picker-upload-option ${customIconPath ? 'selected' : ''}" onclick="openCustomNavigationIconUpload()" aria-label="上传自定义图标" title="上传正方形透明 PNG 图标">
          <img src="${escapeHtml(customIconUrl || '/mini-icons/plus.svg')}" alt="">
        </button>
      `
      : ''
    grid.innerHTML = `${presetOptions}${customOption}`
  }

  openModal('iconPickerModal')
}

function selectDecorationIcon(icon) {
  const targetKey = activeIconTargetKey
  const target = getIconTarget(targetKey)
  if (!target || !CONFIGURABLE_ICON_NAMES.has(icon)) return

  target.set(icon)
  setNavigationCustomIconPath(targetKey, '')
  target.render()
  markDecorationChanged(createIconChangeContext(targetKey))
  closeIconPicker()
  updateThemePreview()
}

function resetActiveIcon() {
  const targetKey = activeIconTargetKey
  const target = getIconTarget(targetKey)
  if (!target) return

  target.set(target.allowEmpty ? '' : target.defaultValue)
  setNavigationCustomIconPath(targetKey, '')
  target.render()
  markDecorationChanged(createIconChangeContext(targetKey))
  closeIconPicker()
  updateThemePreview()
}

function openCustomNavigationIconUpload() {
  if (!getNavigationIconKey(activeIconTargetKey)) return
  const fileInput = document.getElementById('customNavigationIconInput')
  if (!fileInput) return
  fileInput.value = ''
  fileInput.click()
}

function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    const objectUrl = URL.createObjectURL(file)
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve({ width: image.naturalWidth, height: image.naturalHeight })
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('无法读取图标图片'))
    }
    image.src = objectUrl
  })
}

async function handleCustomNavigationIconSelected(event) {
  const file = event.target.files?.[0]
  const targetKey = activeIconTargetKey
  if (!file || !getNavigationIconKey(targetKey)) return

  try {
    if (file.type !== 'image/png') {
      throw new Error('自定义图标只支持 PNG')
    }
    if (file.size > 512 * 1024) {
      throw new Error('图标文件不能超过 512KB')
    }

    const dimensions = await getImageDimensions(file)
    if (dimensions.width !== dimensions.height) {
      throw new Error('请上传正方形图标')
    }
    if (dimensions.width < 64 || dimensions.width > 1024) {
      throw new Error('图标尺寸应在 64×64 至 1024×1024 像素之间')
    }

    const formData = new FormData()
    formData.append('asset', file)
    formData.append('folder', 'icon')
    showToast('正在上传自定义图标...', 'info')

    const response = await fetch(`${CONFIG.apiUrl}/upload/asset`, {
      method: 'POST',
      body: formData
    })
    const result = await response.json()
    if (!response.ok || !result.success) {
      throw new Error(result.error || '图标上传失败')
    }

    if (!setNavigationCustomIconPath(targetKey, result.assetPath)) {
      throw new Error('未找到对应的导航入口')
    }
    const target = getIconTarget(targetKey)
    target?.render()
    markDecorationChanged(createIconChangeContext(targetKey))
    closeIconPicker()
    updateThemePreview()
    showToast('自定义图标已上传，请保存并更新小程序', 'success')
  } catch (error) {
    console.error('自定义导航图标上传失败:', error)
    showToast(error.message || '自定义图标上传失败', 'error')
  } finally {
    event.target.value = ''
  }
}

function closeIconPicker() {
  closeModal('iconPickerModal')
  activeIconTargetKey = ''
}

function renderDecorationSectionEditor(pageKey) {
  const container = document.getElementById(`${pageKey}DecorationSections`)
  const sections = decorationEditorState?.[pageKey]?.sections || []
  if (!container) return

  const activeSections = sections
    .map((section, index) => ({ section, index }))
    .filter(item => item.section.enabled !== false)
  const inactiveSections = sections
    .map((section, index) => ({ section, index }))
    .filter(item => item.section.enabled === false)

  const activeMarkup = activeSections.map(({ section, index }, visibleIndex) => {
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
    const changeHostKey = `section:${pageKey}:${section.type}`
    const modifiedClass = hasDecorationChangeForHost(changeHostKey) ? 'decoration-field-modified' : ''

    return `
      <div class="decoration-row ${modifiedClass}" data-decoration-change-host="${changeHostKey}">
        <div class="decoration-row-toolbar">
          <div class="decoration-row-name">
            <span class="decoration-order">${visibleIndex + 1}</span>
            <strong>${escapeHtml(sectionName)}</strong>
          </div>
          <div class="decoration-row-actions">
            <button type="button" class="icon-control" title="向上移动" aria-label="向上移动${escapeHtml(sectionName)}" onclick="moveDecorationSection('${pageKey}', ${index}, -1)" ${visibleIndex === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" class="icon-control" title="向下移动" aria-label="向下移动${escapeHtml(sectionName)}" onclick="moveDecorationSection('${pageKey}', ${index}, 1)" ${visibleIndex === activeSections.length - 1 ? 'disabled' : ''}>↓</button>
            <button type="button" class="decoration-remove-section" onclick="removeDecorationSection('${pageKey}', ${index})">移出页面</button>
          </div>
        </div>
        ${supportsCopy ? `
          <div class="decoration-row-status">${section.title ? `当前标题：${escapeHtml(section.title)}` : '当前未单独设置标题'}</div>
          <details class="decoration-row-details">
            <summary>修改此模块文字</summary>
            <div class="decoration-copy-grid">
              <label>模块标题<input type="text" value="${escapeHtml(section.title || '')}" oninput="updateDecorationSectionValue('${pageKey}', ${index}, 'title', this.value)"></label>
              <label>补充说明<input type="text" value="${escapeHtml(section.subtitle || '')}" oninput="updateDecorationSectionValue('${pageKey}', ${index}, 'subtitle', this.value)"></label>
              ${supportsAction ? `<label>按钮文字<input type="text" value="${escapeHtml(section.actionText || '')}" oninput="updateDecorationSectionValue('${pageKey}', ${index}, 'actionText', this.value)"></label>` : ''}
              <div class="decoration-icon-field"><span>标题图标</span>${renderIconPickerButton(section.icon, `section.${pageKey}.${index}`, true)}</div>
            </div>
          </details>
        ` : '<div class="decoration-row-status">内容从对应的门店资料自动带入</div>'}
      </div>
    `
  }).join('')

  const libraryMarkup = inactiveSections.length
    ? inactiveSections.map(({ section }) => {
      const sectionName = DECORATION_SECTION_NAMES[pageKey]?.[section.type] || section.type
      return `<button type="button" class="decoration-add-section" onclick="addDecorationSection('${pageKey}', '${escapeHtml(section.type)}')"><span>＋</span>${escapeHtml(sectionName)}</button>`
    }).join('')
    : '<span class="decoration-module-library-empty">当前页面的可用模块都已添加</span>'

  container.innerHTML = `
    <div class="decoration-active-modules">
      ${activeMarkup || '<div class="decoration-module-empty">当前页面暂无模块，请从下方添加。</div>'}
    </div>
    <div class="decoration-module-library">
      <div class="decoration-module-library-heading">
        <strong>添加模块</strong>
        <span>选择后会放到当前页面底部</span>
      </div>
      <div class="decoration-module-library-actions">${libraryMarkup}</div>
    </div>
  `
}

function renderBookingFieldEditor() {
  const container = document.getElementById('bookingFieldEditor')
  const fields = decorationEditorState?.booking?.fields || []
  if (!container) return

  container.innerHTML = fields.map((field, index) => {
    const changeHostKey = `field:${field.id}`
    const modifiedClass = hasDecorationChangeForHost(changeHostKey) ? 'decoration-field-modified' : ''
    return `
    <div class="decoration-row field-row ${field.enabled === false ? 'is-disabled' : ''} ${modifiedClass}" data-decoration-change-host="${changeHostKey}">
      <div class="decoration-row-toolbar">
        <div class="decoration-row-name">
          <span class="decoration-order">${index + 1}</span>
          <strong>${escapeHtml(field.label || field.id)}</strong>
        </div>
        <div class="decoration-row-actions">
          <label class="compact-toggle"><input type="checkbox" ${field.enabled === false ? '' : 'checked'} onchange="updateBookingFieldValue(${index}, 'enabled', this.checked)"><span>显示</span></label>
          <label class="compact-toggle"><input type="checkbox" ${field.required === true ? 'checked' : ''} onchange="updateBookingFieldValue(${index}, 'required', this.checked)"><span>必填</span></label>
          <button type="button" class="icon-control" title="向上移动" aria-label="向上移动${escapeHtml(field.label || field.id)}" onclick="moveBookingField(${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="icon-control" title="向下移动" aria-label="向下移动${escapeHtml(field.label || field.id)}" onclick="moveBookingField(${index}, 1)" ${index === fields.length - 1 ? 'disabled' : ''}>↓</button>
        </div>
      </div>
      <div class="decoration-row-status">${field.required === true ? '客户必须填写' : '客户可以不填'}${field.placeholder ? ` · 提示：${escapeHtml(field.placeholder)}` : ''}</div>
      <details class="decoration-row-details">
        <summary>修改名称、提示和图标</summary>
        <div class="decoration-copy-grid two-columns">
          <label>显示名称<input type="text" value="${escapeHtml(field.label || '')}" oninput="updateBookingFieldValue(${index}, 'label', this.value)"></label>
          <label>输入提示<input type="text" value="${escapeHtml(field.placeholder || '')}" oninput="updateBookingFieldValue(${index}, 'placeholder', this.value)"></label>
          <div class="decoration-icon-field"><span>字段图标</span>${renderIconPickerButton(field.icon, `field.${index}`)}</div>
        </div>
      </details>
    </div>
  `
  }).join('')
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
  markDecorationChanged(createSectionChangeContext(pageKey, section, fieldName))
  updateThemePreview()
}

function removeDecorationSection(pageKey, index) {
  const sections = decorationEditorState?.[pageKey]?.sections
  const section = sections?.[index]
  if (!section || section.enabled === false) return
  if (sections.filter(item => item.enabled !== false).length <= 1) {
    showToast('页面至少保留一个模块', 'info')
    return
  }

  section.enabled = false
  decorationEditorState[pageKey].sections = [
    ...sections.filter(item => item.enabled !== false),
    ...sections.filter(item => item.enabled === false)
  ]
  renderDecorationSectionEditor(pageKey)
  markDecorationChanged(createSectionChangeContext(pageKey, section, 'removed'))
  updateThemePreview()
}

function addDecorationSection(pageKey, sectionType) {
  const sections = decorationEditorState?.[pageKey]?.sections
  const section = sections?.find(item => item.type === sectionType)
  if (!section || section.enabled !== false) return

  section.enabled = true
  decorationEditorState[pageKey].sections = [
    ...sections.filter(item => item.enabled !== false),
    ...sections.filter(item => item.enabled === false)
  ]
  renderDecorationSectionEditor(pageKey)
  markDecorationChanged(createSectionChangeContext(pageKey, section, 'added'))
  updateThemePreview()
}

function moveDecorationSection(pageKey, index, direction) {
  const sections = decorationEditorState?.[pageKey]?.sections
  const moved = sections?.[index]
  if (!sections || !moved || moved.enabled === false) return

  const activeSections = sections.filter(section => section.enabled !== false)
  const inactiveSections = sections.filter(section => section.enabled === false)
  const activeIndex = activeSections.indexOf(moved)
  const targetIndex = activeIndex + direction
  if (activeIndex < 0 || targetIndex < 0 || targetIndex >= activeSections.length) return

  activeSections.splice(activeIndex, 1)
  activeSections.splice(targetIndex, 0, moved)
  decorationEditorState[pageKey].sections = [...activeSections, ...inactiveSections]
  renderDecorationSectionEditor(pageKey)
  markDecorationChanged(createSectionChangeContext(pageKey, moved, 'order'))
  updateThemePreview()
}

function updateBookingFieldValue(index, fieldName, value) {
  const field = decorationEditorState?.booking?.fields?.[index]
  if (!field) return
  field[fieldName] = value

  if (fieldName === 'enabled' || fieldName === 'required') {
    renderBookingFieldEditor()
  }
  markDecorationChanged(createBookingFieldChangeContext(field.id, fieldName))
  updateThemePreview()
}

function moveBookingField(index, direction) {
  const fields = decorationEditorState?.booking?.fields
  const targetIndex = index + direction
  if (!fields || targetIndex < 0 || targetIndex >= fields.length) return

  const [moved] = fields.splice(index, 1)
  fields.splice(targetIndex, 0, moved)
  renderBookingFieldEditor()
  markDecorationChanged(createBookingFieldChangeContext(moved.id, 'order'))
  updateThemePreview()
}

function getDecorationControlLabel(element) {
  const formGroup = element?.closest('.form-group')
  const label = formGroup?.querySelector(':scope > label')
  if (label?.textContent.trim()) return label.textContent.trim()
  return element?.getAttribute('aria-label') || element?.id || '当前设置'
}

function getStaticDecorationChangeContext(element) {
  const stagePanel = element?.closest('[data-decoration-stage-panel]')
  const stage = stagePanel?.dataset.decorationStagePanel || activeDecorationStage
  const id = element?.id || `${stage}-setting`
  const context = {
    key: `${stage}:control:${id}`,
    stage,
    label: getDecorationControlLabel(element),
    editorElement: element
  }

  if (id === 'themeBrandName') {
    return { ...context, previewPage: 'home', previewSelector: '.customer-preview-hero' }
  }
  if (id.startsWith('theme')) {
    return { ...context, previewSelector: '#skinLivePreview' }
  }
  if (id.startsWith('term-')) {
    return { ...context, previewSelector: '#skinLivePreview' }
  }
  if (id.startsWith('nav-') || id === 'navStyle') {
    return { ...context, previewSelector: '#skinPreviewBottomNav' }
  }
  if (id === 'homeHeroVariant') {
    return { ...context, previewPage: 'home', previewSelector: '[data-preview-section="hero"]' }
  }
  if (['homeGalleryVariant', 'homeGalleryColumns', 'homeImageRatio', 'homeCardContent', 'homeShowTitle', 'homeShowCategory', 'homeShowDescription', 'homeGalleryGap'].includes(id)) {
    return { ...context, previewPage: 'home', previewSelector: '[data-preview-section="portfolio"]' }
  }
  if (id === 'aboutHeaderVariant') {
    return { ...context, previewPage: 'about', previewSelector: '[data-preview-section="profile"]' }
  }
  if (id === 'bookingHeaderVariant') {
    return { ...context, previewPage: 'booking', previewSelector: '[data-preview-section="hero"]' }
  }
  if (id === 'bookingFormVariant') {
    return { ...context, previewPage: 'booking', previewSelector: '[data-preview-section="form"]' }
  }
  return { ...context, previewPage: activeDecorationPage }
}

function createSectionChangeContext(pageKey, section, detail = 'content') {
  const sectionType = section?.type || 'section'
  const sectionName = DECORATION_SECTION_NAMES[pageKey]?.[sectionType] || sectionType
  const hostKey = `section:${pageKey}:${sectionType}`
  return {
    key: `pages:${hostKey}:${detail}`,
    stage: 'pages',
    label: `${DECORATION_PAGE_GUIDE[pageKey]?.name || '页面'} · ${sectionName}`,
    hostKey,
    editorSelector: `[data-decoration-change-host="${hostKey}"]`,
    previewPage: pageKey,
    previewSelector: `[data-preview-section="${sectionType}"]`
  }
}

function createBookingFieldChangeContext(fieldId, detail = 'content') {
  const field = decorationEditorState?.booking?.fields?.find(item => item.id === fieldId)
  const hostKey = `field:${fieldId}`
  return {
    key: `pages:${hostKey}:${detail}`,
    stage: 'pages',
    label: `预约咨询 · ${field?.label || fieldId}`,
    hostKey,
    editorSelector: `[data-decoration-change-host="${hostKey}"]`,
    previewPage: 'booking',
    previewSelector: `[data-preview-field="${fieldId}"]`
  }
}

function createIconChangeContext(targetKey) {
  const parts = String(targetKey || '').split('.')
  if (parts[0] === 'section') {
    const pageKey = parts[1]
    const section = decorationEditorState?.[pageKey]?.sections?.[Number(parts[2])]
    return createSectionChangeContext(pageKey, section, 'icon')
  }
  if (parts[0] === 'field') {
    const field = decorationEditorState?.booking?.fields?.[Number(parts[1])]
    return createBookingFieldChangeContext(field?.id || parts[1], 'icon')
  }

  const group = parts[1]
  const key = parts[2]
  const containerIds = {
    'navigation.portfolio': 'navigation-portfolio-card',
    'navigation.about': 'navigation-about-card',
    'navigation.packages': 'navigation-packages-card',
    'navigation.booking': 'navigation-booking-card',
    'navigation.stores': 'navigation-stores-card',
    quickJump: 'quickJumpIconEditor',
    contact: 'contactIconEditor'
  }
  const containerId = containerIds[`${group}.${key}`] || containerIds[group]
  const context = {
    key: `navigation:icon:${group}:${key}`,
    stage: 'navigation',
    label: getIconTarget(targetKey)?.label || '页面图标',
    editorElement: containerId ? document.getElementById(containerId) : null
  }
  if (group === 'navigation') return { ...context, previewSelector: '#skinPreviewBottomNav' }
  if (group === 'quickJump') return { ...context, previewSelector: '#skinPreviewQuickJump' }
  if (group === 'contact') {
    return { ...context, previewPage: 'about', previewSelector: '[data-preview-section="contact"]' }
  }
  return context
}

function hasDecorationChangeForHost(hostKey) {
  if (!hostKey) return false
  return [...decorationChangeRegistry.values()].some(change => change.hostKey === hostKey)
}

function getDecorationEditorFeedbackHost(context) {
  if (context?.editorSelector) return document.querySelector(context.editorSelector)
  const element = context?.editorElement
  if (!element) return null
  return element.closest(
    '.form-group, .decoration-color-setting, .decoration-row, .icon-setting-item, .compact-toggle, .skin-preset-card'
  ) || element
}

function markDecorationEditorFeedback(context, shouldPulse) {
  const host = getDecorationEditorFeedbackHost(context)
  if (!host) return
  host.classList.add('decoration-field-modified')
  host.setAttribute('title', '此处已经修改，保存后更新小程序')
  if (!shouldPulse || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  host.classList.remove('decoration-editor-feedback-pulse')
  void host.offsetWidth
  host.classList.add('decoration-editor-feedback-pulse')
  window.setTimeout(() => host.classList.remove('decoration-editor-feedback-pulse'), 950)
}

function updateDecorationChangeSummary() {
  const total = decorationChangeRegistry.size
  const stageCounts = Object.fromEntries(DECORATION_STAGE_ORDER.map(stage => [stage, 0]))
  decorationChangeRegistry.forEach(change => {
    if (change.stage in stageCounts) stageCounts[change.stage] += 1
  })
  document.querySelectorAll('[data-decoration-change-count]').forEach(badge => {
    const count = stageCounts[badge.dataset.decorationChangeCount] || 0
    badge.textContent = String(count)
    badge.hidden = count === 0
    badge.setAttribute('aria-label', `${count} 处未保存修改`)
  })
  return total
}

function clearDecorationChangeFeedback() {
  decorationChangeRegistry.clear()
  pendingDecorationPreviewFeedback = null
  lastDecorationPreviewFeedback = null
  if (decorationPreviewFeedbackTimer) {
    window.clearTimeout(decorationPreviewFeedbackTimer)
    decorationPreviewFeedbackTimer = null
  }
  document.querySelectorAll('.decoration-field-modified, .decoration-editor-feedback-pulse')
    .forEach(element => element.classList.remove('decoration-field-modified', 'decoration-editor-feedback-pulse'))
  document.querySelectorAll('.decoration-preview-feedback, .decoration-preview-feedback-pulse')
    .forEach(element => element.classList.remove('decoration-preview-feedback', 'decoration-preview-feedback-pulse'))
  updateDecorationChangeSummary()
}

function queueDecorationPreviewFeedback(context, shouldAnimate = true) {
  if (!context?.previewSelector) return
  if (context.previewPage && !SKIN_PREVIEW_PAGE_KEYS.has(context.previewPage)) return
  if (context.previewPage) {
    activeSkinPreviewPage = context.previewPage
    skinPreviewQuickJumpOpen = false
  }
  pendingDecorationPreviewFeedback = {
    selector: context.previewSelector,
    label: context.label || '刚刚修改的位置',
    animate: shouldAnimate
  }
  lastDecorationPreviewFeedback = { ...pendingDecorationPreviewFeedback, animate: true }
}

function applyPendingDecorationPreviewFeedback() {
  const feedback = pendingDecorationPreviewFeedback
  pendingDecorationPreviewFeedback = null
  if (!feedback) return

  const target = document.querySelector(feedback.selector) || document.getElementById('skinLivePreview')
  if (!target) return
  document.querySelectorAll('.decoration-preview-feedback, .decoration-preview-feedback-pulse')
    .forEach(element => element.classList.remove('decoration-preview-feedback', 'decoration-preview-feedback-pulse'))
  target.classList.remove('decoration-preview-feedback', 'decoration-preview-feedback-pulse')
  target.setAttribute('data-decoration-feedback-label', feedback.label)
  void target.offsetWidth
  target.classList.add('decoration-preview-feedback')
  if (feedback.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    target.classList.add('decoration-preview-feedback-pulse')
  }

  const viewport = document.getElementById('skinPreviewViewport')
  if (viewport?.contains(target) && target !== viewport) {
    const viewportRect = viewport.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const nextTop = viewport.scrollTop + targetRect.top - viewportRect.top - 22
    viewport.scrollTo({
      top: Math.max(0, nextTop),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    })
  }

  if (decorationPreviewFeedbackTimer) window.clearTimeout(decorationPreviewFeedbackTimer)
  decorationPreviewFeedbackTimer = window.setTimeout(() => {
    target.classList.remove('decoration-preview-feedback', 'decoration-preview-feedback-pulse')
    decorationPreviewFeedbackTimer = null
  }, 1300)
}

function setDecorationSaveState(state = 'clean') {
  const status = document.getElementById('decorationSaveStatus')
  const label = status?.querySelector('span')

  if (state === 'clean') {
    decorationHasUnsavedChanges = false
    clearDecorationChangeFeedback()
  }
  if (state === 'dirty') decorationHasUnsavedChanges = true

  status?.classList.toggle('is-dirty', state === 'dirty')
  status?.classList.toggle('is-saving', state === 'saving')
  if (label) {
    const total = updateDecorationChangeSummary()
    label.textContent = state === 'saving'
      ? `正在保存 ${total} 处修改`
      : (state === 'dirty' ? `有 ${total} 处修改未保存` : '右侧实时预览')
  }
}

function markDecorationChanged(context = {}) {
  const normalized = {
    key: context.key || `${activeDecorationStage}:change:${decorationChangeRegistry.size + 1}`,
    stage: context.stage || activeDecorationStage,
    label: context.label || '当前设置',
    hostKey: context.hostKey || '',
    editorElement: context.editorElement || null,
    editorSelector: context.editorSelector || '',
    previewPage: context.previewPage || '',
    previewSelector: context.previewSelector || ''
  }
  const isNewChange = !decorationChangeRegistry.has(normalized.key)
  decorationChangeRegistry.set(normalized.key, normalized)
  markDecorationEditorFeedback(normalized, isNewChange)
  queueDecorationPreviewFeedback(normalized, isNewChange)
  setDecorationSaveState('dirty')
}

function updateDecorationStageNavigation() {
  const activeIndex = Math.max(0, DECORATION_STAGE_ORDER.indexOf(activeDecorationStage))

  document.querySelectorAll('[data-decoration-stage]').forEach(button => {
    const stageKey = button.dataset.decorationStage
    const stageIndex = DECORATION_STAGE_ORDER.indexOf(stageKey)
    const active = stageKey === activeDecorationStage
    const complete = decorationVisitedStages.has(stageKey) && !active
    const number = button.querySelector('.decoration-step-number')
    button.classList.toggle('active', active)
    button.classList.toggle('is-complete', complete)
    button.setAttribute('aria-selected', String(active))
    if (number) number.textContent = complete ? '✓' : String(stageIndex + 1)
  })

  const previous = document.getElementById('decorationPreviousStep')
  const progress = document.getElementById('decorationStageProgress')
  const next = document.getElementById('decorationNextStep')
  if (previous) previous.disabled = activeIndex === 0
  if (progress) progress.textContent = `第 ${activeIndex + 1} / ${DECORATION_STAGE_ORDER.length} 步 · ${DECORATION_STAGE_LABELS[activeDecorationStage]}`
  if (next) {
    const nextStage = DECORATION_STAGE_ORDER[activeIndex + 1]
    next.textContent = nextStage
      ? `下一步：${DECORATION_STAGE_LABELS[nextStage]}`
      : '完成并保存'
  }
}

function switchDecorationStage(stageKey) {
  const allowedStages = new Set(DECORATION_STAGE_ORDER)
  const nextStage = allowedStages.has(stageKey) ? stageKey : 'appearance'
  const modalOpen = document.getElementById('themeSettingsModal')?.classList.contains('active')
  if (modalOpen && activeDecorationStage !== nextStage) {
    decorationVisitedStages.add(activeDecorationStage)
  }
  activeDecorationStage = nextStage

  document.querySelectorAll('[data-decoration-stage-panel]').forEach(panel => {
    const active = panel.dataset.decorationStagePanel === nextStage
    panel.classList.toggle('active', active)
    panel.hidden = !active
  })
  updateDecorationStageNavigation()

  const scroller = document.getElementById('decorationStageScroll')
  if (scroller) scroller.scrollTop = 0
  if (modalOpen) updateThemePreview()
}

function goToPreviousDecorationStage() {
  const activeIndex = DECORATION_STAGE_ORDER.indexOf(activeDecorationStage)
  if (activeIndex <= 0) return
  switchDecorationStage(DECORATION_STAGE_ORDER[activeIndex - 1])
}

function goToNextDecorationStage() {
  const activeIndex = DECORATION_STAGE_ORDER.indexOf(activeDecorationStage)
  if (activeIndex < 0) return
  decorationVisitedStages.add(activeDecorationStage)
  if (activeIndex === DECORATION_STAGE_ORDER.length - 1) {
    saveThemeSettings()
    return
  }
  switchDecorationStage(DECORATION_STAGE_ORDER[activeIndex + 1])
}

function switchDecorationPage(pageKey) {
  const guide = DECORATION_PAGE_GUIDE[pageKey] || DECORATION_PAGE_GUIDE.home
  activeDecorationPage = pageKey
  document.querySelectorAll('[data-decoration-tab]').forEach(tab => {
    const active = tab.dataset.decorationTab === pageKey
    tab.classList.toggle('active', active)
    tab.setAttribute('aria-selected', String(active))
  })
  document.querySelectorAll('[data-decoration-panel]').forEach(panel => {
    const active = panel.dataset.decorationPanel === pageKey
    panel.classList.toggle('active', active)
    panel.hidden = !active
  })
  const currentPageName = document.getElementById('decorationCurrentPageName')
  const currentPageDescription = document.getElementById('decorationCurrentPageDescription')
  if (currentPageName) currentPageName.textContent = guide.name
  if (currentPageDescription) currentPageDescription.textContent = guide.description
  if (SKIN_PREVIEW_PAGE_KEYS.has(pageKey)) {
    activeSkinPreviewPage = pageKey
    skinPreviewQuickJumpOpen = false
  }
  updateThemePreview()
}

function getTerminologyFormValues() {
  return Object.fromEntries(Object.keys(DEFAULT_DECORATION_CONFIG.terminology).map(key => {
    const element = document.getElementById(`term-${key}`)
    return [key, element?.value.trim() || DEFAULT_DECORATION_CONFIG.terminology[key]]
  }))
}

function updateTerminologyPresetState() {
  const values = getTerminologyFormValues()
  document.querySelectorAll('[data-terminology-preset]').forEach(button => {
    const preset = TERMINOLOGY_PRESETS[button.dataset.terminologyPreset]
    const active = preset && Object.keys(preset).every(key => values[key] === preset[key])
    button.classList.toggle('active', Boolean(active))
    button.setAttribute('aria-pressed', String(Boolean(active)))
  })
}

function applyTerminologyPreset(presetKey) {
  const preset = TERMINOLOGY_PRESETS[presetKey]
  if (!preset) return
  Object.entries(preset).forEach(([key, value]) => {
    const element = document.getElementById(`term-${key}`)
    if (element) element.value = value
  })
  updateTerminologyPresetState()
  markDecorationChanged({
    key: 'copy:control:terminologyPreset',
    stage: 'copy',
    label: '常用门店文字模板',
    editorElement: document.querySelector(`[data-terminology-preset="${presetKey}"]`),
    previewSelector: '#skinLivePreview'
  })
  updateThemePreview()
}

function normalizeHomeGalleryColumns(value) {
  const columns = Number(value)
  return [1, 2, 3, 4].includes(columns) ? columns : DEFAULT_DECORATION_CONFIG.home.galleryColumns
}

function getHomeCardVisibilityPreset(cardContent) {
  if (cardContent === 'full') {
    return { showTitle: true, showCategory: true, showDescription: true }
  }
  if (cardContent === 'image-only') {
    return { showTitle: false, showCategory: false, showDescription: false }
  }
  return { showTitle: true, showCategory: true, showDescription: false }
}

function getHomeCardContentFromVisibility(home) {
  const state = [home.showTitle, home.showCategory, home.showDescription]
  if (state.every(Boolean)) return 'full'
  if (home.showTitle && home.showCategory && !home.showDescription) return 'compact'
  if (state.every(value => !value)) return 'image-only'
  return 'custom'
}

function setHomeCardVisibility(home, cardContent) {
  const visibility = getHomeCardVisibilityPreset(cardContent)
  home.cardContent = cardContent
  Object.assign(home, visibility)
}

function syncHomeCardVisibilityControls(home) {
  const columns = normalizeHomeGalleryColumns(home?.galleryColumns)
  const locked = columns === 4
  const controls = {
    showTitle: document.getElementById('homeShowTitle'),
    showCategory: document.getElementById('homeShowCategory'),
    showDescription: document.getElementById('homeShowDescription')
  }
  Object.entries(controls).forEach(([field, input]) => {
    if (!input) return
    input.checked = locked ? false : home?.[field] !== false
    input.disabled = locked
  })
  const hint = document.getElementById('homeContentVisibilityHint')
  if (hint) {
    hint.textContent = locked
      ? '四栏空间较窄，已自动使用纯图片模式。'
      : '按需要勾选作品卡片下方显示的文字。'
  }
}

function handleHomeCardContentChange(cardContent) {
  const home = decorationEditorState?.home
  if (!home) return
  const columns = normalizeHomeGalleryColumns(document.getElementById('homeGalleryColumns')?.value)
  const nextContent = columns === 4 ? 'image-only' : cardContent
  setHomeCardVisibility(home, nextContent)
  setSelectValue('homeCardContent', nextContent)
  syncHomeCardVisibilityControls(home)
  markDecorationChanged(getStaticDecorationChangeContext(document.getElementById('homeCardContent')))
  updateThemePreview()
}

function handleHomeGalleryColumnsChange(value) {
  const home = decorationEditorState?.home
  if (!home) return
  home.galleryColumns = normalizeHomeGalleryColumns(value)
  if (home.galleryColumns === 4) {
    setHomeCardVisibility(home, 'image-only')
    setSelectValue('homeCardContent', 'image-only')
  }
  syncHomeCardVisibilityControls(home)
  markDecorationChanged(getStaticDecorationChangeContext(document.getElementById('homeGalleryColumns')))
  updateThemePreview()
}

function updateHomeCardVisibility(field, checked) {
  const home = decorationEditorState?.home
  if (!home || !['showTitle', 'showCategory', 'showDescription'].includes(field)) return
  if (normalizeHomeGalleryColumns(document.getElementById('homeGalleryColumns')?.value) === 4) {
    showToast('四栏会自动使用纯图片模式', 'info')
    syncHomeCardVisibilityControls(home)
    return
  }
  home[field] = Boolean(checked)
  home.cardContent = getHomeCardContentFromVisibility(home)
  setSelectValue('homeCardContent', home.cardContent)
  const controlIds = {
    showTitle: 'homeShowTitle',
    showCategory: 'homeShowCategory',
    showDescription: 'homeShowDescription'
  }
  markDecorationChanged(getStaticDecorationChangeContext(document.getElementById(controlIds[field])))
  updateThemePreview()
}

function reorderHomeSections(sections, sectionOrder) {
  const current = Array.isArray(sections) ? sections : []
  const byType = new Map(current.map(section => [section.type, section]))
  const ordered = (Array.isArray(sectionOrder) ? sectionOrder : [])
    .map(type => byType.get(type))
    .filter(Boolean)
  const seen = new Set(ordered.map(section => section.type))
  const completeOrder = [...ordered, ...current.filter(section => !seen.has(section.type))]
  return [
    ...completeOrder.filter(section => section.enabled !== false),
    ...completeOrder.filter(section => section.enabled === false)
  ]
}

function setHomeLayoutEditorValues(home) {
  const template = HOME_TEMPLATE_PRESETS[home?.template] ? home.template : DEFAULT_DECORATION_CONFIG.home.template
  const templateInput = document.getElementById('homeTemplate')
  if (templateInput) templateInput.value = template
  setSelectValue('homeHeroVariant', home?.heroVariant || DEFAULT_DECORATION_CONFIG.home.heroVariant)
  setSelectValue('homeGalleryVariant', home?.galleryVariant || DEFAULT_DECORATION_CONFIG.home.galleryVariant)
  setSelectValue('homeGalleryColumns', String(normalizeHomeGalleryColumns(home?.galleryColumns)))
  setSelectValue('homeImageRatio', home?.imageRatio || DEFAULT_DECORATION_CONFIG.home.imageRatio)
  setSelectValue('homeCardContent', home?.cardContent || DEFAULT_DECORATION_CONFIG.home.cardContent)
  setSelectValue('homeGalleryGap', home?.galleryGap || DEFAULT_DECORATION_CONFIG.home.galleryGap)
  syncHomeCardVisibilityControls(home)
  renderHomeTemplatePicker(template)
}

function renderHomeTemplatePicker(activeTemplate) {
  const current = HOME_TEMPLATE_PRESETS[activeTemplate]
    ? activeTemplate
    : (decorationEditorState?.home?.template || DEFAULT_DECORATION_CONFIG.home.template)
  document.querySelectorAll('[data-home-template]').forEach(button => {
    const active = button.dataset.homeTemplate === current
    button.classList.toggle('active', active)
    button.setAttribute('aria-pressed', String(active))
    const state = button.querySelector('.home-template-state')
    if (state) state.textContent = active ? '正在使用' : '选择此结构'
  })
  const summary = document.getElementById('homeTemplateSummary')
  if (summary) summary.textContent = HOME_TEMPLATE_PRESETS[current]?.description || ''
}

function applyHomeTemplate(templateKey) {
  const preset = HOME_TEMPLATE_PRESETS[templateKey]
  const home = decorationEditorState?.home
  if (!preset || !home) return

  home.template = templateKey
  home.heroVariant = preset.heroVariant
  home.galleryVariant = preset.galleryVariant
  home.galleryColumns = preset.galleryColumns
  home.imageRatio = preset.imageRatio
  setHomeCardVisibility(home, preset.cardContent)
  home.galleryGap = preset.galleryGap
  home.sections = reorderHomeSections(home.sections, preset.sectionOrder)

  setHomeLayoutEditorValues(home)
  renderDecorationSectionEditor('home')
  markDecorationChanged({
    key: `pages:home-template:${templateKey}`,
    stage: 'pages',
    label: `首页结构：${preset.name}`,
    editorElement: document.querySelector(`[data-home-template="${templateKey}"]`),
    previewPage: 'home',
    previewSelector: '#skinPreviewViewport'
  })
  updateThemePreview()
}

function setShowcaseEditorValues(decoration) {
  const normalized = normalizeDecorationConfig(decoration)
  const showcase = normalized.showcase
  const frameworkIdInput = document.getElementById('frameworkId')
  if (frameworkIdInput) frameworkIdInput.value = normalized.framework.id
  const siteTemplateInput = document.getElementById('siteTemplate')
  if (siteTemplateInput) siteTemplateInput.value = normalized.siteTemplate
  const values = {
    showcaseHeroActionText: showcase.heroActionText,
    showcaseHeroActionTarget: showcase.heroActionTarget,
    showcaseGalleryTitle: showcase.galleryTitle,
    showcaseGallerySubtitle: showcase.gallerySubtitle,
    showcaseCategoryMode: showcase.categoryMode,
    showcaseGalleryColumns: String(showcase.galleryColumns),
    showcaseSeriesActionText: showcase.seriesActionText,
    showcaseAboutQuote: showcase.aboutQuote,
    showcaseAboutGalleryLimit: String(showcase.aboutGalleryLimit)
  }
  Object.entries(values).forEach(([id, value]) => {
    const element = document.getElementById(id)
    if (element) element.value = value
  })
  const showSearch = document.getElementById('showcaseShowSearch')
  const showTags = document.getElementById('showcaseShowTags')
  if (showSearch) showSearch.checked = showcase.showSearch !== false
  if (showTags) showTags.checked = showcase.showTags !== false
  setSelectValue('frameworkMotion', normalized.framework.motion)
  setSelectValue('frameworkSectionRhythm', normalized.framework.sectionRhythm)
  setSelectValue('mediaHeroFocalPoint', normalized.media.heroFocalPoint)
  setSelectValue('mediaGalleryFocalPoint', normalized.media.galleryFocalPoint)
  setSelectValue('mediaHeroOverlay', normalized.media.heroOverlay)
  document.querySelectorAll('.framework-card[data-framework]').forEach(button => {
    const active = button.dataset.framework === normalized.framework.id
    button.classList.toggle('active', active)
    button.setAttribute('aria-pressed', String(active))
    const state = button.querySelector('.framework-card-state')
    if (state) state.textContent = active ? '当前框架' : '使用此框架'
  })
  const options = document.getElementById('darkGalleryOptions')
  if (options) options.hidden = normalized.siteTemplate !== 'dark-gallery'
  const legacyNote = document.getElementById('frameworkLegacyNote')
  if (legacyNote) legacyNote.hidden = normalized.framework.id !== 'legacy-classic'
}

function applyFramework(frameworkId) {
  const preset = FRAMEWORK_PRESETS[frameworkId]
  if (!preset || !decorationEditorState) return

  decorationEditorState.schemaVersion = 2
  decorationEditorState.framework = {
    id: frameworkId,
    ...preset.framework
  }
  decorationEditorState.media = deepClone(preset.media)
  decorationEditorState.siteTemplate = preset.siteTemplate
  decorationEditorState.navigation.style = preset.variants.navigationStyle
  decorationEditorState.navigation.items = NAVIGATION_ITEM_KEYS.map(key => ({
    key,
    enabled: preset.navigationItems.includes(key)
  }))
  Object.assign(decorationEditorState.navigation, preset.navigationLabels)

  if (frameworkId === 'cinematic-gallery') {
    decorationEditorState.showcase = fillMissingObject(decorationEditorState.showcase, DEFAULT_DECORATION_CONFIG.showcase)
  }

  setSelectValue('themePreset', preset.themePreset)
  applySelectedThemePreset()
  applyDecorationVariantState(preset.variants)

  Object.entries(preset.sectionOrder || {}).forEach(([pageKey, order]) => {
    if (!decorationEditorState[pageKey]?.sections) return
    decorationEditorState[pageKey].sections = reorderHomeSections(
      decorationEditorState[pageKey].sections,
      order
    )
  })

  setShowcaseEditorValues(decorationEditorState)
  setHomeLayoutEditorValues(decorationEditorState.home)
  renderNavigationEditor()
  renderDecorationEditors()
  activeSkinPreviewPage = 'home'
  markDecorationChanged({
    key: `appearance:framework:${frameworkId}`,
    stage: 'appearance',
    label: `整站框架：${preset.name}`,
    editorElement: document.querySelector(`.framework-card[data-framework="${frameworkId}"]`),
    previewPage: 'home',
    previewSelector: '#skinPreviewViewport'
  })
  updateThemePreview()
}

function applySiteTemplate(templateKey) {
  if (!['classic', 'dark-gallery'].includes(templateKey) || !decorationEditorState) return
  if (decorationEditorState.siteTemplate === templateKey) return
  decorationEditorState.siteTemplate = templateKey

  if (templateKey === 'dark-gallery') {
    decorationEditorState.showcase = deepClone(DEFAULT_DECORATION_CONFIG.showcase)
    decorationEditorState.navigation.portfolioText = '首页'
    decorationEditorState.navigation.galleryText = '作品'
    decorationEditorState.navigation.aboutText = '关于'
    decorationEditorState.navigation.items = NAVIGATION_ITEM_KEYS.map(key => ({
      key,
      enabled: ['portfolio', 'gallery', 'about'].includes(key)
    }))
    decorationEditorState.icons.navigation.portfolio = 'image'
    decorationEditorState.icons.navigation.gallery = 'images'
    decorationEditorState.icons.navigation.about = 'user-round'
    selectThemePreset('dark-gallery')
    activeSkinPreviewPage = 'home'
  } else {
    decorationEditorState.navigation.portfolioText = '作品集'
    decorationEditorState.navigation.aboutText = '简介'
    decorationEditorState.navigation.bookingText = '咨询'
    decorationEditorState.navigation.items = NAVIGATION_ITEM_KEYS.map(key => ({
      key,
      enabled: ['portfolio', 'about', 'booking'].includes(key)
    }))
    decorationEditorState.icons.navigation.portfolio = 'images'
    if (document.getElementById('themePreset')?.value === 'dark-gallery') selectThemePreset('minimal')
  }

  setShowcaseEditorValues(decorationEditorState)
  renderNavigationEditor()
  markDecorationChanged({
    key: `appearance:site-template:${templateKey}`,
    stage: 'appearance',
    label: templateKey === 'dark-gallery' ? '整站结构：暗色品牌画廊' : '整站结构：经典作品站',
    editorElement: document.querySelector(`[data-site-template="${templateKey}"]`),
    previewPage: 'home',
    previewSelector: '#skinPreviewViewport'
  })
  updateThemePreview()
}

function collectDecorationSettings() {
  const decoration = normalizeDecorationConfig(decorationEditorState)
  const frameworkId = document.getElementById('frameworkId')?.value
  decoration.schemaVersion = 2
  decoration.framework = {
    id: FRAMEWORK_PRESETS[frameworkId] ? frameworkId : decoration.framework.id,
    motion: document.getElementById('frameworkMotion')?.value || DEFAULT_DECORATION_CONFIG.framework.motion,
    sectionRhythm: document.getElementById('frameworkSectionRhythm')?.value || DEFAULT_DECORATION_CONFIG.framework.sectionRhythm
  }
  decoration.media = {
    heroFocalPoint: document.getElementById('mediaHeroFocalPoint')?.value || DEFAULT_DECORATION_CONFIG.media.heroFocalPoint,
    galleryFocalPoint: document.getElementById('mediaGalleryFocalPoint')?.value || DEFAULT_DECORATION_CONFIG.media.galleryFocalPoint,
    heroOverlay: document.getElementById('mediaHeroOverlay')?.value || DEFAULT_DECORATION_CONFIG.media.heroOverlay
  }
  decoration.siteTemplate = decoration.framework.id === 'cinematic-gallery' ? 'dark-gallery' : 'classic'
  decoration.showcase = {
    ...decoration.showcase,
    heroActionText: document.getElementById('showcaseHeroActionText')?.value.trim() || DEFAULT_DECORATION_CONFIG.showcase.heroActionText,
    heroActionTarget: document.getElementById('showcaseHeroActionTarget')?.value || DEFAULT_DECORATION_CONFIG.showcase.heroActionTarget,
    galleryTitle: document.getElementById('showcaseGalleryTitle')?.value.trim() || DEFAULT_DECORATION_CONFIG.showcase.galleryTitle,
    gallerySubtitle: document.getElementById('showcaseGallerySubtitle')?.value.trim() || DEFAULT_DECORATION_CONFIG.showcase.gallerySubtitle,
    categoryMode: document.getElementById('showcaseCategoryMode')?.value || DEFAULT_DECORATION_CONFIG.showcase.categoryMode,
    galleryColumns: Number(document.getElementById('showcaseGalleryColumns')?.value) || DEFAULT_DECORATION_CONFIG.showcase.galleryColumns,
    showSearch: document.getElementById('showcaseShowSearch')?.checked !== false,
    showTags: document.getElementById('showcaseShowTags')?.checked !== false,
    seriesActionText: document.getElementById('showcaseSeriesActionText')?.value.trim() || DEFAULT_DECORATION_CONFIG.showcase.seriesActionText,
    aboutQuote: document.getElementById('showcaseAboutQuote')?.value.trim() || DEFAULT_DECORATION_CONFIG.showcase.aboutQuote,
    aboutGalleryLimit: Number(document.getElementById('showcaseAboutGalleryLimit')?.value) === 6 ? 6 : 9
  }
  Object.keys(DEFAULT_DECORATION_CONFIG.terminology).forEach(key => {
    const element = document.getElementById(`term-${key}`)
    decoration.terminology[key] = element?.value.trim() || DEFAULT_DECORATION_CONFIG.terminology[key]
  })
  Object.entries(NAVIGATION_ITEM_DEFINITIONS).forEach(([key, definition]) => {
    const input = document.getElementById(`nav-${key}-text`)
    decoration.navigation[definition.textKey] = input?.value.trim() || decoration.navigation[definition.textKey] || DEFAULT_DECORATION_CONFIG.navigation[definition.textKey]
  })
  decoration.navigation.items = normalizeNavigationItems(decorationEditorState?.navigation?.items)
  decoration.navigation.style = document.getElementById('navStyle').value
  decoration.home.template = document.getElementById('homeTemplate').value
  decoration.home.heroVariant = document.getElementById('homeHeroVariant').value
  decoration.home.galleryVariant = document.getElementById('homeGalleryVariant').value
  decoration.home.galleryColumns = normalizeHomeGalleryColumns(document.getElementById('homeGalleryColumns').value)
  decoration.home.imageRatio = document.getElementById('homeImageRatio').value
  decoration.home.showTitle = document.getElementById('homeShowTitle')?.checked === true
  decoration.home.showCategory = document.getElementById('homeShowCategory')?.checked === true
  decoration.home.showDescription = document.getElementById('homeShowDescription')?.checked === true
  decoration.home.cardContent = getHomeCardContentFromVisibility(decoration.home)
  if (decoration.home.galleryColumns === 4) {
    setHomeCardVisibility(decoration.home, 'image-only')
  }
  decoration.home.galleryGap = document.getElementById('homeGalleryGap').value
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

const THEME_COLOR_OUTPUT_IDS = {
  primaryColor: 'themePrimaryColorValue',
  secondaryColor: 'themeSecondaryColorValue',
  accentColor: 'themeAccentColorValue',
  backgroundColor: 'themeBackgroundColorValue',
  textColor: 'themeTextColorValue'
}

function syncThemeColorOutputs() {
  Object.entries(THEME_COLOR_OUTPUT_IDS).forEach(([field, outputId]) => {
    const input = document.getElementById(THEME_FIELD_IDS[field])
    const output = document.getElementById(outputId)
    if (input && output) output.textContent = String(input.value || '').toUpperCase()
  })
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
  syncThemeColorOutputs()
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
    homeTemplate: document.getElementById('homeTemplate').value,
    homeHero: document.getElementById('homeHeroVariant').value,
    homeGallery: document.getElementById('homeGalleryVariant').value,
    homeColumns: normalizeHomeGalleryColumns(document.getElementById('homeGalleryColumns').value),
    homeRatio: document.getElementById('homeImageRatio').value,
    homeCardContent: document.getElementById('homeCardContent').value,
    homeShowTitle: document.getElementById('homeShowTitle')?.checked === true,
    homeShowCategory: document.getElementById('homeShowCategory')?.checked === true,
    homeShowDescription: document.getElementById('homeShowDescription')?.checked === true,
    homeGap: document.getElementById('homeGalleryGap').value,
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
  decorationEditorState.home.template = HOME_TEMPLATE_PRESETS[variants.homeTemplate]
    ? variants.homeTemplate
    : decorationEditorState.home.template
  decorationEditorState.home.heroVariant = variants.homeHero
  decorationEditorState.home.galleryVariant = variants.homeGallery
  decorationEditorState.home.galleryColumns = normalizeHomeGalleryColumns(variants.homeColumns)
  decorationEditorState.home.imageRatio = variants.homeRatio
  setHomeCardVisibility(
    decorationEditorState.home,
    variants.homeCardContent || DEFAULT_DECORATION_CONFIG.home.cardContent
  )
  if (typeof variants.homeShowTitle === 'boolean') decorationEditorState.home.showTitle = variants.homeShowTitle
  if (typeof variants.homeShowCategory === 'boolean') decorationEditorState.home.showCategory = variants.homeShowCategory
  if (typeof variants.homeShowDescription === 'boolean') decorationEditorState.home.showDescription = variants.homeShowDescription
  decorationEditorState.home.cardContent = getHomeCardContentFromVisibility(decorationEditorState.home)
  if (decorationEditorState.home.galleryColumns === 4) {
    setHomeCardVisibility(decorationEditorState.home, 'image-only')
  }
  decorationEditorState.home.galleryGap = variants.homeGap || DEFAULT_DECORATION_CONFIG.home.galleryGap
  const homeTemplatePreset = HOME_TEMPLATE_PRESETS[decorationEditorState.home.template]
  if (homeTemplatePreset) {
    decorationEditorState.home.sections = reorderHomeSections(
      decorationEditorState.home.sections,
      homeTemplatePreset.sectionOrder
    )
  }
  decorationEditorState.about.headerVariant = variants.aboutHeader
  decorationEditorState.booking.headerVariant = variants.bookingHeader
  decorationEditorState.booking.formVariant = variants.bookingForm
  decorationEditorState.packages.layoutVariant = variants.packagesLayout
  decorationEditorState.packageDetail.layoutVariant = variants.packageDetailLayout
  decorationEditorState.series.galleryVariant = variants.seriesGallery
  decorationEditorState.success.layoutVariant = variants.successLayout

  setSelectValue('navStyle', variants.navigationStyle)
  setHomeLayoutEditorValues(decorationEditorState.home)
  setSelectValue('aboutHeaderVariant', variants.aboutHeader)
  setSelectValue('bookingHeaderVariant', variants.bookingHeader)
  setSelectValue('bookingFormVariant', variants.bookingForm)
  setSelectValue('packagesLayoutVariant', variants.packagesLayout)
  setSelectValue('packageDetailLayoutVariant', variants.packageDetailLayout)
  setSelectValue('seriesGalleryVariant', variants.seriesGallery)
  setSelectValue('successLayoutVariant', variants.successLayout)
  renderDecorationSectionEditor('home')
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
          <span class="skin-preset-state">${active ? '已选择' : '查看'}</span>
        </span>
        <span class="skin-preset-description">${escapeHtml(preset.description)}</span>
      </button>
    `
  }).join('')
}

const SKIN_PREVIEW_PAGE_KEYS = new Set(['home', 'gallery', 'about', 'stores', 'booking', 'packages', 'packageDetail', 'series', 'success'])
const SKIN_PREVIEW_SECONDARY_PAGE_KEYS = new Set(['stores', 'packages', 'packageDetail', 'series', 'success'])

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
        imageUrls: photos.slice(0, 5).map(photo => getSkinPreviewPhotoUrl(photo, 900)),
        photoCount: photos.length,
        likes: Number(series.likes) || 0,
        featuredOnHome: series.featuredOnHome === true,
        homeSort: Number.isFinite(Number(series.homeSort)) ? Number(series.homeSort) : Number.MAX_SAFE_INTEGER,
        description: String(series.description || series.bannerDescription || '').trim(),
        suitableFor: Array.isArray(series.suitableFor) ? series.suitableFor.filter(Boolean).slice(0, 3) : [],
        scenes: Array.isArray(series.scenes) ? series.scenes.filter(Boolean).slice(0, 2) : [],
        tags: Array.isArray(series.tags) ? series.tags.filter(Boolean).slice(0, 3) : []
      })
    }
  }

  return items
}

function getSkinPreviewFeaturedItems() {
  const items = []

  for (const theme of Array.isArray(portfolioData?.themes) ? portfolioData.themes : []) {
    if (theme?.enabled === false) continue
    const category = String(theme?.name || '作品').trim() || '作品'

    for (const series of Array.isArray(theme?.series) ? theme.series : []) {
      if (series?.enabled === false) continue
      const selectedPhotos = getHomeFeaturedPhotos(series)
      const homeSort = Number.isFinite(Number(series.homeSort)) ? Number(series.homeSort) : Number.MAX_SAFE_INTEGER

      selectedPhotos.forEach((photoName, photoIndex) => {
        items.push({
          id: `${theme.id || category}-${series.id || items.length}-${photoIndex}`,
          seriesId: String(series.id || `${theme.id || category}-${items.length}`),
          title: String(series.title || category).trim() || category,
          category,
          imageUrl: getSkinPreviewPhotoUrl(photoName, 900),
          likes: Number(series.likes) || 0,
          homeSort,
          homePhotoSort: photoIndex
        })
      })
    }
  }

  return items
}

function getSkinPreviewImages() {
  const seriesItems = getSkinPreviewSeriesItems()
  const featuredItems = getSkinPreviewFeaturedItems()
  const bannerCandidates = (featuredItems.length ? featuredItems : seriesItems)
    .slice()
    .sort((left, right) => {
      if (featuredItems.length && left.homeSort !== right.homeSort) return left.homeSort - right.homeSort
      if (featuredItems.length && left.seriesId === right.seriesId && left.homePhotoSort !== right.homePhotoSort) {
        return left.homePhotoSort - right.homePhotoSort
      }
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
    bannerItems: bannerCandidates.slice(0, 12)
  }
}

function getManagementInputValue(id, fallback = '') {
  const element = document.getElementById(id)
  return element ? String(element.value || '').trim() : fallback
}

function getManagementPreviewImage(id) {
  const image = document.getElementById(id)
  if (!image || image.style.display === 'none' || !image.src) return ''
  return image.src
}

function getManagementPreviewTheme() {
  const themeModalActive = document.getElementById('themeSettingsModal')?.classList.contains('active')
  if (themeModalActive && themeEditorOriginalState) return getThemeEditorValues()
  return fillMissingObject(portfolioData.theme, DEFAULT_V11_CONFIG.theme)
}

function applyManagementPreviewDraft(model) {
  const workbenchId = window.AdminWorkbench?.getActiveId?.() || ''

  if (workbenchId === 'profileModal') {
    const profile = deepClone(model.profile)
    profile.name = getManagementInputValue('profileName', profile.name)
    profile.title = getManagementInputValue('profileTitle', profile.title)
    profile.location = getManagementInputValue('profileLocation', profile.location)
    profile.avatar = getManagementInputValue('profileAvatar', profile.avatar)
    profile.bio = getManagementInputValue('profileBio', profile.bio)
    profile.skills = parseListInput(getManagementInputValue('profileSkills', profile.skills?.join('，') || ''))
    profile.stats = PROFILE_STAT_FIELDS.map((field, index) => ({
      value: getManagementInputValue(field.inputId, profile.stats?.[index]?.value || field.fallbackValue),
      label: field.label
    }))
    profile.contact = {
      ...(profile.contact || {}),
      wechat: getManagementInputValue('profileWechat', profile.contact?.wechat || ''),
      email: getManagementInputValue('profileEmail', profile.contact?.email || '')
    }
    profile.studio = {
      ...(profile.studio || {}),
      name: getManagementInputValue('profileStudioName', profile.studio?.name || ''),
      address: getManagementInputValue('profileStudioAddress', profile.studio?.address || '')
    }
    model.profile = profile
    model.avatarImage = getManagementPreviewImage('profileAvatarPreview') || getSkinPreviewAssetUrl(profile.avatar) || model.heroImage
    model.aboutCover = getManagementPreviewImage('profileAboutBannerPreview') || model.aboutCover
  }

  if (workbenchId === 'homeBannerModal') {
    model.homeBanner = {
      ...model.homeBanner,
      logoText: getManagementInputValue('homeBannerLogoText', model.homeBanner.logoText),
      tagText: getManagementInputValue('homeBannerTagText', model.homeBanner.tagText),
      description: getManagementInputValue('homeBannerDescription', model.homeBanner.description)
    }
  }

  if (workbenchId === 'bookingSettingsModal') {
    const options = normalizeBookingStyleOptions(getManagementInputValue('bookingStyleOptions').split(/\r?\n/))
    if (options.length) model.booking.styleOptions = options
  }

  if (workbenchId === 'contentModulesModal') {
    try { model.packages = readPackageEditor().filter(item => item.enabled !== false) } catch {}
    try { model.schedule = readScheduleEditor() } catch {}
    try { model.testimonials = readTestimonialEditor().filter(item => item.enabled !== false) } catch {}
    try { model.serviceFlow = readServiceFlowEditor() } catch {}
    try { model.faq = readFaqEditor() } catch {}
    try { model.photographers = readPhotographerEditor().filter(item => item.enabled !== false) } catch {}
    try { model.stores = readStoreEditor().filter(item => item.enabled !== false) } catch {}
    try { model.quickJump = readQuickJumpEditor() } catch {}
    model.consultation = {
      ...model.consultation,
      title: getManagementInputValue('v11ConsultationTitle', model.consultation.title),
      description: getManagementInputValue('v11ConsultationDescription', model.consultation.description),
      template: getManagementInputValue('v11ConsultationTemplate', model.consultation.template),
      privacyTip: getManagementInputValue('v11ConsultationPrivacyTip', model.consultation.privacyTip)
    }
    try {
      const modules = JSON.parse(document.getElementById('v11ModulesJson')?.value || '{}')
      model.modules = fillMissingObject(modules, model.modules)
    } catch {
    }
  }

  if (workbenchId === 'addThemeModal' || workbenchId === 'editThemeModal') {
    const inputId = workbenchId === 'addThemeModal' ? 'themeName' : 'editThemeName'
    const categoryName = getManagementInputValue(inputId)
    if (categoryName && !model.categories.includes(categoryName)) model.categories = [...model.categories, categoryName]
  }

  if (workbenchId === 'addSeriesModal' || workbenchId === 'editSeriesModal') {
    const editing = workbenchId === 'editSeriesModal'
    const prefix = editing ? 'editSeries' : 'series'
    const title = getManagementInputValue(`${prefix}Title`, '新作品集')
    const description = getManagementInputValue(`${prefix}Description`)
    const likes = Number(getManagementInputValue(`${prefix}Likes`, '0')) || 0
    const draftItem = {
      id: editing ? getManagementInputValue('editSeriesId', 'draft-series') : 'draft-series',
      title,
      category: currentTheme?.name || '作品',
      imageUrl: model.seriesItems[0]?.imageUrl || model.heroImage,
      imageUrls: model.seriesItems[0]?.imageUrls || [model.heroImage].filter(Boolean),
      photoCount: editing ? (currentTheme?.series?.[currentEditSeriesIndex]?.photos?.length || 0) : 0,
      likes,
      description,
      suitableFor: parseListInput(getManagementInputValue(`${prefix}SuitableFor`)),
      scenes: parseListInput(getManagementInputValue(`${prefix}Scenes`)),
      tags: parseListInput(getManagementInputValue(`${prefix}Tags`))
    }
    const existingIndex = model.seriesItems.findIndex(item => item.id === draftItem.id)
    if (existingIndex >= 0) model.seriesItems[existingIndex] = { ...model.seriesItems[existingIndex], ...draftItem }
    else model.seriesItems = [draftItem, ...model.seriesItems]
    model.categories = ['全部', ...Array.from(new Set(model.seriesItems.map(item => item.category)))]
  }

  return model
}

function getSkinPreviewDraftDecoration() {
  const themeModalActive = document.getElementById('themeSettingsModal')?.classList.contains('active')
  if (!themeModalActive) return normalizeDecorationConfig(portfolioData.decoration)
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

  const model = {
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
  return applyManagementPreviewDraft(model)
}

function renderSkinPreviewIcon(name, className = '', customIconPath = '') {
  const customIconUrl = getSkinPreviewAssetUrl(customIconPath)
  if (customIconUrl) {
    return `<img class="customer-preview-icon ${escapeHtml(className)}" src="${escapeHtml(customIconUrl)}" alt="">`
  }
  const requested = String(name || '').trim()
  const normalized = CONFIGURABLE_ICON_NAMES.has(requested) || PREVIEW_SYSTEM_ICON_NAMES.has(requested)
    ? requested
    : 'image'
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

function renderSkinPreviewDarkHeader(title, showBack = false) {
  return `
    <header class="customer-preview-dark-header">
      ${showBack ? '<span class="customer-preview-dark-back">‹</span>' : ''}
      <strong>${escapeHtml(title)}</strong>
    </header>
  `
}

function renderSkinPreviewDarkHome(model) {
  const heroItem = model.bannerItems[0] || model.seriesItems[0]
  const showcase = model.decoration.showcase
  const cards = model.seriesItems.slice(0, 4).map(item => `
    <article class="customer-preview-dark-card">
      ${renderSkinPreviewImage(item.imageUrl, 'customer-preview-dark-card-image', item.title)}
      <i></i><span>${escapeHtml(item.title)}</span>
    </article>
  `).join('')
  return `
    <section class="customer-preview-dark-home">
      ${renderSkinPreviewDarkHeader(model.homeBanner.logoText)}
      <div class="customer-preview-dark-hero" data-preview-section="hero">
        ${renderSkinPreviewImage(heroItem?.imageUrl || model.heroImage, 'customer-preview-dark-hero-image', '首页主视觉')}
        <div class="customer-preview-dark-hero-shade"></div>
        <div class="customer-preview-dark-copy">
          <h2>${escapeHtml(model.homeBanner.logoText)}</h2>
          <i></i>
          <p>${escapeHtml(model.homeBanner.description || heroItem?.title || '')}</p>
        </div>
        <button type="button" class="customer-preview-dark-home-action">${escapeHtml(showcase.heroActionText)}</button>
        <span class="customer-preview-dark-scroll-cue"><i></i><i></i></span>
      </div>
    </section>
    <section class="customer-preview-dark-featured" data-preview-section="portfolio">
      <header><strong>${escapeHtml(showcase.galleryTitle)}</strong><small>${escapeHtml(showcase.gallerySubtitle)}</small></header>
      <nav>${model.categories.slice(0, 5).map((item, index) => `<span class="${index === 0 ? 'active' : ''}">${escapeHtml(item)}</span>`).join('')}</nav>
      <div>${cards || '<p class="customer-preview-empty">上传作品后显示精选内容</p>'}</div>
      <button type="button" class="customer-preview-dark-view-all">查看全部${escapeHtml(model.decoration.terminology.workLabel)}</button>
    </section>
  `
}

function renderSkinPreviewGallery(model) {
  const showcase = model.decoration.showcase
  const cards = model.seriesItems.slice(0, 8).map(item => `
    <article class="customer-preview-dark-gallery-card">
      <div class="customer-preview-dark-gallery-media">${renderSkinPreviewImage(item.imageUrl, 'customer-preview-dark-gallery-image', item.title)}</div>
      <div class="customer-preview-dark-gallery-copy"><strong>${escapeHtml(item.title)}</strong><b>♡</b>${showcase.showTags ? `<small>#${escapeHtml(item.tags?.[0] || item.category || '')}</small>` : ''}</div>
    </article>
  `).join('')
  return `
    <section class="customer-preview-dark-gallery">
      ${renderSkinPreviewDarkHeader(model.decoration.navigation.galleryText || showcase.galleryTitle, true)}
      <div class="customer-preview-dark-gallery-body mode-${escapeHtml(showcase.categoryMode)}">
        <nav>${model.categories.slice(0, 7).map((item, index) => `<span class="${index === 0 ? 'active' : ''}">${escapeHtml(item)}</span>`).join('')}</nav>
        <main>
          <div class="customer-preview-dark-gallery-title"><i></i><span>全部</span><div>${renderSkinPreviewIcon('images')}${showcase.showSearch ? renderSkinPreviewIcon('search') : ''}</div></div>
          <div class="customer-preview-dark-gallery-grid columns-${showcase.galleryColumns}">${cards}</div>
        </main>
      </div>
    </section>
  `
}

function renderSkinPreviewDarkAbout(model) {
  const showcase = model.decoration.showcase
  const gallery = model.seriesItems.slice(0, showcase.aboutGalleryLimit).map(item => renderSkinPreviewImage(item.imageUrl, 'customer-preview-dark-about-image', item.title)).join('')
  return `
    <section class="customer-preview-dark-about" data-preview-section="profile">
      ${renderSkinPreviewDarkHeader(model.decoration.navigation.aboutText || '关于', true)}
      <div class="customer-preview-dark-about-landing">
        <div class="customer-preview-dark-about-profile">
          ${renderSkinPreviewImage(model.avatarImage, 'customer-preview-dark-about-avatar', model.profile.name, model.heroImage)}
          <h2>${escapeHtml(model.profile.name)}</h2><p>${escapeHtml(model.profile.title || '')}</p><small>${escapeHtml(model.profile.location || '')}</small>
        </div>
        <blockquote><i>“</i><span>${escapeHtml(showcase.aboutQuote)}</span><b>”</b></blockquote>
        <div class="customer-preview-dark-contact"><span>${renderSkinPreviewIcon('phone')}</span><span>${renderSkinPreviewIcon('message-circle')}</span><span>${renderSkinPreviewIcon('map-pin')}</span></div>
        <button type="button" class="customer-preview-dark-about-action">联系我们</button>
      </div>
      <div class="customer-preview-dark-about-wall">${gallery}</div>
      <div class="customer-preview-dark-map"><span>${renderSkinPreviewIcon('map-pin')}</span><p>${escapeHtml(model.profile.studio?.address || '门店地址')}</p></div>
      <div class="customer-preview-dark-about-footer">
        ${renderSkinPreviewImage(model.aboutCover, 'customer-preview-dark-about-footer-image', '门店联系背景', model.heroImage)}
        <i></i><div><p>微信：${escapeHtml(model.profile.contact?.wechat || '客服微信')}</p><p>地址：${escapeHtml(model.profile.studio?.address || '门店地址')}</p></div>
      </div>
    </section>
  `
}

function renderSkinPreviewDarkSeries(model) {
  const item = model.seriesItems[0] || { title: '作品示例', category: '', imageUrl: model.heroImage, imageUrls: [] }
  const images = item.imageUrls?.length ? item.imageUrls : model.seriesItems.slice(0, 4).map(entry => entry.imageUrl)
  return `
    <section class="customer-preview-dark-series">
      ${renderSkinPreviewDarkHeader(item.title, true)}
      <div class="customer-preview-dark-series-cover-wrap">
        ${renderSkinPreviewImage(item.imageUrl || images[0], 'customer-preview-dark-series-cover', item.title)}
        <button type="button">分享</button>
      </div>
      <div class="customer-preview-dark-series-copy"><div><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.category || '')}</p></div><span>${renderSkinPreviewIcon('images')}${renderSkinPreviewIcon('grid-2x2')}</span><small>${escapeHtml(item.description || '')}</small></div>
      <div class="customer-preview-dark-series-images">${images.slice(1, 4).map(url => renderSkinPreviewImage(url, 'customer-preview-dark-series-image', item.title)).join('')}</div>
    </section>
  `
}

function renderSkinPreviewHome(model) {
  if (model.decoration.siteTemplate === 'dark-gallery') return renderSkinPreviewDarkHome(model)
  const { decoration, homeBanner, bannerItems, seriesItems } = model
  const heroItem = bannerItems[0] || seriesItems[0]
  const terms = decoration.terminology

  return decoration.home.sections.map(section => {
    if (section.enabled === false) return ''
    const previewSectionAttribute = `data-preview-section="${escapeHtml(section.type)}"`

    if (section.type === 'hero') {
      return `
        <section class="customer-preview-hero" ${previewSectionAttribute}>
          ${renderSkinPreviewImage(heroItem?.imageUrl || model.heroImage, 'customer-preview-hero-image', '首页作品图')}
          <div class="customer-preview-hero-shade"></div>
          <div class="customer-preview-hero-brand">${escapeHtml(homeBanner.logoText)}</div>
          <div class="customer-preview-hero-copy">
            <div class="customer-preview-hero-kicker"><span></span>${escapeHtml(homeBanner.tagText)}</div>
            <div class="customer-preview-hero-title">${escapeHtml(heroItem?.title || homeBanner.logoText)}</div>
            <div class="customer-preview-hero-meta">${escapeHtml(heroItem?.category || '')}</div>
            ${heroItem?.description || homeBanner.description
              ? `<div class="customer-preview-hero-description">${escapeHtml(heroItem?.description || homeBanner.description)}</div>`
              : ''}
          </div>
        </section>
      `
    }

    if (section.type === 'categories' && model.categories.length > 1) {
      return `<div class="customer-preview-categories" ${previewSectionAttribute}>${model.categories.slice(0, 5).map((item, index) => `<span class="${index === 0 ? 'active' : ''}">${escapeHtml(item)}</span>`).join('')}</div>`
    }

    if (section.type === 'shortcuts') {
      const shortcuts = []
      const scheduleSection = decoration.home.sections.find(item => item.type === 'schedule')
      const testimonialSection = decoration.home.sections.find(item => item.type === 'testimonials')
      if (scheduleSection?.enabled !== false && model.modules.schedule && model.schedule.enabled !== false) {
        shortcuts.push({ icon: scheduleSection.icon || 'calendar-days', text: scheduleSection.title || model.schedule.title || '近期档期' })
      }
      if (testimonialSection?.enabled !== false && model.modules.testimonials && model.testimonials.length) {
        shortcuts.push({ icon: testimonialSection.icon || 'message-circle', text: testimonialSection.title || '客户评价' })
      }
      if (!shortcuts.length) return ''
      return `<nav class="customer-preview-home-shortcuts" ${previewSectionAttribute}>${shortcuts.map(item => `<span class="customer-preview-home-shortcut">${renderSkinPreviewIcon(item.icon)}<b>${escapeHtml(item.text)}</b>${renderSkinPreviewIcon('chevron-right')}</span>`).join('')}</nav>`
    }

    if (section.type === 'portfolio') {
      const showWorkCopy = decoration.home.showTitle || decoration.home.showCategory || decoration.home.showDescription
      const cards = seriesItems.slice(0, 6).map(item => `
        <article class="customer-preview-work-card">
          <div class="customer-preview-work-image-wrap">
            ${renderSkinPreviewImage(item.imageUrl, 'customer-preview-work-image', item.title)}
            <span class="customer-preview-series-badge">${renderSkinPreviewIcon('images')}<span>${escapeHtml(terms.workLabel)}集</span></span>
          </div>
          ${showWorkCopy ? `
            <div class="customer-preview-work-copy">
              ${decoration.home.showTitle ? `<strong>${escapeHtml(item.title)}</strong>` : ''}
              ${decoration.home.showCategory ? `<span>${escapeHtml(item.category)}</span>` : ''}
              ${decoration.home.showDescription && item.description ? `<small>${escapeHtml(item.description)}</small>` : ''}
            </div>
          ` : ''}
        </article>
      `).join('')
      return `
        <section class="customer-preview-page-section customer-preview-portfolio-section" ${previewSectionAttribute}>
          ${renderSkinPreviewHeading(section, `${seriesItems.length} 组`)}
          <div class="customer-preview-work-grid columns-${decoration.home.galleryColumns} gallery-${decoration.home.galleryVariant} ratio-${decoration.home.imageRatio} content-${decoration.home.cardContent} gap-${decoration.home.galleryGap}">
            ${cards || `<div class="customer-preview-empty">上传作品后，这里会显示真实客片。</div>`}
          </div>
        </section>
      `
    }

    if (section.type === 'packages' && model.modules.packages && model.packages.length) {
      return `
        <section class="customer-preview-page-section customer-preview-package-section" ${previewSectionAttribute}>
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
        <section class="customer-preview-page-section customer-preview-schedule-section" ${previewSectionAttribute}>
          <span>${escapeHtml(section.title || model.schedule.title)}</span>
          <strong>${escapeHtml(model.schedule.availableText)}</strong>
          <small>${escapeHtml(model.schedule.notice)}</small>
        </section>
      `
    }

    if (section.type === 'testimonials' && model.modules.testimonials && model.testimonials.length) {
      const review = model.testimonials[0]
      return `
        <section class="customer-preview-page-section customer-preview-review-section" ${previewSectionAttribute}>
          ${renderSkinPreviewHeading(section)}
          <blockquote>“${escapeHtml(review.content || '')}”</blockquote>
          <span>${escapeHtml([review.name, review.shootType, review.dateText].filter(Boolean).join(' · '))}</span>
        </section>
      `
    }

    if (section.type === 'serviceFlow' && model.modules.serviceFlow && model.serviceFlow.enabled !== false) {
      return `
        <section class="customer-preview-page-section customer-preview-flow-section" ${previewSectionAttribute}>
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
    <section class="customer-preview-profile" data-preview-section="profile">
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
    const previewSectionAttribute = `data-preview-section="${escapeHtml(section.type)}"`
    if (section.type === 'profile') return renderSkinPreviewProfile(model)

    if (section.type === 'bio' && model.profile.bio) {
      return `<section class="customer-preview-page-section customer-preview-about-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-bio"><i></i><p>${escapeHtml(model.profile.bio).replace(/\r?\n/g, '<br>')}</p></div></section>`
    }

    if (section.type === 'skills' && Array.isArray(model.profile.skills) && model.profile.skills.length) {
      return `<section class="customer-preview-page-section customer-preview-about-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-skills">${model.profile.skills.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div></section>`
    }

    if (section.type === 'contact') {
      const contactRows = []
      if (model.profile.contact?.wechat) contactRows.push({ icon: model.decoration.icons.contact.wechat, label: '微信', value: model.profile.contact.wechat })
      if (model.profile.contact?.email) contactRows.push({ icon: model.decoration.icons.contact.email, label: '邮箱', value: model.profile.contact.email })
      if (model.profile.studio?.name || model.profile.studio?.address) contactRows.push({ icon: model.decoration.icons.contact.location, label: '到店地址', value: model.profile.studio?.name || model.profile.studio?.address })
      if (!contactRows.length) return ''
      return `<section class="customer-preview-page-section customer-preview-about-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-contact-list">${contactRows.map(row => `<div>${renderSkinPreviewIcon(row.icon)}<span><small>${escapeHtml(row.label)}</small><strong>${escapeHtml(row.value)}</strong></span>${renderSkinPreviewIcon('chevron-right')}</div>`).join('')}</div></section>`
    }

    if (section.type === 'stores' && model.modules.stores && model.stores.length) {
      return `<section class="customer-preview-page-section customer-preview-about-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-simple-list">${model.stores.slice(0, 2).map((item, index) => `<div><b>0${index + 1}</b><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.address || item.businessHours || '')}</small></span></div>`).join('')}</div></section>`
    }

    if (section.type === 'team' && model.modules.photographers && model.photographers.length) {
      return `<section class="customer-preview-page-section customer-preview-about-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-team">${model.photographers.slice(0, 2).map(item => `<div>${renderSkinPreviewImage(getSkinPreviewAssetUrl(item.avatar), 'customer-preview-team-avatar', item.name, model.avatarImage)}<strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.title || '')}</span></div>`).join('')}</div></section>`
    }

    if (section.type === 'packages' && model.modules.packages && model.packages.length) {
      const item = model.packages[0]
      return `<section class="customer-preview-page-section customer-preview-about-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-about-package"><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.subtitle || '')}</small></span><b>${escapeHtml(item.priceText || '')}</b></div></section>`
    }

    if (section.type === 'serviceFlow' && model.modules.serviceFlow && model.serviceFlow.enabled !== false) {
      return `<section class="customer-preview-page-section customer-preview-about-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-simple-list">${(model.serviceFlow.steps || []).slice(0, 3).map((item, index) => `<div><b>0${index + 1}</b><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.description)}</small></span></div>`).join('')}</div></section>`
    }

    if (section.type === 'faq' && model.modules.faq && model.faq.enabled !== false) {
      return `<section class="customer-preview-page-section customer-preview-about-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-faq">${(model.faq.items || []).slice(0, 2).map(item => `<div><strong>${escapeHtml(item.question)}</strong><span>${escapeHtml(item.answer)}</span></div>`).join('')}</div></section>`
    }

    if (section.type === 'testimonials' && model.modules.testimonials && model.testimonials.length) {
      const review = model.testimonials[0]
      return `<section class="customer-preview-page-section customer-preview-about-section customer-preview-review-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<blockquote>“${escapeHtml(review.content || '')}”</blockquote><span>${escapeHtml([review.name, review.shootType].filter(Boolean).join(' · '))}</span></section>`
    }
    return ''
  }).join('')
}

function renderSkinPreviewStores(model) {
  const section = model.decoration.about.sections.find(item => item.type === 'stores') || { title: '门店信息', subtitle: '' }
  const stores = model.stores.length
    ? model.stores
    : (model.profile.studio?.name || model.profile.studio?.address
        ? [{
            name: model.profile.studio?.name || '门店信息',
            address: model.profile.studio?.address || '',
            businessHours: ''
          }]
        : [])
  return `
    <section class="customer-preview-secondary-header customer-preview-stores-header">
      <span>到店服务</span>
      <strong>${escapeHtml(section.title || '门店信息')}</strong>
      <small>${escapeHtml(section.subtitle || '查看地址、营业时间和到店方式')}</small>
    </section>
    <section class="customer-preview-page-section customer-preview-stores-page">
      <div class="customer-preview-simple-list">${stores.slice(0, 3).map((item, index) => `
        <div><b>0${index + 1}</b><span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.address || item.businessHours || '地址待完善')}</small></span></div>
      `).join('') || '<div class="customer-preview-empty">在“店铺资料”中新增门店后，这里会显示地址和导航。</div>'}</div>
    </section>
  `
}

function renderSkinPreviewBookingField(field, model) {
  const required = field.required === true ? '<em>必填</em>' : ''
  if (field.id === 'style') {
    const styles = model.booking.styleOptions.slice(0, 4)
    return `<div class="customer-preview-form-field" data-preview-field="${escapeHtml(field.id)}"><label>${renderSkinPreviewIcon(field.icon)}<span>${escapeHtml(field.label)}</span>${required}</label><div class="customer-preview-style-options">${styles.map((item, index) => `<span class="${index === 0 ? 'active' : ''}">${escapeHtml(item)}</span>`).join('')}</div></div>`
  }
  return `<div class="customer-preview-form-field" data-preview-field="${escapeHtml(field.id)}"><label>${renderSkinPreviewIcon(field.icon)}<span>${escapeHtml(field.label)}</span>${required}</label><div class="customer-preview-input">${escapeHtml(field.placeholder || '')}${['package', 'date', 'store', 'photographer'].includes(field.id) ? renderSkinPreviewIcon('chevron-right') : ''}</div></div>`
}

function renderSkinPreviewBooking(model) {
  const { booking, terminology } = model.decoration
  return booking.sections.map(section => {
    if (section.enabled === false) return ''
    const previewSectionAttribute = `data-preview-section="${escapeHtml(section.type)}"`

    if (section.type === 'hero') {
      return `
        <section class="customer-preview-booking-hero" ${previewSectionAttribute}>
          ${renderSkinPreviewImage(model.bookingCover, 'customer-preview-booking-image', '咨询页封面', model.heroImage)}
          <div class="customer-preview-booking-shade"></div>
          <div class="customer-preview-booking-copy"><span>预约${escapeHtml(terminology.consultationLabel)}</span><strong>${escapeHtml(model.consultation.title)}</strong><p>${escapeHtml(model.consultation.description)}</p></div>
        </section>
      `
    }

    if (section.type === 'notice' && model.consultation.privacyTip) {
      return `<section class="customer-preview-page-section customer-preview-notice" ${previewSectionAttribute}>${renderSkinPreviewIcon(section.icon || 'circle-check')}<span><strong>${escapeHtml(section.title)}</strong><small>${escapeHtml(model.consultation.privacyTip)}</small></span></section>`
    }

    if (section.type === 'schedule' && model.modules.schedule && model.schedule.enabled !== false) {
      return `<section class="customer-preview-page-section customer-preview-booking-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-schedule-card"><strong>${escapeHtml(model.schedule.availableText)}</strong><span>${escapeHtml(model.schedule.notice)}</span></div></section>`
    }

    if (section.type === 'form') {
      const fields = booking.fields.filter(field => field.enabled !== false)
      return `
        <section class="customer-preview-page-section customer-preview-booking-section customer-preview-form-section" ${previewSectionAttribute}>
          ${renderSkinPreviewHeading(section)}
          <div class="customer-preview-form-fields">${fields.map(field => renderSkinPreviewBookingField(field, model)).join('')}</div>
          <div class="customer-preview-assurance"><span>不会自动上传客户信息</span><span>最终时间以沟通为准</span></div>
          <button type="button" tabindex="-1" class="customer-preview-submit">${escapeHtml(section.actionText || `生成${terminology.consultationLabel}内容`)}${renderSkinPreviewIcon('arrow-right')}</button>
        </section>
      `
    }

    if (section.type === 'serviceFlow' && model.modules.serviceFlow && model.serviceFlow.enabled !== false) {
      return `<section class="customer-preview-page-section customer-preview-booking-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-simple-list">${(model.serviceFlow.steps || []).slice(0, 3).map((item, index) => `<div><b>0${index + 1}</b><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.description)}</small></span></div>`).join('')}</div></section>`
    }

    if (section.type === 'faq' && model.modules.faq && model.faq.enabled !== false) {
      return `<section class="customer-preview-page-section customer-preview-booking-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-faq">${(model.faq.items || []).slice(0, 2).map(item => `<div><strong>${escapeHtml(item.question)}</strong><span>${escapeHtml(item.answer)}</span></div>`).join('')}</div></section>`
    }
    return ''
  }).join('')
}

function getSkinPreviewPackage(model) {
  const fallback = DEFAULT_V11_CONFIG.packages[0]
  const item = model.packages[0] || fallback
  return {
    ...fallback,
    ...item,
    suitableFor: Array.isArray(item?.suitableFor) ? item.suitableFor : fallback.suitableFor,
    includes: Array.isArray(item?.includes) ? item.includes : fallback.includes
  }
}

function renderSkinPreviewPackageCard(packageItem, model, compact = false) {
  const terms = model.decoration.terminology
  const meta = [packageItem.duration, packageItem.retouchCount, packageItem.originalPhotos, packageItem.makeupText]
    .filter(Boolean)
    .slice(0, compact ? 2 : 4)
  return `
    <article class="customer-preview-package-card customer-preview-package-card-full">
      <div class="customer-preview-package-card-head">
        <span>${packageItem.isRecommended ? `推荐${escapeHtml(terms.packageLabel)}` : escapeHtml(terms.packageLabel)}</span>
        <b>${escapeHtml(packageItem.priceText || '到店咨询')}</b>
      </div>
      <strong>${escapeHtml(packageItem.name || `门店${terms.packageLabel}`)}</strong>
      <small>${escapeHtml(packageItem.subtitle || '根据顾客需求提供服务方案')}</small>
      ${meta.length ? `<div class="customer-preview-package-meta">${meta.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div>` : ''}
      ${compact ? '' : `<button type="button" tabindex="-1">${escapeHtml(terms.consultationLabel)}${renderSkinPreviewIcon('arrow-right')}</button>`}
    </article>
  `
}

function renderSkinPreviewPackages(model) {
  const decoration = model.decoration.packages
  const packages = model.packages.length ? model.packages.slice(0, 2) : [getSkinPreviewPackage(model)]
  return decoration.sections.map(section => {
    if (section.enabled === false) return ''
    const previewSectionAttribute = `data-preview-section="${escapeHtml(section.type)}"`
    if (section.type === 'header') {
      return `<section class="customer-preview-secondary-header" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}</section>`
    }
    if (section.type === 'schedule' && model.modules.schedule && model.schedule.enabled !== false) {
      return `<section class="customer-preview-page-section customer-preview-schedule-section" ${previewSectionAttribute}><span>${escapeHtml(section.title || model.schedule.title)}</span><strong>${escapeHtml(model.schedule.availableText)}</strong><small>${escapeHtml(section.subtitle || model.schedule.notice)}</small></section>`
    }
    if (section.type === 'list') {
      return `<section class="customer-preview-page-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-package-stack">${packages.map(item => renderSkinPreviewPackageCard(item, model)).join('')}</div></section>`
    }
    if (section.type === 'testimonials' && model.modules.testimonials && model.testimonials.length) {
      const review = model.testimonials[0]
      return `<section class="customer-preview-page-section customer-preview-review-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<blockquote>“${escapeHtml(review.content || '')}”</blockquote><span>${escapeHtml([review.name, review.shootType].filter(Boolean).join(' · '))}</span></section>`
    }
    return ''
  }).join('')
}

function renderSkinPreviewPackageDetail(model) {
  const decoration = model.decoration.packageDetail
  const packageItem = getSkinPreviewPackage(model)
  const terms = model.decoration.terminology
  return decoration.sections.map(section => {
    if (section.enabled === false) return ''
    const previewSectionAttribute = `data-preview-section="${escapeHtml(section.type)}"`
    if (section.type === 'hero') {
      return `<section class="customer-preview-detail-hero" ${previewSectionAttribute}>${section.title ? `<span>${escapeHtml(section.title)}</span>` : ''}<strong>${escapeHtml(packageItem.name)}</strong><b>${escapeHtml(packageItem.priceText)}</b><small>${escapeHtml(packageItem.subtitle)}</small><button type="button" tabindex="-1">${renderSkinPreviewIcon('message-circle')}${escapeHtml(terms.consultationLabel)}</button></section>`
    }
    if (section.type === 'info') {
      const info = [
        ['服务时长', packageItem.duration],
        ['精修数量', packageItem.retouchCount],
        ['底片说明', packageItem.originalPhotos],
        ['妆造说明', packageItem.makeupText]
      ].filter(([, value]) => value)
      return `<section class="customer-preview-page-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-meta-grid">${info.map(([label, value]) => `<div><small>${escapeHtml(label)}</small><strong>${escapeHtml(value)}</strong></div>`).join('')}</div></section>`
    }
    if (section.type === 'suitable' && packageItem.suitableFor.length) {
      return `<section class="customer-preview-page-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-chip-list">${packageItem.suitableFor.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div></section>`
    }
    if (section.type === 'includes' && packageItem.includes.length) {
      return `<section class="customer-preview-page-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-check-list">${packageItem.includes.slice(0, 5).map(item => `<div>${renderSkinPreviewIcon('circle-check')}<span>${escapeHtml(item)}</span></div>`).join('')}</div></section>`
    }
    if (section.type === 'relatedSeries' && model.seriesItems.length) {
      return `<section class="customer-preview-page-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-related-work">${model.seriesItems.slice(0, 2).map(item => `<article>${renderSkinPreviewImage(item.imageUrl, 'customer-preview-work-image', item.title)}<strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.category)}</span></article>`).join('')}</div></section>`
    }
    if (section.type === 'team' && model.modules.photographers && model.photographers.length) {
      return `<section class="customer-preview-page-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-team">${model.photographers.slice(0, 2).map(item => `<div>${renderSkinPreviewImage(getSkinPreviewAssetUrl(item.avatar), 'customer-preview-team-avatar', item.name, model.avatarImage)}<strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.title || '')}</span></div>`).join('')}</div></section>`
    }
    if (section.type === 'testimonials' && model.modules.testimonials && model.testimonials.length) {
      const review = model.testimonials[0]
      return `<section class="customer-preview-page-section customer-preview-review-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<blockquote>“${escapeHtml(review.content || '')}”</blockquote><span>${escapeHtml(review.name || '')}</span></section>`
    }
    if (section.type === 'serviceFlow' && model.modules.serviceFlow && model.serviceFlow.enabled !== false) {
      return `<section class="customer-preview-page-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-simple-list">${(model.serviceFlow.steps || []).slice(0, 3).map((item, index) => `<div><b>0${index + 1}</b><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.description)}</small></span></div>`).join('')}</div></section>`
    }
    if (section.type === 'faq' && model.modules.faq && model.faq.enabled !== false) {
      return `<section class="customer-preview-page-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-faq">${(model.faq.items || []).slice(0, 2).map(item => `<div><strong>${escapeHtml(item.question)}</strong><span>${escapeHtml(item.answer)}</span></div>`).join('')}</div></section>`
    }
    return ''
  }).join('')
}

function renderSkinPreviewSeries(model) {
  const decoration = model.decoration.series
  const item = model.seriesItems[0] || {
    title: `${model.decoration.terminology.workLabel}示例`,
    category: model.decoration.terminology.workLabel,
    imageUrls: [model.heroImage].filter(Boolean),
    imageUrl: model.heroImage,
    photoCount: 1,
    description: '',
    suitableFor: [],
    scenes: [],
    tags: []
  }
  const images = item.imageUrls?.length ? item.imageUrls : [item.imageUrl].filter(Boolean)
  const profileTags = [...(item.suitableFor || []), ...(item.scenes || []), ...(item.tags || [])].slice(0, 5)
  const terms = model.decoration.terminology
  return decoration.sections.map(section => {
    if (section.enabled === false) return ''
    const previewSectionAttribute = `data-preview-section="${escapeHtml(section.type)}"`
    if (section.type === 'hero') {
      return `<section class="customer-preview-series-hero" ${previewSectionAttribute}><span>${escapeHtml(item.category)}</span><strong>${escapeHtml(item.title)}</strong><small>共 ${item.photoCount || images.length} 张${escapeHtml(terms.workLabel)}</small>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}</section>`
    }
    if (section.type === 'profile' && profileTags.length) {
      return `<section class="customer-preview-page-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-chip-list">${profileTags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div></section>`
    }
    if (section.type === 'gallery') {
      return `<section class="customer-preview-page-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-series-gallery">${images.slice(0, 5).map((url, index) => `<figure>${renderSkinPreviewImage(url, 'customer-preview-series-image', `${item.title} ${index + 1}`, model.heroImage)}<figcaption>${String(index + 1).padStart(2, '0')} / ${String(images.length).padStart(2, '0')}</figcaption></figure>`).join('')}</div></section>`
    }
    if (section.type === 'packages' && model.modules.packages) {
      return `<section class="customer-preview-page-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}${renderSkinPreviewPackageCard(getSkinPreviewPackage(model), model, true)}</section>`
    }
    if (section.type === 'team' && model.modules.photographers && model.photographers.length) {
      return `<section class="customer-preview-page-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-simple-list">${model.photographers.slice(0, 2).map((person, index) => `<div><b>0${index + 1}</b><span><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(person.title || '')}</small></span></div>`).join('')}</div></section>`
    }
    if (section.type === 'testimonials' && model.modules.testimonials && model.testimonials.length) {
      const review = model.testimonials[0]
      return `<section class="customer-preview-page-section customer-preview-review-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<blockquote>“${escapeHtml(review.content || '')}”</blockquote><span>${escapeHtml(review.name || '')}</span></section>`
    }
    if (section.type === 'action') {
      return `<section class="customer-preview-page-section customer-preview-action-section" ${previewSectionAttribute}><button type="button" tabindex="-1">${renderSkinPreviewIcon('message-circle')}${escapeHtml(section.actionText || `${terms.consultationLabel}同款风格`)}</button></section>`
    }
    return ''
  }).join('')
}

function renderSkinPreviewSuccess(model) {
  const decoration = model.decoration.success
  const terms = model.decoration.terminology
  const summary = [
    ['称呼', '顾客示例'],
    ['心仪风格', model.categories[1] || '待沟通'],
    [`意向${terms.packageLabel}`, getSkinPreviewPackage(model).name],
    ['期望日期', '与客服确认']
  ]
  const consultationText = `你好，我想${terms.consultationLabel}${terms.serviceLabel}服务，希望进一步确认档期和方案。`
  const wechat = model.profile.contact?.wechat || '客服微信号'
  return decoration.sections.map(section => {
    if (section.enabled === false) return ''
    const previewSectionAttribute = `data-preview-section="${escapeHtml(section.type)}"`
    if (section.type === 'hero') {
      return `<section class="customer-preview-result-hero" ${previewSectionAttribute}>${renderSkinPreviewIcon(section.icon || 'circle-check')}<strong>${escapeHtml(section.title)}</strong>${section.subtitle ? `<span>${escapeHtml(section.subtitle)}</span>` : ''}</section>`
    }
    if (section.type === 'summary') {
      return `<section class="customer-preview-page-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-summary-list">${summary.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</div></section>`
    }
    if (section.type === 'content') {
      return `<section class="customer-preview-page-section" ${previewSectionAttribute}>${renderSkinPreviewHeading(section)}<div class="customer-preview-content-block">${escapeHtml(consultationText)}</div></section>`
    }
    if (section.type === 'contact') {
      return `<section class="customer-preview-contact-card" ${previewSectionAttribute}><span>${section.icon ? renderSkinPreviewIcon(section.icon) : ''}<small>${escapeHtml(section.title)}</small><strong>${escapeHtml(wechat)}</strong></span><button type="button" tabindex="-1">${renderSkinPreviewIcon('copy')}复制</button></section>`
    }
    if (section.type === 'actions') {
      return `<section class="customer-preview-page-section customer-preview-result-actions" ${previewSectionAttribute}><button type="button" tabindex="-1">${renderSkinPreviewIcon('copy')}${escapeHtml(section.actionText || `复制${terms.consultationLabel}内容`)}</button><span>联系${escapeHtml(terms.customerServiceLabel)}确定日期</span></section>`
    }
    return ''
  }).join('')
}

function renderSkinPreviewNavigation(model) {
  const nav = document.getElementById('skinPreviewBottomNav')
  if (!nav) return
  if (model.decoration.siteTemplate === 'dark-gallery' && activeSkinPreviewPage === 'series') {
    nav.className = 'customer-preview-bottom-nav customer-preview-dark-series-dock'
    nav.style.gridTemplateColumns = 'minmax(0, 1fr) 50px 80px'
    nav.innerHTML = `
      <span><strong>${escapeHtml(model.homeBanner.logoText)}</strong><small>记录值得珍藏的瞬间</small></span>
      <button type="button">${renderSkinPreviewIcon('navigation')}</button>
      <button type="button" class="customer-preview-dark-series-dock-action">${escapeHtml(model.decoration.showcase.seriesActionText)}</button>
    `
    return
  }
  const pages = model.decoration.navigation.items
    .filter(item => item.enabled)
    .map(item => {
      const definition = NAVIGATION_ITEM_DEFINITIONS[item.key]
      return {
        key: definition.previewPage,
        text: model.decoration.navigation[definition.textKey],
        icon: model.decoration.icons.navigation[item.key],
        customIcon: model.decoration.icons.navigationCustom[item.key]
      }
    })
  nav.className = `customer-preview-bottom-nav nav-${model.decoration.navigation.style}`
  nav.style.gridTemplateColumns = `repeat(${pages.length}, minmax(0, 1fr))`
  nav.innerHTML = pages.map(item => `
    <button type="button" class="${activeSkinPreviewPage === item.key ? 'active' : ''}" onclick="switchSkinPreviewPage('${item.key}')">
      <i></i><span>${renderSkinPreviewIcon(item.icon, '', item.customIcon)}</span><b>${escapeHtml(item.text)}</b>
    </button>
  `).join('')
}

function renderSkinPreviewQuickJump(model) {
  const quickJump = document.getElementById('skinPreviewQuickJump')
  if (!quickJump) return
  const darkGallery = model.decoration.siteTemplate === 'dark-gallery'
  const visible = model.modules.quickJump !== false
    && model.quickJump.enabled !== false
    && !(darkGallery && activeSkinPreviewPage === 'series')
  quickJump.hidden = !visible
  quickJump.className = darkGallery
    ? 'customer-preview-quick-jump customer-preview-dark-floating-actions'
    : 'customer-preview-quick-jump'
  quickJump.classList.toggle('is-open', skinPreviewQuickJumpOpen)
  if (!visible) return
  if (darkGallery) {
    quickJump.innerHTML = `
      <button type="button" class="customer-preview-dark-follow">${renderSkinPreviewIcon('heart')}<span>关注</span></button>
      <button type="button" class="customer-preview-dark-contact-button" onclick="switchSkinPreviewPage('booking')">${renderSkinPreviewIcon('message-circle')}<span>联系</span></button>
    `
    return
  }
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

function updateSkinPreviewScale() {
  const canvas = document.querySelector('#sharedCustomerPreview .customer-preview-canvas')
  const shell = document.getElementById('skinPreviewPhoneShell')
  const phone = document.getElementById('skinLivePreview')
  if (!canvas || !shell || !phone) return

  const canvasStyle = window.getComputedStyle(canvas)
  const horizontalPadding = (Number.parseFloat(canvasStyle.paddingLeft) || 0) + (Number.parseFloat(canvasStyle.paddingRight) || 0)
  const verticalPadding = (Number.parseFloat(canvasStyle.paddingTop) || 0) + (Number.parseFloat(canvasStyle.paddingBottom) || 0)
  const availableWidth = canvas.clientWidth - horizontalPadding
  const availableHeight = canvas.clientHeight - verticalPadding
  if (availableWidth <= 0 || availableHeight <= 0) return

  const baseWidth = phone.offsetWidth || 393
  const baseHeight = phone.offsetHeight || 852
  const scale = Math.min(1, availableWidth / baseWidth, availableHeight / baseHeight)
  shell.style.width = `${Math.round(baseWidth * scale)}px`
  shell.style.height = `${Math.round(baseHeight * scale)}px`
  phone.style.transform = `scale(${scale})`
  phone.dataset.previewScale = scale.toFixed(3)
}

function focusDecorationSectionFromPreview(pageKey, sectionType) {
  if (!DECORATION_PAGE_GUIDE[pageKey] || !sectionType) return
  switchDecorationStage('pages')
  switchDecorationPage(pageKey)

  window.requestAnimationFrame(() => {
    const row = document.querySelector(`[data-decoration-change-host="section:${pageKey}:${sectionType}"]`)
    if (!row) return
    const details = row.querySelector('.decoration-row-details')
    if (details) details.open = true
    row.scrollIntoView({ behavior: 'smooth', block: 'center' })
    row.classList.remove('decoration-preview-target')
    void row.offsetWidth
    row.classList.add('decoration-preview-target')
    window.setTimeout(() => row.classList.remove('decoration-preview-target'), 1800)
  })
}

function bindSkinPreviewSectionNavigation(viewport) {
  if (!viewport) return
  viewport.querySelectorAll('[data-preview-section]').forEach(section => {
    const sectionType = section.dataset.previewSection
    section.setAttribute('role', 'button')
    section.setAttribute('tabindex', '0')
    section.setAttribute('aria-label', `编辑${DECORATION_SECTION_NAMES[activeSkinPreviewPage]?.[sectionType] || '当前模块'}`)
    section.title = '点击编辑这个模块'
    const activate = event => {
      if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return
      event.preventDefault()
      focusDecorationSectionFromPreview(activeSkinPreviewPage, sectionType)
    }
    section.addEventListener('click', activate)
    section.addEventListener('keydown', activate)
  })
}

function updateThemePreview() {
  const preview = document.getElementById('skinLivePreview')
  const viewport = document.getElementById('skinPreviewViewport')
  if (!preview || !viewport) return
  const themeModalActive = document.getElementById('themeSettingsModal')?.classList.contains('active')
  if (themeModalActive) syncThemeColorOutputs()
  const theme = getManagementPreviewTheme()
  const preset = THEME_PRESETS[theme.preset] || THEME_PRESETS.minimal
  const model = getSkinPreviewModel(theme)
  if (model.decoration.siteTemplate !== 'dark-gallery' && activeSkinPreviewPage === 'gallery') {
    activeSkinPreviewPage = 'home'
  }
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
  const focalPointMap = {
    center: 'center center',
    top: 'center top',
    bottom: 'center bottom',
    left: 'left center',
    right: 'right center'
  }
  const heroOverlayMap = { light: '.2', balanced: '.42', strong: '.62' }

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
  preview.style.setProperty('--preview-hero-position', focalPointMap[model.decoration.media.heroFocalPoint] || focalPointMap.center)
  preview.style.setProperty('--preview-gallery-position', focalPointMap[model.decoration.media.galleryFocalPoint] || focalPointMap.center)
  preview.style.setProperty('--preview-hero-overlay', heroOverlayMap[model.decoration.media.heroOverlay] || heroOverlayMap.balanced)
  preview.style.fontFamily = fontFamilies[theme.fontStyle] || fontFamilies.clean
  preview.dataset.skin = theme.preset
  preview.dataset.framework = model.decoration.framework.id
  preview.dataset.frameworkRhythm = model.decoration.framework.sectionRhythm
  preview.dataset.frameworkMotion = model.decoration.framework.motion
  preview.dataset.siteTemplate = model.decoration.siteTemplate
  preview.dataset.heading = theme.headingStyle
  preview.dataset.decorations = theme.showDecorations ? 'on' : 'off'
  preview.dataset.page = activeSkinPreviewPage
  preview.dataset.template = model.decoration.home.template
  preview.dataset.hero = model.decoration.home.heroVariant
  preview.dataset.gallery = model.decoration.home.galleryVariant
  preview.dataset.columns = String(model.decoration.home.galleryColumns)
  preview.dataset.cardContent = model.decoration.home.cardContent
  preview.dataset.galleryGap = model.decoration.home.galleryGap
  preview.dataset.aboutHeader = model.decoration.about.headerVariant
  preview.dataset.bookingHeader = model.decoration.booking.headerVariant
  preview.dataset.bookingForm = model.decoration.booking.formVariant
  preview.dataset.packagesLayout = model.decoration.packages.layoutVariant
  preview.dataset.packageDetailLayout = model.decoration.packageDetail.layoutVariant
  preview.dataset.seriesGallery = model.decoration.series.galleryVariant
  preview.dataset.successLayout = model.decoration.success.layoutVariant
  const usesCustomNavigation = CUSTOM_NAVIGATION_PREVIEW_PAGES.has(activeSkinPreviewPage)
    || (model.decoration.siteTemplate === 'dark-gallery' && activeSkinPreviewPage === 'series')
  preview.dataset.navigationMode = usesCustomNavigation ? 'custom' : 'native'

  const nativeNavbar = document.getElementById('skinPreviewNativeNavbar')
  const nativeTitle = document.getElementById('skinPreviewNativeTitle')
  const nativeBack = document.getElementById('skinPreviewNativeBack')
  if (nativeNavbar) {
    nativeNavbar.hidden = usesCustomNavigation
    nativeNavbar.setAttribute('aria-hidden', String(usesCustomNavigation))
  }
  if (nativeTitle) nativeTitle.textContent = PREVIEW_NATIVE_PAGE_TITLES[activeSkinPreviewPage] || '小程序页面'
  if (nativeBack) nativeBack.classList.toggle('is-visible', PREVIEW_BACK_PAGES.has(activeSkinPreviewPage))

  if (activeSkinPreviewPage === 'gallery') viewport.innerHTML = renderSkinPreviewGallery(model)
  else if (activeSkinPreviewPage === 'about' && model.decoration.siteTemplate === 'dark-gallery') viewport.innerHTML = renderSkinPreviewDarkAbout(model)
  else if (activeSkinPreviewPage === 'series' && model.decoration.siteTemplate === 'dark-gallery') viewport.innerHTML = renderSkinPreviewDarkSeries(model)
  else if (activeSkinPreviewPage === 'about') viewport.innerHTML = renderSkinPreviewAbout(model)
  else if (activeSkinPreviewPage === 'stores') viewport.innerHTML = renderSkinPreviewStores(model)
  else if (activeSkinPreviewPage === 'booking') viewport.innerHTML = renderSkinPreviewBooking(model)
  else if (activeSkinPreviewPage === 'packages') viewport.innerHTML = renderSkinPreviewPackages(model)
  else if (activeSkinPreviewPage === 'packageDetail') viewport.innerHTML = renderSkinPreviewPackageDetail(model)
  else if (activeSkinPreviewPage === 'series') viewport.innerHTML = renderSkinPreviewSeries(model)
  else if (activeSkinPreviewPage === 'success') viewport.innerHTML = renderSkinPreviewSuccess(model)
  else viewport.innerHTML = renderSkinPreviewHome(model)

  bindSkinPreviewSectionNavigation(viewport)

  renderSkinPreviewNavigation(model)
  renderSkinPreviewQuickJump(model)

  document.querySelectorAll('[data-skin-preview-page]').forEach(button => {
    if (button.dataset.skinPreviewPage === 'gallery') button.hidden = model.decoration.siteTemplate !== 'dark-gallery'
    const active = button.dataset.skinPreviewPage === activeSkinPreviewPage
    button.classList.toggle('active', active)
    button.setAttribute('aria-selected', String(active))
  })
  const morePageSelect = document.getElementById('skinPreviewMorePage')
  if (morePageSelect) {
    morePageSelect.value = SKIN_PREVIEW_SECONDARY_PAGE_KEYS.has(activeSkinPreviewPage) ? activeSkinPreviewPage : ''
    morePageSelect.classList.toggle('active', SKIN_PREVIEW_SECONDARY_PAGE_KEYS.has(activeSkinPreviewPage))
  }

  const name = document.getElementById('skinPreviewName')
  const status = document.getElementById('skinPreviewStatus')
  if (name) name.textContent = FRAMEWORK_PRESETS[model.decoration.framework.id]?.name || preset.name
  if (status) {
    const customized = THEME_VISUAL_FIELDS.some(field => String(theme[field]).toLowerCase() !== String(preset[field]).toLowerCase())
    status.textContent = customized ? '当前草稿已微调，保存后生效' : '当前草稿，保存后生效'
  }
  updateTerminologyPresetState()
  applyPendingDecorationPreviewFeedback()
  window.requestAnimationFrame(updateSkinPreviewScale)
}

function toggleDecorationMobilePreview(forceState) {
  const button = document.getElementById('decorationMobilePreviewButton')
  const shouldOpen = typeof forceState === 'boolean'
    ? forceState
    : !document.body.classList.contains('decoration-mobile-preview-open')
  document.body.classList.toggle('decoration-mobile-preview-open', shouldOpen)
  if (button) {
    button.textContent = shouldOpen ? '返回编辑' : '查看预览'
    button.classList.toggle('is-active', shouldOpen)
    button.setAttribute('aria-pressed', String(shouldOpen))
  }
  if (shouldOpen) {
    if (lastDecorationPreviewFeedback) {
      pendingDecorationPreviewFeedback = { ...lastDecorationPreviewFeedback }
    }
    updateThemePreview()
  }
}

function selectThemePreset(presetKey) {
  setSelectValue('themePreset', presetKey)
  applySelectedThemePreset()
}

function restoreOriginalThemeSettings() {
  if (!themeEditorOriginalState) return
  setThemeEditorValues(themeEditorOriginalState.theme)
  if (themeEditorOriginalState.decoration) {
    decorationEditorState = deepClone(themeEditorOriginalState.decoration)
    Object.keys(DEFAULT_DECORATION_CONFIG.terminology).forEach(key => {
      const element = document.getElementById(`term-${key}`)
      if (element) element.value = decorationEditorState.terminology[key]
    })
    setSelectValue('navStyle', decorationEditorState.navigation.style)
    setShowcaseEditorValues(decorationEditorState)
    setHomeLayoutEditorValues(decorationEditorState.home)
    setSelectValue('aboutHeaderVariant', decorationEditorState.about.headerVariant)
    setSelectValue('bookingHeaderVariant', decorationEditorState.booking.headerVariant)
    setSelectValue('bookingFormVariant', decorationEditorState.booking.formVariant)
    setSelectValue('packagesLayoutVariant', decorationEditorState.packages.layoutVariant)
    setSelectValue('packageDetailLayoutVariant', decorationEditorState.packageDetail.layoutVariant)
    setSelectValue('seriesGalleryVariant', decorationEditorState.series.galleryVariant)
    setSelectValue('successLayoutVariant', decorationEditorState.success.layoutVariant)
    renderDecorationEditors()
  } else {
    applyDecorationVariantState(themeEditorOriginalState.variants)
  }
  renderThemePresetCards()
  markDecorationChanged({
    key: 'appearance:restore-original',
    stage: 'appearance',
    label: '恢复打开前的样式',
    editorElement: document.querySelector('.skin-picker-toolbar'),
    previewSelector: '#skinLivePreview'
  })
  updateThemePreview()
  showToast('已恢复打开时的风格', 'success')
}

function bindThemePreviewDraftEvents() {
  const modal = document.getElementById('themeSettingsModal')
  if (!modal || modal.dataset.previewEventsBound === 'true') return

  const previewCanvas = modal.querySelector('.decoration-preview-pane .customer-preview-canvas')
  if (previewCanvas && typeof ResizeObserver === 'function') {
    decorationPreviewResizeObserver?.disconnect()
    decorationPreviewResizeObserver = new ResizeObserver(updateSkinPreviewScale)
    decorationPreviewResizeObserver.observe(previewCanvas)
  }

  const refreshPreview = event => {
    if (!event.target.matches('input, select, textarea')) return
    if (event.target.closest('.customer-preview-page-tabs')) return
    if (event.target.closest('.decoration-row')) return
    if (event.target.id === 'homeGalleryColumns') {
      handleHomeGalleryColumnsChange(event.target.value)
      return
    }
    if (event.target.id === 'homeCardContent') {
      handleHomeCardContentChange(event.target.value)
      return
    }
    const homeVisibilityFields = {
      homeShowTitle: 'showTitle',
      homeShowCategory: 'showCategory',
      homeShowDescription: 'showDescription'
    }
    if (homeVisibilityFields[event.target.id]) {
      updateHomeCardVisibility(homeVisibilityFields[event.target.id], event.target.checked)
      return
    }
    markDecorationChanged(getStaticDecorationChangeContext(event.target))
    updateThemePreview()
  }
  modal.addEventListener('input', refreshPreview)
  modal.addEventListener('change', refreshPreview)
  modal.dataset.previewEventsBound = 'true'
}

async function openThemeSettingsModal() {
  if (adminInitializationPromise) {
    try {
      await adminInitializationPromise
    } catch (error) {
      console.warn('后台数据初始化未完整完成，将使用当前已加载的数据打开装修：', error)
    }
  }
  setDecorationSaveState('clean')
  const config = ensureV11Config()
  const theme = fillMissingObject(config.theme, DEFAULT_V11_CONFIG.theme)
  const decoration = normalizeDecorationConfig(config.decoration)

  setThemeEditorValues(theme)

  decorationEditorState = deepClone(decoration)
  Object.keys(DEFAULT_DECORATION_CONFIG.terminology).forEach(key => {
    const element = document.getElementById(`term-${key}`)
    if (element) element.value = decoration.terminology[key]
  })
  setSelectValue('navStyle', decoration.navigation.style)
  setShowcaseEditorValues(decoration)
  setHomeLayoutEditorValues(decoration.home)
  setSelectValue('aboutHeaderVariant', decoration.about.headerVariant)
  setSelectValue('bookingHeaderVariant', decoration.booking.headerVariant)
  setSelectValue('bookingFormVariant', decoration.booking.formVariant)
  setSelectValue('packagesLayoutVariant', decoration.packages.layoutVariant)
  setSelectValue('packageDetailLayoutVariant', decoration.packageDetail.layoutVariant)
  setSelectValue('seriesGalleryVariant', decoration.series.galleryVariant)
  setSelectValue('successLayoutVariant', decoration.success.layoutVariant)
  renderDecorationEditors()
  bindThemePreviewDraftEvents()
  decorationVisitedStages.clear()
  activeSkinPreviewPage = 'home'
  activeDecorationPage = 'home'
  skinPreviewQuickJumpOpen = false
  toggleDecorationMobilePreview(false)
  switchDecorationStage('appearance')
  switchDecorationPage('home')
  themeEditorOriginalState = {
    theme: deepClone(getThemeEditorValues()),
    variants: deepClone(getDecorationVariantState()),
    decoration: deepClone(decorationEditorState)
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
  markDecorationChanged({
    key: 'appearance:preset',
    stage: 'appearance',
    label: `皮肤：${preset.name}`,
    editorElement: document.querySelector('.skin-preset-card.selected'),
    previewSelector: '#skinLivePreview'
  })
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

  setDecorationSaveState('saving')
  const success = await saveConfig()
  if (success) {
    setDecorationSaveState('clean')
    closeModal('themeSettingsModal')
    showToast('页面装修已更新', 'success')
  } else {
    setDecorationSaveState('dirty')
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
    if (seen.has(item[keyName])) return
    if (keyName === 'type' && item.type === 'shortcuts') {
      const heroIndex = normalized.findIndex(entry => entry.type === 'hero')
      normalized.splice(heroIndex >= 0 ? heroIndex + 1 : 0, 0, deepClone(item))
      return
    }
    normalized.push(deepClone(item))
  })

  return [
    ...normalized.filter(item => item.enabled !== false),
    ...normalized.filter(item => item.enabled === false)
  ]
}

function normalizeNavigationItems(items) {
  if (!Array.isArray(items)) return deepClone(DEFAULT_DECORATION_CONFIG.navigation.items)

  const seen = new Set()
  const normalized = []
  items.forEach(item => {
    const key = String(item?.key || '').trim()
    if (!NAVIGATION_ITEM_DEFINITIONS[key] || seen.has(key)) return
    seen.add(key)
    normalized.push({ key, enabled: item.enabled !== false })
  })

  DEFAULT_DECORATION_CONFIG.navigation.items.forEach(item => {
    if (!seen.has(item.key)) normalized.push({ key: item.key, enabled: false })
  })

  while (normalized.filter(item => item.enabled).length < 2) {
    const next = normalized.find(item => !item.enabled)
    if (!next) break
    next.enabled = true
  }

  return [
    ...normalized.filter(item => item.enabled),
    ...normalized.filter(item => !item.enabled)
  ]
}

function normalizeDecorationConfig(decoration) {
  const source = decoration && typeof decoration === 'object' ? decoration : {}
  const normalized = fillMissingObject(decoration, DEFAULT_DECORATION_CONFIG)
  const pickValue = (value, allowed, fallback) => allowed.includes(value) ? value : fallback
  const migratedFrameworkId = source.framework?.id
    || (source.siteTemplate === 'dark-gallery' ? 'cinematic-gallery' : DEFAULT_DECORATION_CONFIG.framework.id)
  normalized.schemaVersion = 2
  normalized.framework.id = pickValue(
    migratedFrameworkId,
    ['legacy-classic', ...Object.keys(FRAMEWORK_PRESETS)],
    DEFAULT_DECORATION_CONFIG.framework.id
  )
  normalized.framework.motion = pickValue(
    normalized.framework.motion,
    ['none', 'subtle'],
    DEFAULT_DECORATION_CONFIG.framework.motion
  )
  normalized.framework.sectionRhythm = pickValue(
    normalized.framework.sectionRhythm,
    ['tight', 'balanced', 'airy'],
    DEFAULT_DECORATION_CONFIG.framework.sectionRhythm
  )
  normalized.media.heroFocalPoint = pickValue(
    normalized.media.heroFocalPoint,
    ['center', 'top', 'bottom', 'left', 'right'],
    DEFAULT_DECORATION_CONFIG.media.heroFocalPoint
  )
  normalized.media.galleryFocalPoint = pickValue(
    normalized.media.galleryFocalPoint,
    ['center', 'top', 'bottom', 'left', 'right'],
    DEFAULT_DECORATION_CONFIG.media.galleryFocalPoint
  )
  normalized.media.heroOverlay = pickValue(
    normalized.media.heroOverlay,
    ['light', 'balanced', 'strong'],
    DEFAULT_DECORATION_CONFIG.media.heroOverlay
  )
  normalized.siteTemplate = normalized.framework.id === 'cinematic-gallery'
    ? 'dark-gallery'
    : normalized.framework.id === 'legacy-classic'
      ? pickValue(normalized.siteTemplate, ['classic', 'dark-gallery'], DEFAULT_DECORATION_CONFIG.siteTemplate)
      : 'classic'
  normalized.showcase = fillMissingObject(normalized.showcase, DEFAULT_DECORATION_CONFIG.showcase)
  normalized.showcase.heroActionText = String(normalized.showcase.heroActionText || DEFAULT_DECORATION_CONFIG.showcase.heroActionText).trim().slice(0, 12)
  normalized.showcase.heroActionTarget = pickValue(normalized.showcase.heroActionTarget, ['gallery', 'booking'], DEFAULT_DECORATION_CONFIG.showcase.heroActionTarget)
  normalized.showcase.galleryTitle = String(normalized.showcase.galleryTitle || DEFAULT_DECORATION_CONFIG.showcase.galleryTitle).trim().slice(0, 18)
  normalized.showcase.gallerySubtitle = String(normalized.showcase.gallerySubtitle || DEFAULT_DECORATION_CONFIG.showcase.gallerySubtitle).trim().slice(0, 24)
  normalized.showcase.categoryMode = pickValue(normalized.showcase.categoryMode, ['top', 'sidebar'], DEFAULT_DECORATION_CONFIG.showcase.categoryMode)
  normalized.showcase.galleryColumns = [2, 3].includes(Number(normalized.showcase.galleryColumns)) ? Number(normalized.showcase.galleryColumns) : DEFAULT_DECORATION_CONFIG.showcase.galleryColumns
  normalized.showcase.showSearch = normalized.showcase.showSearch !== false
  normalized.showcase.showTags = normalized.showcase.showTags !== false
  normalized.showcase.seriesActionText = String(normalized.showcase.seriesActionText || DEFAULT_DECORATION_CONFIG.showcase.seriesActionText).trim().slice(0, 12)
  normalized.showcase.aboutQuote = String(normalized.showcase.aboutQuote || DEFAULT_DECORATION_CONFIG.showcase.aboutQuote).trim().slice(0, 80)
  normalized.showcase.aboutGalleryLimit = [6, 9].includes(Number(normalized.showcase.aboutGalleryLimit)) ? Number(normalized.showcase.aboutGalleryLimit) : DEFAULT_DECORATION_CONFIG.showcase.aboutGalleryLimit
  Object.keys(DEFAULT_DECORATION_CONFIG.terminology).forEach(key => {
    normalized.terminology[key] = String(normalized.terminology[key] || '').trim() || DEFAULT_DECORATION_CONFIG.terminology[key]
  })
  ;['portfolioText', 'galleryText', 'aboutText', 'packagesText', 'bookingText', 'storesText'].forEach(key => {
    normalized.navigation[key] = String(normalized.navigation[key] || '').trim() || DEFAULT_DECORATION_CONFIG.navigation[key]
  })
  normalized.navigation.items = normalizeNavigationItems(normalized.navigation.items)
  normalized.navigation.style = pickValue(
    normalized.navigation.style,
    ['line', 'quiet'],
    DEFAULT_DECORATION_CONFIG.navigation.style
  )
  Object.entries(DEFAULT_DECORATION_CONFIG.icons).forEach(([group, defaults]) => {
    Object.entries(defaults).forEach(([key, fallback]) => {
      normalized.icons[group][key] = group === 'navigationCustom'
        ? normalizeCustomIconPath(normalized.icons[group][key])
        : normalizeConfigurableIcon(normalized.icons[group][key], fallback)
    })
  })
  normalized.home.template = pickValue(
    normalized.home.template,
    Object.keys(HOME_TEMPLATE_PRESETS),
    DEFAULT_DECORATION_CONFIG.home.template
  )
  normalized.home.heroVariant = pickValue(
    normalized.home.heroVariant,
    ['editorial', 'immersive', 'compact'],
    DEFAULT_DECORATION_CONFIG.home.heroVariant
  )
  normalized.home.galleryVariant = pickValue(
    normalized.home.galleryVariant,
    ['editorial', 'masonry', 'cards', 'horizontal', 'mixed'],
    DEFAULT_DECORATION_CONFIG.home.galleryVariant
  )
  normalized.home.galleryColumns = normalizeHomeGalleryColumns(normalized.home.galleryColumns)
  normalized.home.imageRatio = pickValue(
    normalized.home.imageRatio,
    ['portrait', 'natural', 'square'],
    DEFAULT_DECORATION_CONFIG.home.imageRatio
  )
  let homeCardContent = pickValue(
    normalized.home.cardContent,
    ['full', 'compact', 'image-only', 'custom'],
    DEFAULT_DECORATION_CONFIG.home.cardContent
  )
  const visibilityFallback = getHomeCardVisibilityPreset(homeCardContent)
  normalized.home.showTitle = typeof normalized.home.showTitle === 'boolean'
    ? normalized.home.showTitle
    : visibilityFallback.showTitle
  normalized.home.showCategory = typeof normalized.home.showCategory === 'boolean'
    ? normalized.home.showCategory
    : visibilityFallback.showCategory
  normalized.home.showDescription = typeof normalized.home.showDescription === 'boolean'
    ? normalized.home.showDescription
    : visibilityFallback.showDescription
  if (normalized.home.galleryColumns === 4) {
    homeCardContent = 'image-only'
    normalized.home.showTitle = false
    normalized.home.showCategory = false
    normalized.home.showDescription = false
  } else {
    homeCardContent = getHomeCardContentFromVisibility(normalized.home)
  }
  normalized.home.cardContent = homeCardContent
  normalized.home.galleryGap = pickValue(
    normalized.home.galleryGap,
    ['tight', 'standard', 'airy'],
    DEFAULT_DECORATION_CONFIG.home.galleryGap
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
  window.AdminWorkbench?.refresh('profileModal')
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
  window.AdminWorkbench?.refresh('profileModal')
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
        window.AdminWorkbench?.refresh('settingsModal')
      }
      mainImg.onload = () => {
        mainImg.style.display = 'block'
        document.getElementById('no-main-banner').style.display = 'none'
        window.AdminWorkbench?.refresh('settingsModal')
      }

      const bookingImg = document.getElementById('preview-booking-banner')
      bookingImg.src = `${bannerBase}/booking-banner.jpg?t=${ts}`
      bookingImg.style.display = 'block'
      bookingImg.onerror = () => {
        bookingImg.style.display = 'none'
        document.getElementById('no-booking-banner').style.display = 'flex'
        window.AdminWorkbench?.refresh('settingsModal')
      }
      bookingImg.onload = () => {
        bookingImg.style.display = 'block'
        document.getElementById('no-booking-banner').style.display = 'none'
        window.AdminWorkbench?.refresh('settingsModal')
      }

      const aboutImg = document.getElementById('preview-about-banner')
      aboutImg.src = `${bannerBase}/about-banner.jpg?t=${ts}`
      aboutImg.style.display = 'block'
      aboutImg.onerror = () => {
        aboutImg.style.display = 'none'
        document.getElementById('no-about-banner').style.display = 'flex'
        window.AdminWorkbench?.refresh('settingsModal')
      }
      aboutImg.onload = () => {
        aboutImg.style.display = 'block'
        document.getElementById('no-about-banner').style.display = 'none'
        window.AdminWorkbench?.refresh('settingsModal')
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
  window.AdminWorkbench?.setState('settingsModal', 'saving')

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
    window.AdminWorkbench?.setState('settingsModal', 'dirty')
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
      window.AdminWorkbench?.setState('settingsModal', 'clean')
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
      window.AdminWorkbench?.setState('settingsModal', 'dirty')
      showToast('保存失败: ' + result.error, 'error')
    }

  } catch (error) {
    console.error('保存设置失败:', error)
    logDiv.innerHTML += `<div style="color: #e06c75">[ERROR] 网络请求失败: ${error.message}</div>`
    showToast('网络请求失败', 'error')
    window.AdminWorkbench?.setState('settingsModal', 'dirty')
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
  window.AdminWorkbench?.refresh('settingsModal')
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
    window.AdminWorkbench?.refresh('settingsModal')
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
