export type DecorationPageKey =
  | 'home'
  | 'gallery'
  | 'series'
  | 'about'
  | 'packages'
  | 'packageDetail'
  | 'booking'
  | 'stores'
  | 'success'

export type DecorationFrameworkId =
  | 'legacy-classic'
  | 'cinematic-gallery'
  | 'editorial-journal'
  | 'atelier-conversion'

export type DecorationFocalPoint = 'center' | 'top' | 'bottom' | 'left' | 'right'

export interface FrameworkDecoration {
  id: DecorationFrameworkId
  motion: 'none' | 'subtle'
  sectionRhythm: 'tight' | 'balanced' | 'airy'
}

export interface MediaDecoration {
  heroFocalPoint: DecorationFocalPoint
  galleryFocalPoint: DecorationFocalPoint
  heroOverlay: 'light' | 'balanced' | 'strong'
}

export interface DecorationRuntime {
  frameworkId: DecorationFrameworkId
  className: string
  style: string
}

export interface DecorationSection {
  id: string
  type: string
  enabled: boolean
  icon: string
  title: string
  subtitle: string
  actionText: string
  variant: string
}

export type DecorationModuleSourceMode = 'auto' | 'series' | 'photos'
export type DecorationImageRatio = 'natural' | '1:1' | '3:4' | '4:5' | '16:9'
export type DecorationModuleLayoutMode = 'grid' | 'masonry' | 'horizontal' | 'mixed' | 'stack'

export interface DecorationPhotoReference {
  seriesId: string
  photoName: string
}

export interface DecorationModuleContent {
  title: string
  subtitle: string
  body: string
  actionText: string
  actionTarget: string
  icon: string
  showTitle: boolean
  showCategory: boolean
  showDescription: boolean
}

export interface DecorationModuleLayout {
  mode: DecorationModuleLayoutMode
  columns: 1 | 2 | 3 | 4
  ratio: DecorationImageRatio
  gap: 'tight' | 'standard' | 'airy'
  showText: boolean
}

export interface DecorationModuleSource {
  mode: DecorationModuleSourceMode
  seriesIds: string[]
  photos: DecorationPhotoReference[]
  limit: number
}

export interface DecorationModuleMedia {
  ratio: DecorationImageRatio
  overlay: number
  brightness: number
  focusX: number
  focusY: number
}

export interface DecorationModuleInstance {
  id: string
  type: string
  enabled: boolean
  variant: string
  content: DecorationModuleContent
  layout: DecorationModuleLayout
  source: DecorationModuleSource
  media: DecorationModuleMedia
}

export interface DecorationPageDefinition {
  skeleton: string
  modules: DecorationModuleInstance[]
}

export type DecorationPages = Record<DecorationPageKey, DecorationPageDefinition>

export interface DecorationSkeletonDefinition {
  name: string
  description: string
  recommendedModules: string[]
  minimumModule: string
}

export interface BookingFieldDecoration {
  id: string
  enabled: boolean
  required: boolean
  label: string
  placeholder: string
  icon: string
}

export interface NavigationDecoration {
  portfolioText: string
  galleryText: string
  aboutText: string
  packagesText: string
  bookingText: string
  storesText: string
  style: 'line' | 'quiet'
  items: NavigationItemDecoration[]
}

export type NavigationItemKey = 'portfolio' | 'gallery' | 'about' | 'packages' | 'booking' | 'stores'

export interface NavigationItemDecoration {
  key: NavigationItemKey
  enabled: boolean
}

export const CONFIGURABLE_ICON_NAMES = [
  'briefcase-business',
  'calendar-days',
  'camera',
  'circle-check',
  'clock-3',
  'heart',
  'image',
  'images',
  'mail',
  'map-pin',
  'message-circle',
  'message-square',
  'navigation',
  'palette',
  'phone',
  'sparkles',
  'user-round'
] as const

export interface IconDecoration {
  navigation: {
    portfolio: string
    gallery: string
    about: string
    packages: string
    booking: string
    stores: string
  }
  navigationCustom: {
    portfolio: string
    gallery: string
    about: string
    packages: string
    booking: string
    stores: string
  }
  quickJump: {
    trigger: string
    portfolio: string
    booking: string
  }
  contact: {
    wechat: string
    email: string
    location: string
    phone: string
  }
}

export interface TerminologyDecoration {
  workLabel: string
  packageLabel: string
  consultationLabel: string
  professionalLabel: string
  serviceLabel: string
  customerServiceLabel: string
}

export interface ShowcaseDecoration {
  heroActionText: string
  heroActionTarget: 'gallery' | 'booking'
  galleryTitle: string
  gallerySubtitle: string
  categoryMode: 'top' | 'sidebar'
  galleryColumns: 2 | 3
  showSearch: boolean
  showTags: boolean
  seriesActionText: string
  aboutQuote: string
  aboutGalleryLimit: 6 | 9
}

export interface HomeDecoration {
  skeleton: string
  template: 'editorial-cover' | 'split-catalog' | 'gallery-wall' | 'service-led'
  heroVariant: 'editorial' | 'immersive' | 'compact'
  galleryVariant: 'editorial' | 'masonry' | 'cards' | 'horizontal' | 'mixed'
  galleryColumns: 1 | 2 | 3 | 4
  imageRatio: 'portrait' | 'natural' | 'square'
  cardContent: 'full' | 'compact' | 'image-only' | 'custom'
  showTitle: boolean
  showCategory: boolean
  showDescription: boolean
  galleryGap: 'tight' | 'standard' | 'airy'
  sections: DecorationSection[]
}

export interface AboutDecoration {
  skeleton: string
  headerVariant: 'editorial' | 'portrait' | 'minimal'
  sections: DecorationSection[]
}

export interface BookingDecoration {
  skeleton: string
  headerVariant: 'editorial' | 'image' | 'compact'
  formVariant: 'lines' | 'soft'
  sections: DecorationSection[]
  fields: BookingFieldDecoration[]
}

export interface SectionPageDecoration {
  skeleton: string
  sections: DecorationSection[]
}

export interface PackagesDecoration extends SectionPageDecoration {
  layoutVariant: 'cards' | 'list'
}

export interface PackageDetailDecoration extends SectionPageDecoration {
  layoutVariant: 'editorial' | 'compact'
}

export interface SeriesDecoration extends SectionPageDecoration {
  galleryVariant: 'immersive' | 'framed'
}

export interface SuccessDecoration extends SectionPageDecoration {
  layoutVariant: 'centered' | 'compact'
}

export interface DecorationContent {
  schemaVersion: 3
  framework: FrameworkDecoration
  media: MediaDecoration
  siteTemplate: 'classic' | 'dark-gallery'
  showcase: ShowcaseDecoration
  terminology: TerminologyDecoration
  navigation: NavigationDecoration
  icons: IconDecoration
  pages: DecorationPages
  home: HomeDecoration
  about: AboutDecoration
  booking: BookingDecoration
  packages: PackagesDecoration
  packageDetail: PackageDetailDecoration
  series: SeriesDecoration
  success: SuccessDecoration
}

const section = (
  type: string,
  title = '',
  subtitle = '',
  actionText = '',
  variant = 'default'
): DecorationSection => ({
  id: type,
  type,
  enabled: true,
  icon: '',
  title,
  subtitle,
  actionText,
  variant
})

export const REPEATABLE_MODULE_TYPES = [
  'richText',
  'image',
  'gallery',
  'action',
  'divider',
  'spacer'
] as const

export const UNIQUE_MODULE_TYPES = [
  'hero',
  'categories',
  'shortcuts',
  'portfolio',
  'profile',
  'bio',
  'skills',
  'contact',
  'stores',
  'team',
  'packages',
  'schedule',
  'testimonials',
  'serviceFlow',
  'faq',
  'notice',
  'form',
  'header',
  'list',
  'info',
  'suitable',
  'includes',
  'relatedSeries',
  'summary',
  'content',
  'actions'
] as const

