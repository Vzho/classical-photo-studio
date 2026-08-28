// brand-intro-block（Registry: brand-intro）：品牌介绍。
// 变体：centered / editorial-left；文本宽度为受控档位。
const WIDTH_TIERS: Record<string, string> = {
  narrow: '480rpx',
  normal: '600rpx',
  wide: '690rpx'
}

Component({
  options: {
    addGlobalClass: true,
    styleIsolation: 'apply-shared'
  },

  properties: {
    block: { type: Object, value: {} },
    content: { type: null, value: {} }
  },

  data: {
    widthStyle: ''
  },

  observers: {
    'block.settings': function (settings: any) {
      const width = WIDTH_TIERS[settings?.textWidthTier] || WIDTH_TIERS.normal
      this.setData({ widthStyle: `max-width:${width}` })
    }
  }
})
