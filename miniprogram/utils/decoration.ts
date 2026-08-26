export type DecorationPageKey =
  | 'home'
  | 'about'
  | 'booking'
  | 'packages'
  | 'packageDetail'
  | 'series'
  | 'success'

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
  headerVariant: 'editorial' | 'portrait' | 'minimal'
  sections: DecorationSection[]
}

export interface BookingDecoration {
  headerVariant: 'editorial' | 'image' | 'compact'
  formVariant: 'lines' | 'soft'
  sections: DecorationSection[]
  fields: BookingFieldDecoration[]
}

export interface SectionPageDecoration {
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
  siteTemplate: 'classic' | 'dark-gallery'
  showcase: ShowcaseDecoration
  terminology: TerminologyDecoration
  navigation: NavigationDecoration
  icons: IconDecoration
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
    layoutVariant: 'cards',
    sections: [
      section('header', '服务套餐', '了解价格范围和服务内容，再联系客服确认适合你的方案。'),
      section('schedule', '近期档期'),
      section('list'),
      section('testimonials', '客户评价', '来自真实服务体验的反馈')
    ]
  },
  packageDetail: {
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

  return [
    ...normalized.filter(item => item.enabled),
    ...normalized.filter(item => !item.enabled)
  ]
}

export function normalizeDecoration(value?: Partial<DecorationContent> | null): DecorationContent {
  const input = value || {}
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

  return {
    siteTemplate: pick(input.siteTemplate, ['classic', 'dark-gallery'] as const, DEFAULT_DECORATION.siteTemplate),
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
    home: {
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
      headerVariant: pick(about.headerVariant, ['editorial', 'portrait', 'minimal'] as const, DEFAULT_DECORATION.about.headerVariant),
      sections: normalizeSections(about.sections, DEFAULT_DECORATION.about.sections)
    },
    booking: {
      headerVariant: pick(booking.headerVariant, ['editorial', 'image', 'compact'] as const, DEFAULT_DECORATION.booking.headerVariant),
      formVariant: pick(booking.formVariant, ['lines', 'soft'] as const, DEFAULT_DECORATION.booking.formVariant),
      sections: normalizeSections(booking.sections, DEFAULT_DECORATION.booking.sections),
      fields: normalizeFields(booking.fields, DEFAULT_DECORATION.booking.fields)
    },
    packages: {
      layoutVariant: pick(packages.layoutVariant, ['cards', 'list'] as const, DEFAULT_DECORATION.packages.layoutVariant),
      sections: normalizeSections(packages.sections, DEFAULT_DECORATION.packages.sections)
    },
    packageDetail: {
      layoutVariant: pick(packageDetail.layoutVariant, ['editorial', 'compact'] as const, DEFAULT_DECORATION.packageDetail.layoutVariant),
      sections: normalizeSections(packageDetail.sections, DEFAULT_DECORATION.packageDetail.sections)
    },
    series: {
      galleryVariant: pick(series.galleryVariant, ['immersive', 'framed'] as const, DEFAULT_DECORATION.series.galleryVariant),
      sections: normalizeSections(series.sections, DEFAULT_DECORATION.series.sections)
    },
    success: {
      layoutVariant: pick(success.layoutVariant, ['centered', 'compact'] as const, DEFAULT_DECORATION.success.layoutVariant),
      sections: normalizeSections(success.sections, DEFAULT_DECORATION.success.sections)
    }
  }
}

export function isSectionVisible(
  sections: DecorationSection[],
  type: string
): boolean {
  const item = sections.find(sectionItem => sectionItem.type === type)
  return Boolean(item && item.enabled !== false)
}