const ALLOWED_MODULE_TYPES = new Set<string>([
  ...UNIQUE_MODULE_TYPES,
  ...REPEATABLE_MODULE_TYPES
])
const REPEATABLE_MODULE_TYPE_SET = new Set<string>(REPEATABLE_MODULE_TYPES)

export const PAGE_SKELETON_REGISTRY: Record<DecorationPageKey, Record<string, DecorationSkeletonDefinition>> = {
  home: {
    'full-image': {
      name: '全屏影像',
      description: '以招牌照片作为第一视觉，再进入分类与精选作品。',
      recommendedModules: ['hero', 'shortcuts', 'categories', 'portfolio', 'testimonials'],
      minimumModule: 'portfolio'
    },
    editorial: {
      name: '编辑画册',
      description: '封面、文字与作品交错排列，适合高定和品牌写真。',
      recommendedModules: ['hero', 'categories', 'portfolio', 'richText', 'testimonials'],
      minimumModule: 'portfolio'
    },
    wall: {
      name: '作品墙',
      description: '减少说明文字，用更密集的作品建立视觉冲击。',
      recommendedModules: ['portfolio', 'categories', 'hero', 'testimonials'],
      minimumModule: 'portfolio'
    },
    conversion: {
      name: '门店转化',
      description: '先展示服务、档期和咨询入口，再展示代表作品。',
      recommendedModules: ['hero', 'packages', 'schedule', 'portfolio', 'testimonials', 'serviceFlow'],
      minimumModule: 'hero'
    }
  },
  gallery: {
    'top-categories': {
      name: '顶部分类',
      description: '分类横向排列，适合分类数量较少的作品库。',
      recommendedModules: ['header', 'categories', 'portfolio'],
      minimumModule: 'portfolio'
    },
    sidebar: {
      name: '侧边目录',
      description: '左侧分类、右侧作品，适合分类较多的门店。',
      recommendedModules: ['header', 'categories', 'portfolio'],
      minimumModule: 'portfolio'
    },
    immersive: {
      name: '沉浸画廊',
      description: '隐藏多余说明，让顾客连续浏览大幅作品。',
      recommendedModules: ['hero', 'portfolio'],
      minimumModule: 'portfolio'
    }
  },
  series: {
    'cinematic-story': {
      name: '电影故事',
      description: '大图开场并穿插系列介绍，适合有故事线的作品。',
      recommendedModules: ['hero', 'profile', 'gallery', 'action'],
      minimumModule: 'gallery'
    },
    continuous: {
      name: '连续长图',
      description: '照片连续通栏展示，减少打断。',
      recommendedModules: ['hero', 'gallery', 'action'],
      minimumModule: 'gallery'
    },
    'editorial-album': {
      name: '编辑画册',
      description: '以留白、文字和组合图片形成画册节奏。',
      recommendedModules: ['hero', 'profile', 'gallery', 'richText', 'packages', 'action'],
      minimumModule: 'gallery'
    }
  },
  about: {
    'portrait-story': {
      name: '人物故事',
      description: '先展示主理人，再介绍理念与团队。',
      recommendedModules: ['profile', 'bio', 'skills', 'team', 'testimonials', 'contact'],
      minimumModule: 'profile'
    },
    'brand-studio': {
      name: '品牌工作室',
      description: '突出品牌理念、代表作品和专业团队。',
      recommendedModules: ['profile', 'bio', 'gallery', 'team', 'serviceFlow', 'contact'],
      minimumModule: 'profile'
    },
    'store-service': {
      name: '门店服务',
      description: '先说明服务能力，再展示门店和联系入口。',
      recommendedModules: ['profile', 'packages', 'serviceFlow', 'stores', 'contact', 'faq'],
      minimumModule: 'profile'
    }
  },
  packages: {
    'premium-cards': {
      name: '高定卡片',
      description: '以大卡片呈现每个服务方案和价格。',
      recommendedModules: ['header', 'list', 'testimonials'],
      minimumModule: 'list'
    },
    'price-catalog': {
      name: '价格目录',
      description: '紧凑列出套餐，方便顾客快速比较价格。',
      recommendedModules: ['header', 'schedule', 'list'],
      minimumModule: 'list'
    },
    comparison: {
      name: '服务对比',
      description: '强调不同套餐包含内容和适用人群。',
      recommendedModules: ['header', 'list', 'richText', 'faq'],
      minimumModule: 'list'
    }
  },
  packageDetail: {
    'editorial-detail': {
      name: '编辑详情',
      description: '完整展示套餐介绍、适合人群和服务内容。',
      recommendedModules: ['hero', 'info', 'suitable', 'includes', 'relatedSeries', 'team', 'testimonials', 'action'],
      minimumModule: 'info'
    },
    'compact-conversion': {
      name: '紧凑转化',
      description: '优先显示价格、核心服务和咨询入口。',
      recommendedModules: ['hero', 'info', 'includes', 'action', 'relatedSeries', 'faq'],
      minimumModule: 'info'
    }
  },
  booking: {
    'form-first': {
      name: '表单优先',
      description: '顾客进入页面后直接填写需求。',
      recommendedModules: ['notice', 'form', 'schedule', 'faq'],
      minimumModule: 'form'
    },
    'package-guided': {
      name: '套餐引导',
      description: '先了解套餐与档期，再填写咨询需求。',
      recommendedModules: ['hero', 'packages', 'schedule', 'form', 'faq'],
      minimumModule: 'form'
    },
    'minimal-contact': {
      name: '极简联系',
      description: '保留必要字段和联系入口，操作更短。',
      recommendedModules: ['hero', 'form', 'contact'],
      minimumModule: 'form'
    }
  },
  stores: {
    'location-list': {
      name: '地点列表',
      description: '适合展示一个或多个门店地址与营业时间。',
      recommendedModules: ['header', 'stores', 'contact'],
      minimumModule: 'stores'
    },
    'studio-profile': {
      name: '工作室介绍',
      description: '先介绍空间与服务，再展示地址和导航。',
      recommendedModules: ['hero', 'richText', 'gallery', 'stores', 'contact'],
      minimumModule: 'stores'
    }
  },
  success: {
    'centered-result': {
      name: '居中结果',
      description: '突出咨询已生成和下一步操作。',
      recommendedModules: ['hero', 'summary', 'content', 'contact', 'actions'],
      minimumModule: 'hero'
    },
    'compact-contact': {
      name: '紧凑联系',
      description: '以清单展示咨询摘要和客服入口。',
      recommendedModules: ['summary', 'content', 'actions', 'contact'],
      minimumModule: 'summary'
    }
  }
}

export const FRAMEWORK_SKELETON_PRESETS: Record<DecorationFrameworkId, Record<DecorationPageKey, string>> = {
  'legacy-classic': {
    home: 'full-image', gallery: 'top-categories', series: 'cinematic-story', about: 'portrait-story',
    packages: 'premium-cards', packageDetail: 'editorial-detail', booking: 'form-first',
    stores: 'location-list', success: 'centered-result'
  },
  'cinematic-gallery': {
    home: 'full-image', gallery: 'sidebar', series: 'continuous', about: 'brand-studio',
    packages: 'price-catalog', packageDetail: 'editorial-detail', booking: 'minimal-contact',
    stores: 'studio-profile', success: 'centered-result'
  },
  'editorial-journal': {
    home: 'editorial', gallery: 'top-categories', series: 'editorial-album', about: 'portrait-story',
    packages: 'premium-cards', packageDetail: 'editorial-detail', booking: 'package-guided',
    stores: 'studio-profile', success: 'centered-result'
  },
  'atelier-conversion': {
    home: 'conversion', gallery: 'top-categories', series: 'cinematic-story', about: 'store-service',
    packages: 'comparison', packageDetail: 'compact-conversion', booking: 'form-first',
    stores: 'location-list', success: 'compact-contact'
  }
}

let decorationModuleSequence = 0

