import { buildThemeStyle, getThemePageData, getThemePreset, QuickJumpContent, shouldShowQuickJump } from '../../utils/cos'
import { DEFAULT_DECORATION, SuccessDecoration, TerminologyDecoration } from '../../utils/decoration'
import { setPageNavigationTitle } from '../../utils/navigation'

interface ConsultationSummaryItem {
  label: string
  value: string
}

Page({
  data: {
    themeStyle: '',
    themePreset: 'minimal',
    consultation: null as any,
    summaryItems: [] as ConsultationSummaryItem[],
    quickJump: {
      enabled: true,
      bookingText: '咨询',
      portfolioText: '作品集'
    } as Partial<QuickJumpContent>,
    quickJumpVisible: true,
    terminology: { ...DEFAULT_DECORATION.terminology } as TerminologyDecoration,
    decoration: { ...DEFAULT_DECORATION.success } as SuccessDecoration
  },

  onLoad() {
    const consultation = wx.getStorageSync('lastConsultation')
    this.loadTheme(consultation)

    if (!consultation) {
      this.setData({
        consultation: null,
        summaryItems: []
      })
      return
    }

    this.setData({
      consultation,
      summaryItems: this.buildSummaryItems(consultation)
    })
  },

  async loadTheme(consultation: any) {
    const { theme, quickJump, terminology, decoration } = await getThemePageData()
    this.setData({
      themeStyle: buildThemeStyle(theme),
      themePreset: getThemePreset(theme),
      quickJump: {
        enabled: true,
        bookingText: '咨询',
        portfolioText: '作品集',
        ...(quickJump || {})
      },
      quickJumpVisible: shouldShowQuickJump(quickJump, 'success'),
      terminology,
      decoration,
      summaryItems: consultation ? this.buildSummaryItems(consultation, terminology) : []
    })

    setPageNavigationTitle(`${terminology.consultationLabel}内容`, '咨询内容')
  },

  buildSummaryItems(
    consultation: any,
    terminology?: TerminologyDecoration
  ): ConsultationSummaryItem[] {
    const labels = terminology || this.data.terminology
    return [
      { label: '称呼', value: consultation.name },
      { label: '联系方式', value: consultation.contact },
      { label: `${labels.serviceLabel}风格`, value: consultation.style },
      { label: `意向${labels.packageLabel}`, value: consultation.packageName },
      { label: '期望日期', value: consultation.date },
      { label: '意向门店', value: consultation.storeName },
      { label: `意向${labels.professionalLabel}`, value: consultation.photographerName },
      { label: '备注说明', value: consultation.note }
    ].filter(item => item.value && String(item.value).trim())
  },

  copyConsultation() {
    const text = this.data.consultation?.text

    if (!text) {
      wx.showToast({ title: `暂无${this.data.terminology.consultationLabel}内容`, icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: `${this.data.terminology.consultationLabel}内容已复制`, icon: 'success' })
      }
    })
  },

  copyWechat() {
    const wechat = this.data.consultation?.photographerWechat

    if (!wechat) {
      wx.showToast({ title: '暂未配置微信号', icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: wechat,
      success: () => {
        wx.showToast({ title: '微信号已复制', icon: 'success' })
      }
    })
  },

  contactPhotographer() {
    const wechat = this.data.consultation?.photographerWechat

    if (!wechat) {
      wx.showToast({ title: '暂未配置微信号', icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: wechat,
      success: () => {
        wx.showModal({
          title: `联系${this.data.terminology.customerServiceLabel}确认日期`,
          content: `已复制${this.data.terminology.customerServiceLabel}微信号。请将${this.data.terminology.consultationLabel}内容发送给${this.data.terminology.customerServiceLabel}，最终${this.data.terminology.serviceLabel}时间和方案以双方沟通确认为准。`,
          showCancel: false,
          confirmText: '知道了'
        })
      }
    })
  },

  goHome() {
    wx.switchTab({ url: '/pages/portfolio/portfolio' })
  },

  goBooking() {
    wx.switchTab({ url: '/pages/booking/booking' })
  },

  goPackages() {
    wx.navigateTo({ url: '/pages/packages/packages' })
  }
})
