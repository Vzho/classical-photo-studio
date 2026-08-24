import { FALLBACK_STYLE_OPTIONS, PHOTOGRAPHER } from '../../utils/constants'
import {
  buildThemeStyle,
  ConsultationContent,
  DEFAULT_SHARE_CONTENT,
  FaqContent,
  getBookingPageData,
  getCosUrl,
  getThemePreset,
  PackageItem,
  QuickJumpContent,
  ScheduleContent,
  ServiceFlowContent,
  ShareContent,
  shouldShowQuickJump,
  StoreItem,
  TeamPhotographerItem
} from '../../utils/cos'
import { BookingDecoration, BookingFieldDecoration, DEFAULT_DECORATION, TerminologyDecoration } from '../../utils/decoration'
import { setPageNavigationTitle } from '../../utils/navigation'
import { createShareMessage } from '../../utils/share'

const DEFAULT_CONSULTATION: Required<ConsultationContent> = {
  title: '预约咨询',
  description: '填写信息后可生成咨询内容，发送给摄影师确认档期和方案。',
  template: '你好，我想咨询拍摄：\n\n称呼：{{name}}\n联系方式：{{contact}}\n拍摄风格：{{style}}\n意向套餐：{{package}}\n期望日期：{{date}}\n门店：{{store}}\n摄影师：{{photographer}}\n备注：{{note}}\n\n我是在小程序中看到作品后联系你的，想进一步确认档期和拍摄方案。',
  privacyTip: '你填写的信息仅用于生成咨询内容，请复制后发送给摄影师确认档期和拍摄方案。'
}

function normalizeStyleOptions(styleOptions?: string[]): string[] {
  const normalized = (styleOptions || [])
    .map(item => String(item).trim())
    .filter(item => item && item !== '其他')

  const uniqueOptions = Array.from(new Set(normalized))
  return uniqueOptions.length > 0 ? uniqueOptions : FALLBACK_STYLE_OPTIONS
}

function getPickerNames(items: Array<{ name: string }>): string[] {
  return ['暂不选择', ...items.map(item => item.name)]
}

function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = values[key]
    return value && value.trim() ? value.trim() : '未填写'
  })
}