function nextDecorationModuleId(pageKey: DecorationPageKey, type: string): string {
  decorationModuleSequence += 1
  return `module-${pageKey}-${type}-${Date.now().toString(36)}-${decorationModuleSequence.toString(36)}`
}

type DecorationModuleOverrides = Partial<Omit<DecorationModuleInstance, 'content' | 'layout' | 'source' | 'media'>> & {
  content?: Partial<DecorationModuleContent>
  layout?: Partial<DecorationModuleLayout>
  source?: Partial<DecorationModuleSource>
  media?: Partial<DecorationModuleMedia>
}

export function createDecorationModule(
  pageKey: DecorationPageKey,
  type: string,
  overrides: DecorationModuleOverrides = {}
): DecorationModuleInstance {
  const columns = [1, 2, 3, 4].includes(Number(overrides.layout?.columns))
    ? Number(overrides.layout?.columns) as 1 | 2 | 3 | 4
    : 2
  const showText = columns === 4 ? false : overrides.layout?.showText !== false

  return {
    id: String(overrides.id || nextDecorationModuleId(pageKey, type)),
    type,
    enabled: overrides.enabled !== false,
    variant: String(overrides.variant || 'default'),
    content: {
      title: '',
      subtitle: '',
      body: '',
      actionText: '',
      actionTarget: '',
      icon: '',
      showTitle: showText,
      showCategory: showText,
      showDescription: false,
      ...(overrides.content || {})
    },
    layout: {
      mode: 'grid',
      ratio: 'natural',
      gap: 'standard',
      ...(overrides.layout || {}),
      columns,
      showText
    },
    source: {
      mode: 'auto',
      seriesIds: [],
      photos: [],
      limit: 12,
      ...(overrides.source || {})
    },
    media: {
      ratio: 'natural',
      overlay: 42,
      brightness: 0,
      focusX: 50,
      focusY: 50,
      ...(overrides.media || {})
    }
  }
}

const field = (
  id: string,
  label: string,
  placeholder: string,
  icon: string,
  required = false
): BookingFieldDecoration => ({
  id,
  enabled: true,
  required,
  label,
  placeholder,
  icon
})

export const DEFAULT_DECORATION: DecorationContent = {
  schemaVersion: 3,
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
  pages: {} as DecorationPages,
  home: {
    skeleton: 'full-image',
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
      section('hero'),
      section('shortcuts', '快捷入口', '快速查看档期和客户评价'),
      section('categories'),
      section('portfolio', '作品精选', '点击作品，查看完整系列'),
      section('packages', '拍摄方案', '先了解服务内容，再选择适合你的方案', '查看全部', 'strip'),
      section('schedule', '近期档期', '', '咨询档期', 'notice'),
      section('testimonials', '客户反馈', '', '', 'quotes'),
      section('serviceFlow', '服务流程', '从沟通到交付，每一步都清晰', '', 'steps')
    ]
  },
  about: {
    skeleton: 'portrait-story',
    headerVariant: 'editorial',
    sections: [
      section('profile'),
      section('bio', '关于我们'),
      section('skills', '擅长风格'),
      section('contact', '联系门店'),
      section('stores', '门店信息'),
      section('team', '服务团队'),
      section('packages', '服务价格', '', '咨询'),
      section('serviceFlow', '服务流程'),
      section('faq', '常见问题'),
      section('testimonials', '客户评价')
    ]
  },
  booking: {
    skeleton: 'form-first',
    headerVariant: 'editorial',
    formVariant: 'lines',
    sections: [
      section('hero'),
      section('notice', '预约说明'),
      section('schedule', '近期档期'),
      section('form', '告诉我们你的拍摄需求', '填写后会生成一段咨询内容，不会自动提交个人信息', '生成咨询内容'),
      section('serviceFlow', '服务流程'),
      section('faq', '常见问题')
    ],
    fields: [
      field('name', '您的称呼', '怎么称呼您？', 'user-round', true),
      field('contact', '联系方式', '手机号或微信号，方便客服联系您', 'phone', true),
      field('style', '心仪风格', '请选择风格', 'palette', true),
      field('package', '意向套餐', '暂不选择套餐', 'briefcase-business'),
      field('date', '期望拍摄日期', '请选择日期', 'calendar-days', true),
      field('store', '意向门店', '暂不选择门店', 'map-pin'),
      field('photographer', '意向摄影师', '暂不选择摄影师', 'camera'),
      field('notes', '备注说明', '人数、场景、服装、预算或其他需要提前沟通的信息', 'message-square')
    ]
  },
  packages: {
    skeleton: 'premium-cards',
    layoutVariant: 'cards',
    sections: [
      section('header', '服务套餐', '了解价格范围和服务内容，再联系客服确认适合你的方案。'),
      section('schedule', '近期档期'),
      section('list'),
      section('testimonials', '客户评价', '来自真实服务体验的反馈')
    ]
  },
  packageDetail: {
    skeleton: 'editorial-detail',
    layoutVariant: 'editorial',
    sections: [
      section('hero', '服务方案'),
      section('info', '套餐信息'),
      section('suitable', '适合'),
      section('includes', '包含服务'),
      section('relatedSeries', '相关作品'),
      section('team', '服务团队'),
      section('testimonials', '客户评价'),
      section('serviceFlow', '服务流程'),
      section('faq', '常见问题')
    ]
  },
  series: {
    skeleton: 'cinematic-story',
    galleryVariant: 'immersive',
    sections: [
      section('hero'),
      section('profile'),
      section('gallery'),
      section('packages', '相关套餐'),
      section('team', '服务团队'),
      section('testimonials', '客户评价'),
      section('action', '', '', '咨询同款风格')
    ]
  },
  success: {
    skeleton: 'centered-result',
    layoutVariant: 'centered',
    sections: [
      section('hero', '咨询内容已生成', '请复制并发送给客服。最终日期和服务方案以双方沟通确认为准。'),
      section('summary', '咨询摘要'),
      section('content', '完整咨询内容'),
      section('contact', '客服微信'),
      section('actions', '', '', '复制咨询内容')
    ]
  }
}

function moduleFromLegacySection(
  pageKey: DecorationPageKey,
  item: Partial<DecorationSection>,
  index: number,
  deterministicId = false
): DecorationModuleInstance {
  const type = String(item.type || item.id || '').trim()
  const ratio = pageKey === 'home' && type === 'portfolio' ? '3:4' : 'natural'
  return createDecorationModule(pageKey, type, {
    id: deterministicId ? `legacy-${pageKey}-${type}-${index + 1}` : undefined,
    enabled: item.enabled !== false,
    variant: String(item.variant || 'default'),
    content: {
      title: String(item.title || ''),
      subtitle: String(item.subtitle || ''),
      actionText: String(item.actionText || ''),
      icon: String(item.icon || '')
    },
    layout: { ratio },
    media: { ratio }
  })
}

function createPageFromSections(
  pageKey: DecorationPageKey,
  skeleton: string,
  sections: DecorationSection[]
): DecorationPageDefinition {
  return {
    skeleton,
    modules: sections.map((item, index) => moduleFromLegacySection(pageKey, item, index, true))
  }
}

function createDefaultDecorationPages(): DecorationPages {
  return {
    home: createPageFromSections('home', 'full-image', DEFAULT_DECORATION.home.sections),
    gallery: createPageFromSections('gallery', 'top-categories', [
      section('header', '作品欣赏'),
      section('categories'),
      section('portfolio')
    ]),
    series: createPageFromSections('series', 'cinematic-story', DEFAULT_DECORATION.series.sections),
    about: createPageFromSections('about', 'portrait-story', DEFAULT_DECORATION.about.sections),
    packages: createPageFromSections('packages', 'premium-cards', DEFAULT_DECORATION.packages.sections),
    packageDetail: createPageFromSections('packageDetail', 'editorial-detail', DEFAULT_DECORATION.packageDetail.sections),
    booking: createPageFromSections('booking', 'form-first', DEFAULT_DECORATION.booking.sections),
    stores: createPageFromSections('stores', 'location-list', [
      section('header', '门店信息'),
      section('stores', '门店地址'),
      section('contact', '联系门店')
    ]),
    success: createPageFromSections('success', 'centered-result', DEFAULT_DECORATION.success.sections)
  }
}

