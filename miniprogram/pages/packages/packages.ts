import {
  buildThemeStyle,
  ConsultButtonContent,
  DEFAULT_SHARE_CONTENT,
  getPackagesPageData,
  getThemePreset,
  PackageItem,
  QuickJumpContent,
  ScheduleContent,
  ShareContent,
  shouldShowQuickJump,
  TestimonialItem
} from '../../utils/cos'
import { handleConsultButtonAction } from '../../utils/consult-action'
import { DEFAULT_DECORATION, PackagesDecoration, TerminologyDecoration } from '../../utils/decoration'
import { setPageNavigationTitle } from '../../utils/navigation'
import { createShareMessage } from '../../utils/share'
import { handleV3BlockAction, refreshV3ForPage, V3_INITIAL_STATE } from '../../utils/v3-page'

Page({
  data: {
    themeStyle: '',
    themePreset: 'minimal',
    decorationClass: '',
    decorationStyle: '',
    packages: [] as PackageItem[],
    schedule: { enabled: false } as Partial<ScheduleContent>,
    testimonials: [] as TestimonialItem[],
    consultButton: {
      enabled: true,
      text: '咨询此套餐',
      action: 'booking'
    } as Partial<ConsultButtonContent>,
    quickJump: {
      enabled: true,
      bookingText: '咨询',
      portfolioText: '作品集'
    } as Partial<QuickJumpContent>,
    quickJumpVisible: true,
    share: { ...DEFAULT_SHARE_CONTENT } as ShareContent,
    terminology: { ...DEFAULT_DECORATION.terminology } as TerminologyDecoration,
    decoration: { ...DEFAULT_DECORATION.packages } as PackagesDecoration,
    ...V3_INITIAL_STATE
  },

  onLoad() {
    this.loadData()
  },

  async loadData() {
    const { theme, packages, schedule, testimonials, consultButton, quickJump, share, terminology, decoration, runtime } = await getPackagesPageData()

    this.setData({
      themeStyle: buildThemeStyle(theme),
      themePreset: getThemePreset(theme),
      decorationClass: runtime.className,
      decorationStyle: runtime.style,
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
      },
      quickJump: {
        enabled: true,
        bookingText: '咨询',
        portfolioText: '作品集',
        ...(quickJump || {})
      },
      quickJumpVisible: shouldShowQuickJump(quickJump, 'packages'),
      share,
      terminology,
      decoration
    })

    setPageNavigationTitle(`${terminology.packageLabel}方案`, '服务套餐')

    // 双引擎：尝试 blocks-v3 渲染（§10.2），失败静默回退旧路径。
    await refreshV3ForPage(this as any, 'packages')
  },

  onV3BlockAction(e: WechatMiniprogram.CustomEvent) {
    handleV3BlockAction(this as any, e.detail)
  },

  consultPackage(e: WechatMiniprogram.TouchEvent) {
    const packageId = e.currentTarget.dataset.id as string
    handleConsultButtonAction(this.data.consultButton, { packageId })
  },

  openPackageDetail(e: WechatMiniprogram.TouchEvent) {
    const packageId = e.currentTarget.dataset.id as string
    if (!packageId) return

    wx.navigateTo({
      url: `/pages/package-detail/package-detail?id=${packageId}`
    })
  },

  goBooking() {
    handleConsultButtonAction(this.data.consultButton)
  },

  onShareAppMessage() {
    return createShareMessage({
      pageType: 'packages',
      share: this.data.share,
      path: '/pages/packages/packages',
      contentImageUrl: this.data.share.fallbackImageUrl,
      imagePriority: 'global-first'
    })
  }
})
