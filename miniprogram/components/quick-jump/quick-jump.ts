Component({
  properties: {
    current: {
      type: String,
      value: ''
    },
    bookingText: {
      type: String,
      value: '咨询'
    },
    portfolioText: {
      type: String,
      value: '作品集'
    },
    appearance: {
      type: String,
      value: 'solid'
    },
    triggerIcon: {
      type: String,
      value: 'navigation'
    },
    bookingIcon: {
      type: String,
      value: 'calendar-days'
    },
    portfolioIcon: {
      type: String,
      value: 'images'
    }
  },

  data: {
    open: false
  },

  methods: {
    toggleOpen() {
      this.setData({
        open: !this.data.open
      })
    },

    goBooking() {
      this.setData({ open: false })
      if (this.data.current === 'booking') return

      wx.switchTab({
        url: '/pages/booking/booking'
      })
    },

    goPortfolio() {
      this.setData({ open: false })
      if (this.data.current === 'portfolio') return

      wx.switchTab({
        url: '/pages/portfolio/portfolio'
      })
    }
  }
})