DEFAULT_DECORATION.pages = createDefaultDecorationPages()

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

const configurableIconNames = new Set<string>(CONFIGURABLE_ICON_NAMES)

export function normalizeConfigurableIcon(
  value: unknown,
  fallback: string,
  allowEmpty = false
): string {
  const icon = String(value ?? '').trim()
  if (allowEmpty && !icon) return ''
  return configurableIconNames.has(icon) ? icon : fallback
}

function normalizeCustomIconPath(value: unknown): string {
  const iconPath = String(value ?? '').trim()
  if (!iconPath) return ''
  if (/^https?:\/\/[^\s]+$/i.test(iconPath)) return iconPath
  return /^icon\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.png$/i.test(iconPath) ? iconPath : ''
}

function normalizeSections(
  sections: unknown,
  defaults: DecorationSection[]
): DecorationSection[] {
  if (!Array.isArray(sections)) return clone(defaults)

  const defaultsByType = new Map(defaults.map(item => [item.type, item]))
  const seen = new Set<string>()
  const normalized: DecorationSection[] = []

  sections.forEach(rawItem => {
    if (!rawItem || typeof rawItem !== 'object') return
    const item = rawItem as Partial<DecorationSection>
    const type = String(item.type || item.id || '').trim()
    const fallback = defaultsByType.get(type)
    if (!fallback || seen.has(type)) return

    seen.add(type)
    normalized.push({
      ...clone(fallback),
      ...item,
      id: type,
      type,
      enabled: item.enabled !== false,
      icon: normalizeConfigurableIcon(item.icon, fallback.icon, true),
      title: String(item.title ?? fallback.title),
      subtitle: String(item.subtitle ?? fallback.subtitle),
      actionText: String(item.actionText ?? fallback.actionText),
      variant: String(item.variant ?? fallback.variant)
    })
  })

  defaults.forEach(item => {
    if (seen.has(item.type)) return
    if (item.type === 'shortcuts') {
      const heroIndex = normalized.findIndex(entry => entry.type === 'hero')
      normalized.splice(heroIndex >= 0 ? heroIndex + 1 : 0, 0, clone(item))
      return
    }
    normalized.push(clone(item))
  })

  return [
    ...normalized.filter(item => item.enabled !== false),
    ...normalized.filter(item => item.enabled === false)
  ]
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(max, Math.max(min, numeric))
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.map(item => String(item || '').trim()).filter(Boolean)))
}

