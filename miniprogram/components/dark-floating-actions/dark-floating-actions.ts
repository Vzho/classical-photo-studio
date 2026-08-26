Component({
  properties: {
    contactText: {
      type: String,
      value: '联系'
    },
    showFollow: {
      type: Boolean,
      value: true
    }
  },

  methods: {
    showFollowTip() {
      wx.showToast({
        title: '可从右上角收藏小程序',
        icon: 'none'
      })
    },

    contact() {
      this.triggerEvent('contact')
    }
  }
})
