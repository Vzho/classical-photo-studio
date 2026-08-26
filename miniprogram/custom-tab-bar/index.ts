import { buildThemeStyle, getCosUrl, getThemePageData, getThemePreset } from '../utils/cos'
import { NavigationItemKey } from '../utils/decoration'
import { navigateToSitePage } from '../utils/site-navigation'

const NAVIGATION_PAGES = {
  portfolio: { pagePath: '/pages/portfolio/portfolio', textKey: 'portfolioText' as const },
  gallery: { pagePath: '/pages/gallery/gallery', textKey: 'galleryText' as const },
  about: { pagePath: '/pages/about/about', textKey: 'aboutText' as const },
  packages: { pagePath: '/pages/packages/packages', textKey: 'packagesText' as const },
  booking: { pagePath: '/pages/booking/booking', textKey: 'bookingText' as const },
  stores: { pagePath: '/pages/stores/stores', textKey: 'storesText' as const }
}

Component({
  data: {
    selected: -1,
    themeStyle: '',
    themePreset: 'minimal',
    decorationClass: '',
    navigationStyle: 'line',
    siteTemplate: 'classic',
    list: [
      { pagePath: '/pages/portfolio/portfolio', text: '作品集', icon: 'images', customIcon: '' },
      { pagePath: '/pages/about/about', text: '简介', icon: 'user-round', customIcon: '' },
      { pagePath: '/pages/booking/booking', text: '咨询', icon: 'calendar-days', customIcon: '' },
      { pagePath: '/pages/stores/stores', text: '门店', icon: 'map-pin', customIcon: '' }
    ]
  },
  lifetimes: {
    attached() {
      this.loadTheme()
    }
  },
  pageLifetimes: {
    show() {
      this.syncSelected()
    }
  },
  methods: {
    async loadTheme() {
      const { theme, navigation, icons, siteTemplate, runtime } = await getThemePageData()
      const list = navigation.items
        .filter(item => item.enabled)
        .map(item => {
          const page = NAVIGATION_PAGES[item.key]
          return {
            key: item.key,
            pagePath: page.pagePath,
            text: navigation[page.textKey],
            icon: icons.navigation[item.key],
            customIcon: icons.navigationCustom[item.key] ? getCosUrl(icons.navigationCustom[item.key]) : ''
          }
        })
      this.setData({
        themeStyle: buildThemeStyle(theme),
        themePreset: getThemePreset(theme),
        navigationStyle: navigation.style,
        siteTemplate,
        decorationClass: runtime.className,
        list
      }, () => this.syncSelected())
    },

    syncSelected() {
      const pages = getCurrentPages()
      const route = pages[pages.length - 1]?.route || ''
      const currentPath = route ? `/${route.replace(/^\//, '')}` : ''
      const selected = this.data.list.findIndex(item => item.pagePath === currentPath)
      if (selected !== this.data.selected) this.setData({ selected })
    },

    switchTab(e: WechatMiniprogram.TouchEvent) {
      const { key, index } = e.currentTarget.dataset
      this.setData({ selected: index })
      navigateToSitePage(key as NavigationItemKey)
    }
  }
})