function normalizePhotoReferences(value: unknown): DecorationPhotoReference[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const photos: DecorationPhotoReference[] = []

  value.forEach(rawItem => {
    if (!rawItem || typeof rawItem !== 'object') return
    const item = rawItem as Partial<DecorationPhotoReference>
    const seriesId = String(item.seriesId || '').trim()
    const photoName = String(item.photoName || '').trim()
    if (!seriesId || !photoName || /[?&]|:\/\//.test(photoName)) return
    const key = `${seriesId}\u0000${photoName}`
    if (seen.has(key)) return
    seen.add(key)
    photos.push({ seriesId, photoName })
  })

  return photos
}

function getDefaultModule(pageKey: DecorationPageKey, type: string): DecorationModuleInstance | undefined {
  return DEFAULT_DECORATION.pages[pageKey]?.modules.find(item => item.type === type)
}

function normalizeDecorationModule(
  rawItem: unknown,
  pageKey: DecorationPageKey,
  fallbackIndex: number
): DecorationModuleInstance | null {
  if (!rawItem || typeof rawItem !== 'object') return null
  const raw = rawItem as Partial<DecorationModuleInstance> & Partial<DecorationSection>
  const type = String(raw.type || '').trim()
  if (!ALLOWED_MODULE_TYPES.has(type)) return null

  const fallback = getDefaultModule(pageKey, type)
    || createDecorationModule(pageKey, type, { id: `fallback-${pageKey}-${type}` })
  const rawContent = raw.content && typeof raw.content === 'object'
    ? raw.content as Partial<DecorationModuleContent>
    : {}
  const rawLayout = raw.layout && typeof raw.layout === 'object'
    ? raw.layout as Partial<DecorationModuleLayout>
    : {}
  const rawSource = raw.source && typeof raw.source === 'object'
    ? raw.source as Partial<DecorationModuleSource>
    : {}
  const rawMedia = raw.media && typeof raw.media === 'object'
    ? raw.media as Partial<DecorationModuleMedia>
    : {}
  const columns = pick(
    Number(rawLayout.columns) as 1 | 2 | 3 | 4,
    [1, 2, 3, 4] as const,
    fallback.layout.columns
  )
  const showText = columns === 4
    ? false
    : typeof rawLayout.showText === 'boolean'
      ? rawLayout.showText
      : fallback.layout.showText
  const ratio = pick(
    rawLayout.ratio,
    ['natural', '1:1', '3:4', '4:5', '16:9'] as const,
    fallback.layout.ratio
  )
  const mediaRatio = pick(
    rawMedia.ratio,
    ['natural', '1:1', '3:4', '4:5', '16:9'] as const,
    ratio
  )
  const sourceMode = pick(
    rawSource.mode,
    ['auto', 'series', 'photos'] as const,
    fallback.source.mode
  )
  const rawLegacy = raw as Partial<DecorationSection>

  const rawId = String(raw.id || '').trim()
  const id = /^[A-Za-z0-9_-]+$/.test(rawId)
    ? rawId
    : `module-${pageKey}-${type}-${fallbackIndex + 1}`

  return {
    id,
    type,
    enabled: raw.enabled !== false,
    variant: String(raw.variant || fallback.variant || 'default'),
    content: {
      title: String(rawContent.title ?? rawLegacy.title ?? fallback.content.title),
      subtitle: String(rawContent.subtitle ?? rawLegacy.subtitle ?? fallback.content.subtitle),
      body: String(rawContent.body ?? fallback.content.body),
      actionText: String(rawContent.actionText ?? rawLegacy.actionText ?? fallback.content.actionText),
      actionTarget: String(rawContent.actionTarget ?? fallback.content.actionTarget),
      icon: normalizeConfigurableIcon(
        rawContent.icon ?? rawLegacy.icon,
        fallback.content.icon,
        true
      ),
      showTitle: columns === 4 ? false : rawContent.showTitle !== false,
      showCategory: columns === 4 ? false : rawContent.showCategory !== false,
      showDescription: columns === 4 ? false : rawContent.showDescription === true
    },
    layout: {
      mode: pick(
        rawLayout.mode,
        ['grid', 'masonry', 'horizontal', 'mixed', 'stack'] as const,
        fallback.layout.mode
      ),
      columns,
      ratio,
      gap: pick(rawLayout.gap, ['tight', 'standard', 'airy'] as const, fallback.layout.gap),
      showText
    },
    source: {
      mode: sourceMode,
      seriesIds: normalizeStringList(rawSource.seriesIds),
      photos: normalizePhotoReferences(rawSource.photos),
      limit: Math.round(clampNumber(rawSource.limit, 1, 100, fallback.source.limit))
    },
    media: {
      ratio: mediaRatio,
      overlay: clampNumber(rawMedia.overlay, 0, 80, fallback.media.overlay),
      brightness: clampNumber(rawMedia.brightness, -40, 40, fallback.media.brightness),
      focusX: clampNumber(rawMedia.focusX, 0, 100, fallback.media.focusX),
      focusY: clampNumber(rawMedia.focusY, 0, 100, fallback.media.focusY)
    }
  }
}

function getDefaultSkeleton(pageKey: DecorationPageKey): string {
  return Object.keys(PAGE_SKELETON_REGISTRY[pageKey])[0]
}

function normalizeSkeleton(pageKey: DecorationPageKey, value: unknown): string {
  const skeleton = String(value || '')
  return PAGE_SKELETON_REGISTRY[pageKey][skeleton] ? skeleton : getDefaultSkeleton(pageKey)
}

function createMinimumPage(pageKey: DecorationPageKey, skeleton: string): DecorationPageDefinition {
  const resolvedSkeleton = normalizeSkeleton(pageKey, skeleton)
  const minimumType = PAGE_SKELETON_REGISTRY[pageKey][resolvedSkeleton].minimumModule
  return {
    skeleton: resolvedSkeleton,
    modules: [createDecorationModule(pageKey, minimumType)]
  }
}

function normalizeV3Page(rawPage: unknown, pageKey: DecorationPageKey): DecorationPageDefinition {
  if (rawPage === undefined || rawPage === null) return createMinimumPage(pageKey, getDefaultSkeleton(pageKey))
  if (typeof rawPage !== 'object') return createMinimumPage(pageKey, getDefaultSkeleton(pageKey))
  const page = rawPage as Partial<DecorationPageDefinition>
  const skeleton = normalizeSkeleton(pageKey, page.skeleton)
  const seenUniqueTypes = new Set<string>()
  const modules = Array.isArray(page.modules)
    ? page.modules
      .map((item, index) => normalizeDecorationModule(item, pageKey, index))
      .filter((item): item is DecorationModuleInstance => Boolean(item))
      .filter(item => {
        if (REPEATABLE_MODULE_TYPE_SET.has(item.type)) return true
        if (seenUniqueTypes.has(item.type)) return false
        seenUniqueTypes.add(item.type)
        return true
      })
    : []

  if (!modules.length) return createMinimumPage(pageKey, skeleton)

  const usedIds = new Set<string>()
  modules.forEach(item => {
    if (!item.id || usedIds.has(item.id)) item.id = nextDecorationModuleId(pageKey, item.type)
    usedIds.add(item.id)
  })
  if (!modules.some(item => item.enabled)) modules[0].enabled = true
  return { skeleton, modules }
}

const HOME_TEMPLATE_SKELETONS: Record<string, string> = {
  'editorial-cover': 'full-image',
  'split-catalog': 'editorial',
  'gallery-wall': 'wall',
  'service-led': 'conversion'
}

function getLegacySkeleton(pageKey: DecorationPageKey, input: Record<string, any>): string {
  if (pageKey === 'home') return HOME_TEMPLATE_SKELETONS[input.home?.template] || 'full-image'
  if (pageKey === 'gallery') {
    if (input.siteTemplate === 'dark-gallery' && input.showcase?.categoryMode === 'sidebar') return 'sidebar'
    return input.showcase?.categoryMode === 'sidebar' ? 'sidebar' : 'top-categories'
  }
  if (pageKey === 'series') return input.series?.galleryVariant === 'framed' ? 'editorial-album' : 'cinematic-story'
  if (pageKey === 'about') {
    return input.about?.headerVariant === 'portrait' ? 'portrait-story' : 'brand-studio'
  }
  if (pageKey === 'packages') return input.packages?.layoutVariant === 'list' ? 'price-catalog' : 'premium-cards'
  if (pageKey === 'packageDetail') return input.packageDetail?.layoutVariant === 'compact' ? 'compact-conversion' : 'editorial-detail'
  if (pageKey === 'booking') return input.booking?.formVariant === 'soft' ? 'package-guided' : 'form-first'
  if (pageKey === 'stores') return 'location-list'
  return input.success?.layoutVariant === 'compact' ? 'compact-contact' : 'centered-result'
}

function migrateLegacyPage(
  pageKey: DecorationPageKey,
  input: Record<string, any>,
  normalizedLegacy: Record<string, any>
): DecorationPageDefinition {
  const skeleton = normalizeSkeleton(pageKey, getLegacySkeleton(pageKey, input))
  let rawSections: unknown = input[pageKey]?.sections
  if (!Array.isArray(rawSections)) {
    rawSections = pageKey === 'gallery' || pageKey === 'stores'
      ? DEFAULT_DECORATION.pages[pageKey].modules.map(item => ({
        id: item.type,
        type: item.type,
        enabled: item.enabled,
        title: item.content.title,
        subtitle: item.content.subtitle,
        actionText: item.content.actionText,
        icon: item.content.icon,
        variant: item.variant
      }))
      : normalizedLegacy[pageKey]?.sections
  }
  const modules = Array.isArray(rawSections)
    ? rawSections
      .map((item, index) => {
        const module = normalizeDecorationModule(item, pageKey, index)
        if (module) module.id = `legacy-${pageKey}-${module.type}-${index + 1}`
        return module
      })
      .filter((item): item is DecorationModuleInstance => Boolean(item))
    : []
  if (!modules.length) return createMinimumPage(pageKey, skeleton)

  const portfolioModule = modules.find(item => item.type === 'portfolio' || item.type === 'gallery')
  if (pageKey === 'home' && portfolioModule) {
    const legacyHome = input.home || {}
    const columns = [1, 2, 3, 4].includes(Number(legacyHome.galleryColumns))
      ? Number(legacyHome.galleryColumns) as 1 | 2 | 3 | 4
      : portfolioModule.layout.columns
    const modeMap: Record<string, DecorationModuleLayoutMode> = {
      editorial: 'grid', cards: 'grid', masonry: 'masonry', horizontal: 'horizontal', mixed: 'mixed'
    }
    const ratioMap: Record<string, DecorationImageRatio> = {
      portrait: '3:4', square: '1:1', natural: 'natural'
    }
    const showText = columns === 4 || legacyHome.cardContent === 'image-only' ? false : true
    portfolioModule.layout = {
      ...portfolioModule.layout,
      mode: modeMap[legacyHome.galleryVariant] || portfolioModule.layout.mode,
      columns,
      ratio: ratioMap[legacyHome.imageRatio] || portfolioModule.layout.ratio,
      gap: pick(legacyHome.galleryGap, ['tight', 'standard', 'airy'] as const, portfolioModule.layout.gap),
      showText
    }
    portfolioModule.media.ratio = portfolioModule.layout.ratio
    portfolioModule.content.showTitle = showText && legacyHome.showTitle !== false
    portfolioModule.content.showCategory = showText && legacyHome.showCategory !== false
    portfolioModule.content.showDescription = showText && legacyHome.showDescription === true
  }
  if (pageKey === 'gallery' && portfolioModule) {
    portfolioModule.layout.columns = pick(
      Number(input.showcase?.galleryColumns) as 2 | 3,
      [2, 3] as const,
      portfolioModule.layout.columns === 3 ? 3 : 2
    )
  }
  if (!modules.some(item => item.enabled)) modules[0].enabled = true
  return { skeleton, modules }
}

function normalizeDecorationPages(
  input: Record<string, any>,
  normalizedLegacy: Record<string, any>
): DecorationPages {
  const hasV3Pages = Number(input.schemaVersion) >= 3 && input.pages && typeof input.pages === 'object'
  const pageKeys = Object.keys(PAGE_SKELETON_REGISTRY) as DecorationPageKey[]
  return pageKeys.reduce((result, pageKey) => {
    result[pageKey] = hasV3Pages
      ? normalizeV3Page(input.pages[pageKey], pageKey)
      : migrateLegacyPage(pageKey, input, normalizedLegacy)
    return result
  }, {} as DecorationPages)
}

function modulesToSections(modules: DecorationModuleInstance[]): DecorationSection[] {
  return modules.map(module => ({
    id: module.id,
    type: module.type,
    enabled: module.enabled,
    icon: module.content.icon,
    title: module.content.title,
    subtitle: module.content.subtitle,
    actionText: module.content.actionText,
    variant: module.variant,
    content: module.content,
    layout: module.layout,
    source: module.source,
    media: module.media,
    mediaStyle: `object-position: ${module.media.focusX}% ${module.media.focusY}%; filter: brightness(${100 + module.media.brightness}%);`,
    mediaRatioClass: module.media.ratio.replace(':', '-'),
    overlayStyle: `opacity: ${module.media.overlay / 100};`,
    layoutClass: `mode-${module.layout.mode} columns-${module.layout.columns} ratio-${module.layout.ratio.replace(':', '-') } gap-${module.layout.gap} ${module.layout.showText ? 'show-text' : 'image-only'}`
  } as DecorationSection))
}

export function applyPageSkeleton(
  page: DecorationPageDefinition,
  pageKey: DecorationPageKey,
  skeleton: string
): DecorationPageDefinition {
  const resolvedSkeleton = normalizeSkeleton(pageKey, skeleton)
  const definition = PAGE_SKELETON_REGISTRY[pageKey][resolvedSkeleton]
  const normalizedPage = normalizeV3Page(page, pageKey)
  const remaining = normalizedPage.modules.slice()
  const ordered: DecorationModuleInstance[] = []

  definition.recommendedModules.forEach(type => {
    const index = remaining.findIndex(item => item.type === type)
    if (index >= 0) {
      ordered.push(remaining.splice(index, 1)[0])
    } else {
      ordered.push(createDecorationModule(pageKey, type))
    }
  })
  ordered.push(...remaining)
  if (!ordered.some(item => item.enabled)) ordered[0].enabled = true
  return { skeleton: resolvedSkeleton, modules: ordered }
}

export function validateNavigationLabels(value: Partial<NavigationDecoration> | null | undefined): string[] {
  const navigation = value || {}
  const labels: Array<[keyof NavigationDecoration, string]> = [
    ['portfolioText', '首页入口'],
    ['galleryText', '作品入口'],
    ['aboutText', '简介入口'],
    ['packagesText', '套餐入口'],
    ['bookingText', '咨询入口'],
    ['storesText', '门店入口']
  ]
  return labels.flatMap(([key, label]) => {
    const text = String(navigation[key] || '').trim()
    return Array.from(text).length > 6 ? [`${label}文字最多 6 个中文字符`] : []
  })
}

function normalizeFields(
  fields: unknown,
  defaults: BookingFieldDecoration[]
): BookingFieldDecoration[] {
  if (!Array.isArray(fields)) return clone(defaults)

  const defaultsById = new Map(defaults.map(item => [item.id, item]))
  const seen = new Set<string>()
  const normalized: BookingFieldDecoration[] = []

  fields.forEach(rawItem => {
    if (!rawItem || typeof rawItem !== 'object') return
    const item = rawItem as Partial<BookingFieldDecoration>
    const id = String(item.id || '').trim()
    const fallback = defaultsById.get(id)
    if (!fallback || seen.has(id)) return

    seen.add(id)
    normalized.push({
      ...clone(fallback),
      ...item,
      id,
      enabled: item.enabled !== false,
      required: item.required === true,
      label: String(item.label ?? fallback.label),
      placeholder: String(item.placeholder ?? fallback.placeholder),
      icon: normalizeConfigurableIcon(item.icon, fallback.icon)
    })
  })

  defaults.forEach(item => {
    if (!seen.has(item.id)) normalized.push(clone(item))
  })

  return normalized
}

function pick<T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback
}

