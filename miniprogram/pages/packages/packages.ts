import {
  buildThemeStyle,
  ConsultButtonContent,
  getPackagesPageData,
  PackageItem,
  ScheduleContent,
  TestimonialItem
} from '../../utils/cos'

Page({
  data: {
    themeStyle: '',
    packages: [] as PackageItem[],
    schedule: { enabled: false } as Partial<ScheduleContent>,
    testimonials: [] as TestimonialItem[],
    consultButton: {
      enabled: true,
      text: '咨询此套餐',
      action: 'booking'
    } as Partial<ConsultButtonContent>
  },

  onLoad() {
    this.loadData()
  },

  async loadData() {
    const { theme, packages, schedule, testimonials, consultButton } = await getPackagesPageData()

    this.setData({
      themeStyle: buildThemeStyle(theme),
      packages: packages.map(item => ({
        ...item,
        includes: item.includes || [],
        suitableFor: item.suitableFor || []
      })),
      schedule: {
        enabled: false,
        specialNotes: [],
        ...(schedule || {})
      },
      testimonials,
      consultButton: {
        enabled: true,
        text: '咨询此套餐',
        action: 'booking',
        ...(consultButton || {})
      }
    })
  },

  consultPackage(e: WechatMiniprogram.TouchEvent) {
    const packageId = e.currentTarget.dataset.id as string
    wx.setStorageSync('prefillConsultation', { packageId })
    wx.switchTab({ url: '/pages/booking/booking' })
  },

  goBooking() {
    wx.switchTab({ url: '/pages/booking/booking' })
  },

  onShareAppMessage() {
    return {
      title: '拍摄套餐 - 摄影作品合集',
      path: '/pages/packages/packages'
    }
  }
})