Page({
  data: {
    bannerUrl: '',
    bannerFallbackUrl: '',
    themeStyle: '',
    themePreset: 'minimal',
    bookingDecoration: DEFAULT_DECORATION.booking as BookingDecoration,
    bookingSections: DEFAULT_DECORATION.booking.sections,
    bookingFields: DEFAULT_DECORATION.booking.fields as BookingFieldDecoration[],
    terminology: { ...DEFAULT_DECORATION.terminology } as TerminologyDecoration,
    photographer: PHOTOGRAPHER,
    styleOptions: [...FALLBACK_STYLE_OPTIONS, '其他'],
    packages: [] as PackageItem[],
    stores: [] as StoreItem[],
    photographers: [] as TeamPhotographerItem[],
    packagePickerRange: ['暂不选择'],
    storePickerRange: ['暂不选择'],
    photographerPickerRange: ['暂不选择'],
    selectedPackageIndex: 0,
    selectedStoreIndex: 0,
    selectedPhotographerIndex: 0,
    selectedPackageName: '',
    selectedStoreName: '',
    selectedPhotographerName: '',
    schedule: { enabled: false } as Partial<ScheduleContent>,
    testimonials: [] as any[],
    consultation: DEFAULT_CONSULTATION,
    serviceFlow: { enabled: false, steps: [] } as Partial<ServiceFlowContent>,
    faq: { enabled: false, items: [] } as Partial<FaqContent>,
    quickJump: {
      enabled: true,
      bookingText: '咨询',
      portfolioText: '作品集'
    } as Partial<QuickJumpContent>,
    quickJumpVisible: true,
    share: { ...DEFAULT_SHARE_CONTENT } as ShareContent,
    formData: {
      name: '',
      contact: '',
      style: FALLBACK_STYLE_OPTIONS[0] || '',
      customStyle: '',
      packageId: '',
      storeId: '',
      photographerId: '',
      date: '',
      notes: ''
    },
    minDate: '',
    submitting: false,
    showSubmitBtn: false
  },

  async onShow() {
    await this.loadData()
  },

  async loadData() {
    const today = new Date()
    const minDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const {
      photographer,
      booking,
      theme,
      packages,
      schedule,
      testimonials,
      consultation,
      serviceFlow,
      faq,
      stores,
      photographers,
      quickJump,
      share,
      decoration,
      terminology
    } = await getBookingPageData()

    const styleOptions = normalizeStyleOptions(booking?.styleOptions)
    const selectedStyle = styleOptions.includes(this.data.formData.style)
      ? this.data.formData.style
      : styleOptions[0] || ''

    this.setData({
      bannerUrl: getCosUrl('banner/booking-banner.jpg'),
      bannerFallbackUrl: share.fallbackImageUrl || getCosUrl(photographer?.avatar || ''),
      themeStyle: buildThemeStyle(theme),
      themePreset: getThemePreset(theme),
      bookingDecoration: decoration,
      bookingSections: decoration.sections,
      bookingFields: decoration.fields,
      terminology,
      photographer: photographer || PHOTOGRAPHER,
      styleOptions: [...styleOptions, '其他'],
      packages,
      stores,
      photographers,
      packagePickerRange: getPickerNames(packages),
      storePickerRange: getPickerNames(stores),
      photographerPickerRange: getPickerNames(photographers),
      schedule: {
        enabled: false,
        specialNotes: [],
        restDays: [],
        busyDates: [],
        ...(schedule || {})
      },
      testimonials: testimonials || [],
      consultation: {
        ...DEFAULT_CONSULTATION,
        ...(consultation || {})
      },
      serviceFlow: {
        enabled: false,
        ...(serviceFlow || {}),
        steps: serviceFlow?.steps || []
      },
      faq: {
        enabled: false,
        ...(faq || {}),
        items: faq?.items || []
      },
      quickJump: {
        enabled: true,
        bookingText: '咨询',
        portfolioText: '作品集',
        ...(quickJump || {})
      },
      quickJumpVisible: shouldShowQuickJump(quickJump, 'booking'),
      share,
      'formData.style': selectedStyle,
      minDate
    })

    setPageNavigationTitle(consultation?.title || `预约${terminology.consultationLabel}`, '预约咨询')
    this.applyPrefillFromStorage()
  },

  applyPrefillFromStorage() {
    const prefill = wx.getStorageSync('prefillConsultation') || {}
    const updates: Record<string, any> = {}
    let removePrefill = false

    if (prefill.style && this.data.styleOptions.includes(prefill.style)) {
      updates['formData.style'] = prefill.style
      removePrefill = true
    }

    if (prefill.packageId) {
      const packageIndex = this.data.packages.findIndex(item => item.id === prefill.packageId)
      if (packageIndex >= 0) {
        const selectedPackage = this.data.packages[packageIndex]
        updates.selectedPackageIndex = packageIndex + 1
        updates.selectedPackageName = selectedPackage.name
        updates['formData.packageId'] = selectedPackage.id
        removePrefill = true
      }
    }

    if (Object.keys(updates).length > 0) {
      this.setData(updates)
    }

    if (removePrefill) {
      wx.removeStorageSync('prefillConsultation')
    }
  },

  onPageScroll() {
    const query = wx.createSelectorQuery()
    query.select('.booking-page').boundingClientRect()
    query.selectViewport().scrollOffset()
    query.exec((res) => {
      if (res[0] && res[1]) {
        const pageHeight = res[0].height
        const scrollTop = res[1].scrollTop
        const windowHeight = wx.getSystemInfoSync().windowHeight
        const isNearBottom = scrollTop + windowHeight > pageHeight - 100

        if (this.data.showSubmitBtn !== isNearBottom) {
          this.setData({ showSubmitBtn: isNearBottom })
        }
      }
    })
  },

  onBannerError() {
    const bannerFallbackUrl = this.data.bannerFallbackUrl
    this.setData({
      bannerUrl: bannerFallbackUrl && this.data.bannerUrl !== bannerFallbackUrl
        ? bannerFallbackUrl
        : ''
    })
  },

  onInputChange(e: WechatMiniprogram.Input) {
    const field = e.currentTarget.dataset.field as string
    this.setData({
      [`formData.${field}`]: e.detail.value
    })
  },

  onStyleSelect(e: WechatMiniprogram.TouchEvent) {
    const style = e.currentTarget.dataset.style as string
    this.setData({
      'formData.style': style
    })
  },

  onPackageChange(e: WechatMiniprogram.PickerChange) {
    const pickerIndex = Number(e.detail.value)
    const selectedPackage = pickerIndex > 0 ? this.data.packages[pickerIndex - 1] : null

    this.setData({
      selectedPackageIndex: pickerIndex,
      selectedPackageName: selectedPackage?.name || '',
      'formData.packageId': selectedPackage?.id || ''
    })
  },

  onStoreChange(e: WechatMiniprogram.PickerChange) {
    const pickerIndex = Number(e.detail.value)
    const selectedStore = pickerIndex > 0 ? this.data.stores[pickerIndex - 1] : null

    this.setData({
      selectedStoreIndex: pickerIndex,
      selectedStoreName: selectedStore?.name || '',
      'formData.storeId': selectedStore?.id || ''
    })
  },

  onPhotographerChange(e: WechatMiniprogram.PickerChange) {
    const pickerIndex = Number(e.detail.value)
    const selectedPhotographer = pickerIndex > 0 ? this.data.photographers[pickerIndex - 1] : null

    this.setData({
      selectedPhotographerIndex: pickerIndex,
      selectedPhotographerName: selectedPhotographer?.name || '',
      'formData.photographerId': selectedPhotographer?.id || ''
    })
  },

  onDateChange(e: WechatMiniprogram.PickerChange) {
    this.setData({
      'formData.date': e.detail.value
    })
  },

  validateForm(): boolean {
    const { name, contact, date, style, customStyle, packageId, storeId, photographerId, notes } = this.data.formData
    const values: Record<string, string> = {
      name,
      contact,
      date,
      style: style === '其他' ? customStyle : style,
      package: packageId,
      store: storeId,
      photographer: photographerId,
      notes
    }

    const missingField = this.data.bookingFields.find(field => {
      return field.enabled !== false && field.required === true && !String(values[field.id] || '').trim()
    })

    if (missingField) {
      const selectFieldIds = ['style', 'package', 'date', 'store', 'photographer']
      wx.showToast({
        title: `${selectFieldIds.includes(missingField.id) ? '请选择' : '请填写'}${missingField.label}`,
        icon: 'none'
      })
      return false
    }

    return true
  },

  getSelectedPackage(): PackageItem | null {
    return this.data.packages.find(item => item.id === this.data.formData.packageId) || null
  },

  getSelectedStore(): StoreItem | null {
    return this.data.stores.find(item => item.id === this.data.formData.storeId) || null
  },

  getSelectedPhotographer(): TeamPhotographerItem | null {
    return this.data.photographers.find(item => item.id === this.data.formData.photographerId) || null
  },

  async onSubmit() {
    if (!this.validateForm()) return

    this.setData({ submitting: true })

    const { name, contact, style, customStyle, date, notes } = this.data.formData
    const finalStyle = style === '其他' ? customStyle : style
    const selectedPackage = this.getSelectedPackage()
    const selectedStore = this.getSelectedStore()
    const selectedPhotographer = this.getSelectedPhotographer()
    const photographerName = selectedPhotographer?.name || this.data.photographer?.name || PHOTOGRAPHER.name
    const photographerWechat = this.data.photographer?.contact?.wechat || PHOTOGRAPHER.contact.wechat

    const consultationText = renderTemplate(this.data.consultation.template || DEFAULT_CONSULTATION.template, {
      name,
      contact,
      style: finalStyle,
      package: selectedPackage?.name || '',
      date,
      note: notes,
      store: selectedStore?.name || '',
      photographer: photographerName
    })

    const consultationData = {
      name,
      contact,
      style: finalStyle,
      packageId: selectedPackage?.id || '',
      packageName: selectedPackage?.name || '',
      date,
      storeId: selectedStore?.id || '',
      storeName: selectedStore?.name || '',
      photographerId: selectedPhotographer?.id || '',
      photographerName,
      note: notes,
      photographerWechat,
      text: consultationText,
      createdAt: new Date().toISOString()
    }

    wx.setStorageSync('lastConsultation', consultationData)
    this.setData({ submitting: false })

    wx.navigateTo({
      url: '/pages/success/success'
    })
  },

  onShareAppMessage() {
    return createShareMessage({
      pageType: 'booking',
      share: this.data.share,
      path: '/pages/booking/booking',
      contentImageUrl: this.data.share.fallbackImageUrl,
      imagePriority: 'global-first'
    })
  }
})