const NAVIGATION_ITEM_KEYS: readonly NavigationItemKey[] = ['portfolio', 'gallery', 'about', 'packages', 'booking', 'stores']

function normalizeNavigationItems(value: unknown): NavigationItemDecoration[] {
  if (!Array.isArray(value)) return clone(DEFAULT_DECORATION.navigation.items)

  const defaults = new Map(DEFAULT_DECORATION.navigation.items.map(item => [item.key, item]))
  const seen = new Set<NavigationItemKey>()
  const normalized: NavigationItemDecoration[] = []

  value.forEach(rawItem => {
    if (!rawItem || typeof rawItem !== 'object') return
    const item = rawItem as Partial<NavigationItemDecoration>
    const key = String(item.key || '') as NavigationItemKey
    if (!NAVIGATION_ITEM_KEYS.includes(key) || seen.has(key)) return
    seen.add(key)
    normalized.push({ key, enabled: item.enabled !== false })
  })

  NAVIGATION_ITEM_KEYS.forEach(key => {
    if (seen.has(key)) return
    const fallback = defaults.get(key)
    normalized.push({ key, enabled: value.length ? false : fallback?.enabled !== false })
  })

  while (normalized.filter(item => item.enabled).length < 2) {
    const next = normalized.find(item => !item.enabled)
    if (!next) break
    next.enabled = true
  }

  let enabledCount = 0
  normalized.forEach(item => {
    if (!item.enabled) return
    enabledCount += 1
    if (enabledCount > 5) item.enabled = false
  })

  return [
    ...normalized.filter(item => item.enabled),
    ...normalized.filter(item => !item.enabled)
  ]
}

function projectPagesToLegacy(
  pages: DecorationPages,
  legacy: Omit<DecorationContent, 'pages'> & { pages?: DecorationPages }
): Omit<DecorationContent, 'pages' | 'schemaVersion'> {
  const homeModule = pages.home.modules.find(item => item.type === 'portfolio' || item.type === 'gallery')
  const homeLayout = homeModule?.layout
  const homeContent = homeModule?.content
  const homeColumns = homeLayout?.columns || legacy.home.galleryColumns
  const homeTemplateBySkeleton: Record<string, HomeDecoration['template']> = {
    'full-image': 'editorial-cover',
    editorial: 'split-catalog',
    wall: 'gallery-wall',
    conversion: 'service-led'
  }
  const homeRatio: HomeDecoration['imageRatio'] = homeLayout?.ratio === '1:1'
    ? 'square'
    : homeLayout?.ratio === '3:4' || homeLayout?.ratio === '4:5'
      ? 'portrait'
      : 'natural'
  const homeGalleryVariant: HomeDecoration['galleryVariant'] = homeLayout?.mode === 'masonry'
    ? 'masonry'
    : homeLayout?.mode === 'horizontal'
      ? 'horizontal'
      : homeLayout?.mode === 'mixed'
        ? 'mixed'
        : pages.home.skeleton === 'conversion'
          ? 'cards'
          : 'editorial'
  const showText = homeColumns === 4 ? false : homeLayout?.showText !== false
  const showTitle = showText && homeContent?.showTitle !== false
  const showCategory = showText && homeContent?.showCategory !== false
  const showDescription = showText && homeContent?.showDescription === true
  const homeCardContent: HomeDecoration['cardContent'] = !showText
    ? 'image-only'
    : showTitle && showCategory && showDescription
      ? 'full'
      : showTitle && showCategory && !showDescription
        ? 'compact'
        : 'custom'
  const gallerySkeleton = pages.gallery.skeleton

  return {
    ...legacy,
    showcase: {
      ...legacy.showcase,
      categoryMode: gallerySkeleton === 'sidebar' ? 'sidebar' : 'top',
      galleryColumns: Math.min(3, Math.max(2,
        pages.gallery.modules.find(item => item.type === 'portfolio')?.layout.columns || legacy.showcase.galleryColumns
      )) as 2 | 3
    },
    home: {
      ...legacy.home,
      skeleton: pages.home.skeleton,
      template: homeTemplateBySkeleton[pages.home.skeleton] || legacy.home.template,
      heroVariant: pages.home.skeleton === 'full-image' ? 'immersive' : pages.home.skeleton === 'conversion' ? 'compact' : 'editorial',
      galleryVariant: homeGalleryVariant,
      galleryColumns: homeColumns,
      imageRatio: homeRatio,
      cardContent: homeCardContent,
      showTitle,
      showCategory,
      showDescription,
      galleryGap: homeLayout?.gap || legacy.home.galleryGap,
      sections: modulesToSections(pages.home.modules)
    },
    about: {
      ...legacy.about,
      skeleton: pages.about.skeleton,
      headerVariant: pages.about.skeleton === 'portrait-story'
        ? 'portrait'
        : pages.about.skeleton === 'store-service'
          ? 'minimal'
          : 'editorial',
      sections: modulesToSections(pages.about.modules)
    },
    booking: {
      ...legacy.booking,
      skeleton: pages.booking.skeleton,
      headerVariant: pages.booking.skeleton === 'package-guided'
        ? 'image'
        : pages.booking.skeleton === 'minimal-contact'
          ? 'compact'
          : 'editorial',
      formVariant: pages.booking.skeleton === 'package-guided' ? 'soft' : 'lines',
      sections: modulesToSections(pages.booking.modules)
    },
    packages: {
      ...legacy.packages,
      skeleton: pages.packages.skeleton,
      layoutVariant: pages.packages.skeleton === 'premium-cards' ? 'cards' : 'list',
      sections: modulesToSections(pages.packages.modules)
    },
    packageDetail: {
      ...legacy.packageDetail,
      skeleton: pages.packageDetail.skeleton,
      layoutVariant: pages.packageDetail.skeleton === 'compact-conversion' ? 'compact' : 'editorial',
      sections: modulesToSections(pages.packageDetail.modules)
    },
    series: {
      ...legacy.series,
      skeleton: pages.series.skeleton,
      galleryVariant: pages.series.skeleton === 'editorial-album' ? 'framed' : 'immersive',
      sections: modulesToSections(pages.series.modules)
    },
    success: {
      ...legacy.success,
      skeleton: pages.success.skeleton,
      layoutVariant: pages.success.skeleton === 'compact-contact' ? 'compact' : 'centered',
      sections: modulesToSections(pages.success.modules)
    }
  }
}

