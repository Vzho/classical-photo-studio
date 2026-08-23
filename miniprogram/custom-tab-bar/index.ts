import { buildThemeStyle, getThemePageData, getThemePreset } from '../utils/cos'

Component({
  data: {
    selected: 0,
    themeStyle: '',
    themePreset: 'minimal',
    navigationStyle: 'line',
    list: [
      { pagePath: '/pages/portfolio/portfolio', text: '作品集', icon: 'images' },
      { pagePath: '/pages/about/about', text: '简介', icon: 'user-round' },
      { pagePath: '/pages/booking/booking', text: '咨询', icon: 'calendar-days' }
    ]
  },
  lifetimes: {
    attached() {
      this.loadTheme()
    }
  },
  methods: {
    async loadTheme() {
      const { theme, navigation, icons } = await getThemePageData()
      this.setData({
        themeStyle: buildThemeStyle(theme),
        themePreset: getThemePreset(theme),
        navigationStyle: navigation.style,
        list: [
          { pagePath: '/pages/portfolio/portfolio', text: navigation.portfolioText, icon: icons.navigation.portfolio },
          { pagePath: '/pages/about/about', text: navigation.aboutText, icon: icons.navigation.about },
          { pagePath: '/pages/booking/booking', text: navigation.bookingText, icon: icons.navigation.booking }
        ]
      })
    },

    switchTab(e: WechatMiniprogram.TouchEvent) {
      const { path, index } = e.currentTarget.dataset
      this.setData({ selected: index })
      wx.switchTab({ url: path })
    }
  }
})
