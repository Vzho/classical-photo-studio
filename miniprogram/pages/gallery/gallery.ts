import {
  buildThemeStyle,
  DEFAULT_SHARE_CONTENT,
  getCosUrl,
  getPortfolioPageData,
  getThemePreset,
  PortfolioItem,
  QuickJumpContent,
  shouldShowQuickJump,
  ShareContent
} from '../../utils/cos'
import {
  DEFAULT_DECORATION,
  IconDecoration,
  NavigationDecoration,
  NavigationItemKey,
  ShowcaseDecoration
} from '../../utils/decoration'
import { createShareMessage } from '../../utils/share'
import { navigateToSitePage, SITE_PAGE_PATHS } from '../../utils/site-navigation'

interface GalleryNavigationItem {
  key: NavigationItemKey
  text: string
  icon: string
  customIcon: string
  pagePath: string
}

const TEXT_KEYS: Record<NavigationItemKey, keyof NavigationDecoration> = {
  portfolio: 'portfolioText',
  gallery: 'galleryText',
  about: 'aboutText',
  packages: 'packagesText',
  booking: 'bookingText',
  stores: 'storesText'
}

Page({
  data: {
    themeStyle: '',
    themePreset: 'minimal',
    siteTemplate: 'classic' as 'classic' | 'dark-gallery',
    showcase: { ...DEFAULT_DECORATION.showcase } as ShowcaseDecoration,
    categories: ['全部'] as string[],
    activeCategory: '全部',
    searchKeyword: '',
    portfolioItems: [] as PortfolioItem[],
    filteredItems: [] as PortfolioItem[],
    navigationItems: [] as GalleryNavigationItem[],
    navigationStyle: 'line',
    quickJump: {
      enabled: true,
      bookingText: '咨询',
      portfolioText: '作品集'
    } as Partial<QuickJumpContent>,
    quickJumpVisible: true,
    share: { ...DEFAULT_SHARE_CONTENT } as ShareContent
  },

  async onShow() {
    await this.loadData()
  },

  async loadData() {
    const data = await getPortfolioPageData()
    const categories = ['全部', ...Array.from(new Set(data.portfolioItems.map(item => item.category).filter(Boolean)))]
    const navigationItems = data.navigation.items
      .filter(item => item.enabled)
      .map(item => ({
        key: item.key,
        text: String(data.navigation[TEXT_KEYS[item.key]] || ''),
        icon: data.icons.navigation[item.key],
        customIcon: data.icons.navigationCustom[item.key]
          ? getCosUrl(data.icons.navigationCustom[item.key])
          : '',
        pagePath: SITE_PAGE_PATHS[item.key]
      }))

    this.setData({
      themeStyle: buildThemeStyle(data.theme),
      themePreset: getThemePreset(data.theme),
      siteTemplate: data.siteTemplate,
      showcase: data.showcase,
      categories,
      portfolioItems: data.portfolioItems,
      navigationItems,
      navigationStyle: data.navigation.style,
      quickJump: {
        enabled: true,
        bookingText: '咨询',
        portfolioText: '作品集',
        ...(data.quickJump || {})
      },
      quickJumpVisible: shouldShowQuickJump(data.quickJump, 'gallery'),
      share: data.share
    }, () => this.applyFilters())

    if (data.siteTemplate !== 'dark-gallery') {
      wx.redirectTo({ url: '/pages/portfolio/portfolio' })
    }
  },

  applyFilters() {
    const keyword = this.data.searchKeyword.trim().toLowerCase()
    const filteredItems = this.data.portfolioItems.filter(item => {
      const matchesCategory = this.data.activeCategory === '全部' || item.category === this.data.activeCategory
      if (!matchesCategory) return false
      if (!keyword) return true
      return [item.title, item.category, item.description, ...(item.tags || [])]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(keyword))
    })
    this.setData({ filteredItems })
  },

  onCategoryTap(e: WechatMiniprogram.TouchEvent) {
    this.setData({ activeCategory: String(e.currentTarget.dataset.category || '全部') }, () => this.applyFilters())
  },

  onSearchInput(e: WechatMiniprogram.Input) {
    this.setData({ searchKeyword: e.detail.value }, () => this.applyFilters())
  },

  onItemTap(e: WechatMiniprogram.TouchEvent) {
    const item = e.currentTarget.dataset.item as PortfolioItem
    if (!item?.seriesId) return
    wx.navigateTo({
      url: `/pages/series/series?seriesId=${encodeURIComponent(item.seriesId)}&title=${encodeURIComponent(item.title)}&category=${encodeURIComponent(item.category)}`
    })
  },

  onNavigationTap(e: WechatMiniprogram.TouchEvent) {
    const key = e.currentTarget.dataset.key as NavigationItemKey
    if (key === 'gallery') return
    navigateToSitePage(key)
  },

  onImageError(e: WechatMiniprogram.CustomEvent) {
    const id = String(e.currentTarget.dataset.id || '')
    const filteredItems = this.data.filteredItems.map(item => item.id === id && item.originalUrl
      ? { ...item, imageUrl: item.originalUrl }
      : item)
    this.setData({ filteredItems })
  },

  onShareAppMessage() {
    return createShareMessage({
      pageType: 'portfolio',
      share: this.data.share,
      path: '/pages/gallery/gallery',
      contentImageUrl: this.data.filteredItems[0]?.originalUrl
    })
  }
})