export function normalizeDecoration(value?: Partial<DecorationContent> | null): DecorationContent {
  const input = (value || {}) as Partial<DecorationContent> & Record<string, any>
  const framework: Partial<FrameworkDecoration> = input.framework || {}
  const media: Partial<MediaDecoration> = input.media || {}
  const terminology: Partial<TerminologyDecoration> = input.terminology || {}
  const navigation: Partial<NavigationDecoration> = input.navigation || {}
  const icons: Partial<IconDecoration> = input.icons || {}
  const navigationIcons: Partial<IconDecoration['navigation']> = icons.navigation || {}
  const customNavigationIcons: Partial<IconDecoration['navigationCustom']> = icons.navigationCustom || {}
  const quickJumpIcons: Partial<IconDecoration['quickJump']> = icons.quickJump || {}
  const contactIcons: Partial<IconDecoration['contact']> = icons.contact || {}
  const home: Partial<HomeDecoration> = input.home || {}
  const about: Partial<AboutDecoration> = input.about || {}
  const booking: Partial<BookingDecoration> = input.booking || {}
  const packages: Partial<PackagesDecoration> = input.packages || {}
  const packageDetail: Partial<PackageDetailDecoration> = input.packageDetail || {}
  const series: Partial<SeriesDecoration> = input.series || {}
  const success: Partial<SuccessDecoration> = input.success || {}
  const showcase: Partial<ShowcaseDecoration> = input.showcase || {}
  const homeColumns = pick(Number(home.galleryColumns) as 1 | 2 | 3 | 4, [1, 2, 3, 4] as const, DEFAULT_DECORATION.home.galleryColumns)
  let homeCardContent = pick(home.cardContent, ['full', 'compact', 'image-only', 'custom'] as const, DEFAULT_DECORATION.home.cardContent)
  const visibilityFallback = homeCardContent === 'full'
    ? { showTitle: true, showCategory: true, showDescription: true }
    : homeCardContent === 'image-only'
      ? { showTitle: false, showCategory: false, showDescription: false }
      : { showTitle: true, showCategory: true, showDescription: false }
  let showTitle = typeof home.showTitle === 'boolean' ? home.showTitle : visibilityFallback.showTitle
  let showCategory = typeof home.showCategory === 'boolean' ? home.showCategory : visibilityFallback.showCategory
  let showDescription = typeof home.showDescription === 'boolean' ? home.showDescription : visibilityFallback.showDescription

  if (homeColumns === 4) {
    homeCardContent = 'image-only'
    showTitle = false
    showCategory = false
    showDescription = false
  }

  const migratedFrameworkId = input.framework?.id
    ? input.framework.id
    : input.siteTemplate === 'dark-gallery'
      ? 'cinematic-gallery'
      : DEFAULT_DECORATION.framework.id
  const frameworkId = pick(
    migratedFrameworkId,
    ['legacy-classic', 'cinematic-gallery', 'editorial-journal', 'atelier-conversion'] as const,
    DEFAULT_DECORATION.framework.id
  )
  const siteTemplate = frameworkId === 'cinematic-gallery'
    ? 'dark-gallery'
    : frameworkId === 'legacy-classic'
      ? pick(input.siteTemplate, ['classic', 'dark-gallery'] as const, DEFAULT_DECORATION.siteTemplate)
      : 'classic'

  const legacyNormalized = {
    schemaVersion: 3 as const,
    framework: {
      id: frameworkId,
      motion: pick(framework.motion, ['none', 'subtle'] as const, DEFAULT_DECORATION.framework.motion),
      sectionRhythm: pick(framework.sectionRhythm, ['tight', 'balanced', 'airy'] as const, DEFAULT_DECORATION.framework.sectionRhythm)
    },
    media: {
      heroFocalPoint: pick(media.heroFocalPoint, ['center', 'top', 'bottom', 'left', 'right'] as const, DEFAULT_DECORATION.media.heroFocalPoint),
      galleryFocalPoint: pick(media.galleryFocalPoint, ['center', 'top', 'bottom', 'left', 'right'] as const, DEFAULT_DECORATION.media.galleryFocalPoint),
      heroOverlay: pick(media.heroOverlay, ['light', 'balanced', 'strong'] as const, DEFAULT_DECORATION.media.heroOverlay)
    },
    siteTemplate,
    showcase: {
      heroActionText: String(showcase.heroActionText || DEFAULT_DECORATION.showcase.heroActionText).slice(0, 12),
      heroActionTarget: pick(showcase.heroActionTarget, ['gallery', 'booking'] as const, DEFAULT_DECORATION.showcase.heroActionTarget),
      galleryTitle: String(showcase.galleryTitle || DEFAULT_DECORATION.showcase.galleryTitle).slice(0, 18),
      gallerySubtitle: String(showcase.gallerySubtitle || DEFAULT_DECORATION.showcase.gallerySubtitle).slice(0, 24),
      categoryMode: pick(showcase.categoryMode, ['top', 'sidebar'] as const, DEFAULT_DECORATION.showcase.categoryMode),
      galleryColumns: pick(Number(showcase.galleryColumns) as 2 | 3, [2, 3] as const, DEFAULT_DECORATION.showcase.galleryColumns),
      showSearch: showcase.showSearch !== false,
      showTags: showcase.showTags !== false,
      seriesActionText: String(showcase.seriesActionText || DEFAULT_DECORATION.showcase.seriesActionText).slice(0, 12),
      aboutQuote: String(showcase.aboutQuote || DEFAULT_DECORATION.showcase.aboutQuote).slice(0, 80),
      aboutGalleryLimit: pick(Number(showcase.aboutGalleryLimit) as 6 | 9, [6, 9] as const, DEFAULT_DECORATION.showcase.aboutGalleryLimit)
    },
    terminology: {
      workLabel: String(terminology.workLabel || DEFAULT_DECORATION.terminology.workLabel),
      packageLabel: String(terminology.packageLabel || DEFAULT_DECORATION.terminology.packageLabel),
      consultationLabel: String(terminology.consultationLabel || DEFAULT_DECORATION.terminology.consultationLabel),
      professionalLabel: String(terminology.professionalLabel || DEFAULT_DECORATION.terminology.professionalLabel),
      serviceLabel: String(terminology.serviceLabel || DEFAULT_DECORATION.terminology.serviceLabel),
      customerServiceLabel: String(terminology.customerServiceLabel || DEFAULT_DECORATION.terminology.customerServiceLabel)
    },
    navigation: {
      portfolioText: String(navigation.portfolioText || DEFAULT_DECORATION.navigation.portfolioText),
      galleryText: String(navigation.galleryText || DEFAULT_DECORATION.navigation.galleryText),
      aboutText: String(navigation.aboutText || DEFAULT_DECORATION.navigation.aboutText),
      packagesText: String(navigation.packagesText || DEFAULT_DECORATION.navigation.packagesText),
      bookingText: String(navigation.bookingText || DEFAULT_DECORATION.navigation.bookingText),
      storesText: String(navigation.storesText || DEFAULT_DECORATION.navigation.storesText),
      style: pick(navigation.style, ['line', 'quiet'] as const, DEFAULT_DECORATION.navigation.style),
      items: normalizeNavigationItems(navigation.items)
    },
    icons: {
      navigation: {
        portfolio: normalizeConfigurableIcon(navigationIcons.portfolio, DEFAULT_DECORATION.icons.navigation.portfolio),
        gallery: normalizeConfigurableIcon(navigationIcons.gallery, DEFAULT_DECORATION.icons.navigation.gallery),
        about: normalizeConfigurableIcon(navigationIcons.about, DEFAULT_DECORATION.icons.navigation.about),
        packages: normalizeConfigurableIcon(navigationIcons.packages, DEFAULT_DECORATION.icons.navigation.packages),
        booking: normalizeConfigurableIcon(navigationIcons.booking, DEFAULT_DECORATION.icons.navigation.booking),
        stores: normalizeConfigurableIcon(navigationIcons.stores, DEFAULT_DECORATION.icons.navigation.stores)
      },
      navigationCustom: {
        portfolio: normalizeCustomIconPath(customNavigationIcons.portfolio),
        gallery: normalizeCustomIconPath(customNavigationIcons.gallery),
        about: normalizeCustomIconPath(customNavigationIcons.about),
        packages: normalizeCustomIconPath(customNavigationIcons.packages),
        booking: normalizeCustomIconPath(customNavigationIcons.booking),
        stores: normalizeCustomIconPath(customNavigationIcons.stores)
      },
      quickJump: {
        trigger: normalizeConfigurableIcon(quickJumpIcons.trigger, DEFAULT_DECORATION.icons.quickJump.trigger),
        portfolio: normalizeConfigurableIcon(quickJumpIcons.portfolio, DEFAULT_DECORATION.icons.quickJump.portfolio),
        booking: normalizeConfigurableIcon(quickJumpIcons.booking, DEFAULT_DECORATION.icons.quickJump.booking)
      },
      contact: {
        wechat: normalizeConfigurableIcon(contactIcons.wechat, DEFAULT_DECORATION.icons.contact.wechat),
        email: normalizeConfigurableIcon(contactIcons.email, DEFAULT_DECORATION.icons.contact.email),
        location: normalizeConfigurableIcon(contactIcons.location, DEFAULT_DECORATION.icons.contact.location),
        phone: normalizeConfigurableIcon(contactIcons.phone, DEFAULT_DECORATION.icons.contact.phone)
      }
    },
    pages: {} as DecorationPages,
    home: {
      skeleton: DEFAULT_DECORATION.home.skeleton,
      template: pick(home.template, ['editorial-cover', 'split-catalog', 'gallery-wall', 'service-led'] as const, DEFAULT_DECORATION.home.template),
      heroVariant: pick(home.heroVariant, ['editorial', 'immersive', 'compact'] as const, DEFAULT_DECORATION.home.heroVariant),
      galleryVariant: pick(home.galleryVariant, ['editorial', 'masonry', 'cards', 'horizontal', 'mixed'] as const, DEFAULT_DECORATION.home.galleryVariant),
      galleryColumns: homeColumns,
      imageRatio: pick(home.imageRatio, ['portrait', 'natural', 'square'] as const, DEFAULT_DECORATION.home.imageRatio),
      cardContent: homeCardContent,
      showTitle,
      showCategory,
      showDescription,
      galleryGap: pick(home.galleryGap, ['tight', 'standard', 'airy'] as const, DEFAULT_DECORATION.home.galleryGap),
      sections: normalizeSections(home.sections, DEFAULT_DECORATION.home.sections)
    },
    about: {
      skeleton: DEFAULT_DECORATION.about.skeleton,
      headerVariant: pick(about.headerVariant, ['editorial', 'portrait', 'minimal'] as const, DEFAULT_DECORATION.about.headerVariant),
      sections: normalizeSections(about.sections, DEFAULT_DECORATION.about.sections)
    },
    booking: {
      skeleton: DEFAULT_DECORATION.booking.skeleton,
      headerVariant: pick(booking.headerVariant, ['editorial', 'image', 'compact'] as const, DEFAULT_DECORATION.booking.headerVariant),
      formVariant: pick(booking.formVariant, ['lines', 'soft'] as const, DEFAULT_DECORATION.booking.formVariant),
      sections: normalizeSections(booking.sections, DEFAULT_DECORATION.booking.sections),
      fields: normalizeFields(booking.fields, DEFAULT_DECORATION.booking.fields)
    },
    packages: {
      skeleton: DEFAULT_DECORATION.packages.skeleton,
      layoutVariant: pick(packages.layoutVariant, ['cards', 'list'] as const, DEFAULT_DECORATION.packages.layoutVariant),
      sections: normalizeSections(packages.sections, DEFAULT_DECORATION.packages.sections)
    },
    packageDetail: {
      skeleton: DEFAULT_DECORATION.packageDetail.skeleton,
      layoutVariant: pick(packageDetail.layoutVariant, ['editorial', 'compact'] as const, DEFAULT_DECORATION.packageDetail.layoutVariant),
      sections: normalizeSections(packageDetail.sections, DEFAULT_DECORATION.packageDetail.sections)
    },
    series: {
      skeleton: DEFAULT_DECORATION.series.skeleton,
      galleryVariant: pick(series.galleryVariant, ['immersive', 'framed'] as const, DEFAULT_DECORATION.series.galleryVariant),
      sections: normalizeSections(series.sections, DEFAULT_DECORATION.series.sections)
    },
    success: {
      skeleton: DEFAULT_DECORATION.success.skeleton,
      layoutVariant: pick(success.layoutVariant, ['centered', 'compact'] as const, DEFAULT_DECORATION.success.layoutVariant),
      sections: normalizeSections(success.sections, DEFAULT_DECORATION.success.sections)
    }
  }

  const pages = normalizeDecorationPages(input, legacyNormalized)
  const projected = projectPagesToLegacy(pages, legacyNormalized)
  return {
    ...projected,
    schemaVersion: 3,
    pages
  }
}

