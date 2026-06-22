Component({
  data: {
    selected: 0,
    list: [
      { pagePath: '/pages/portfolio/portfolio', text: '作品集', icon: '📷' },
      { pagePath: '/pages/about/about', text: '简介', icon: '👤' },
      { pagePath: '/pages/booking/booking', text: '咨询', icon: '📅' }
    ]
  },
  methods: {
    switchTab(e: WechatMiniprogram.TouchEvent) {
      const { path, index } = e.currentTarget.dataset
      this.setData({ selected: index })
      wx.switchTab({ url: path })
    }
  }
})