const focalPointMap: Record<DecorationFocalPoint, string> = {
  center: 'center center',
  top: 'center top',
  bottom: 'center bottom',
  left: 'left center',
  right: 'right center'
}

const overlayOpacityMap: Record<MediaDecoration['heroOverlay'], string> = {
  light: '0.2',
  balanced: '0.42',
  strong: '0.62'
}

export function getDecorationRuntime(value?: Partial<DecorationContent> | null): DecorationRuntime {
  const decoration = normalizeDecoration(value)
  const framework = decoration.framework
  return {
    frameworkId: framework.id,
    className: [
      `framework-${framework.id}`,
      `rhythm-${framework.sectionRhythm}`,
      `motion-${framework.motion}`
    ].join(' '),
    style: [
      `--hero-object-position: ${focalPointMap[decoration.media.heroFocalPoint]}`,
      `--gallery-object-position: ${focalPointMap[decoration.media.galleryFocalPoint]}`,
      `--hero-overlay-opacity: ${overlayOpacityMap[decoration.media.heroOverlay]}`
    ].join('; ') + ';'
  }
}

export function isSectionVisible(
  sections: DecorationSection[],
  type: string
): boolean {
  const item = sections.find(sectionItem => sectionItem.type === type)
  return Boolean(item && item.enabled !== false)
}
