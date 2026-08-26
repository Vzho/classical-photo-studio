import { PHOTOGRAPHER } from '../../utils/constants'
import { handleConsultButtonAction, shouldShowConsultButton } from '../../utils/consult-action'
import { buildThemeStyle, ConsultButtonContent, DEFAULT_SHARE_CONTENT, getAboutPageData, getCosUrl, getThemePreset, PackageItem, PortfolioItem, QuickJumpContent, ShareContent, shouldShowQuickJump } from '../../utils/cos'
import { AboutDecoration, DEFAULT_DECORATION, ShowcaseDecoration, TerminologyDecoration } from '../../utils/decoration'
import { setPageNavigationTitle } from '../../utils/navigation'
import { createShareMessage } from '../../utils/share'

Page({
  data: {
    photographer: PHOTOGRAPHER,
    themeStyle: '',
    themePreset: 'minimal',
    decorationClass: '',
    decorationStyle: '',
    siteTemplate: 'classic' as 'classic' | 'dark-gallery',
    showcase: { ...DEFAULT_DECORATION.showcase } as ShowcaseDecoration,
    galleryItems: [] as PortfolioItem[],
    aboutDecoration: DEFAULT_DECORATION.about as AboutDecoration,
    aboutSections: DEFAULT_DECORATION.about.sections,
    terminology: { ...DEFAULT_DECORATION.terminology } as TerminologyDecoration,
    icons: DEFAULT_DECORATION.icons,
    avatarUrl: '',
    bannerUrl: '',
    bannerFallbackUrl: '',
    canOpenStudioLocation: false,
    studioLatitude: 0,
    studioLongitude: 0,
    studioMarkers: [] as Array<{ id: number; latitude: number; longitude: number; title: string }>,
    stores: [] as any[],
    selectedStore: null as any,
    packages: [] as PackageItem[],
    photographers: [] as any[],
    testimonials: [] as any[],
    serviceFlow: { enabled: false, steps: [] } as any,
    faq: { enabled: false, items: [] } as any,
    consultButton: {
      enabled: true,
      text: '发起拍摄咨询',
      action: 'booking'
    } as Partial<ConsultButtonContent>,
    consultButtonVisible: true,
    quickJump: {
      enabled: true,
      bookingText: '咨询',
      portfolioText: '作品集'
    } as Partial<QuickJumpContent>,
    quickJumpVisible: true,
    share: { ...DEFAULT_SHARE_CONTENT } as ShareContent
  },

  async loadData() {
    // 优先加载远程配置的摄影师信息
    const { photographer: remoteProfile, theme, consultButton, packages, stores, photographers, testimonials, serviceFlow, faq, quickJump, share, icons, decoration, terminology, siteTemplate, showcase, galleryItems, runtime } = await getAboutPageData()
    const profile = {
      ...PHOTOGRAPHER,
      ...(remoteProfile || {}),
      stats: remoteProfile?.stats || PHOTOGRAPHER.stats,
      skills: remoteProfile?.skills || PHOTOGRAPHER.skills,
      contact: {
        ...PHOTOGRAPHER.contact,
        ...(remoteProfile?.contact || {})
      },
      studio: {
        ...PHOTOGRAPHER.studio,
        ...(remoteProfile?.studio || {})
      }
    }
    
    // 加载 Banner
    const avatarUrl = getCosUrl(profile.avatar)
    const bannerUrl = getCosUrl('banner/about-banner.jpg')
    const bannerFallbackUrl = share.fallbackImageUrl || avatarUrl
    const studioLatitude = profile.studio?.latitude as unknown
    const studioLongitude = profile.studio?.longitude as unknown
    const hasStudioCoordinates = studioLatitude !== null
      && studioLatitude !== undefined
      && studioLatitude !== ''
      && studioLongitude !== null
      && studioLongitude !== undefined
      && studioLongitude !== ''
    const latitude = hasStudioCoordinates ? Number(studioLatitude) : NaN
    const longitude = hasStudioCoordinates ? Number(studioLongitude) : NaN

    this.setData({
      photographer: profile,
      themeStyle: buildThemeStyle(theme),
      themePreset: getThemePreset(theme),
      decorationClass: runtime.className,
      decorationStyle: runtime.style,
      siteTemplate,
      showcase,
      galleryItems,
      aboutDecoration: decoration,
      aboutSections: decoration.sections,
      terminology,
      icons,
      avatarUrl,
      bannerUrl,
      bannerFallbackUrl,
      canOpenStudioLocation: Number.isFinite(latitude) && Number.isFinite(longitude),
      studioLatitude: Number.isFinite(latitude) ? latitude : 0,
      studioLongitude: Number.isFinite(longitude) ? longitude : 0,
      studioMarkers: Number.isFinite(latitude) && Number.isFinite(longitude)
        ? [{ id: 1, latitude, longitude, title: profile.studio?.name || '门店位置' }]
        : [],
      packages: packages.map(item => ({
        ...item,
        includes: item.includes || [],
        suitableFor: item.suitableFor || []
      })),
      stores,
      photographers: photographers.map(item => ({
        ...item,
        avatar: item.avatar ? getCosUrl(item.avatar) : ''
      })),
      testimonials,
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
      consultButton: {
        enabled: true,
        text: '发起拍摄咨询',
        action: 'booking',
        ...(consultButton || {})
      },
      consultButtonVisible: shouldShowConsultButton(consultButton || { enabled: true }, 'about'),
      quickJump: {
        enabled: true,
        bookingText: '咨询',
        portfolioText: '作品集',
        ...(quickJump || {})
      },
      quickJumpVisible: shouldShowQuickJump(quickJump, 'about'),
      share
    })

    setPageNavigationTitle(profile.name, '店铺简介')
  },

  onBannerError() {
    const bannerFallbackUrl = this.data.bannerFallbackUrl
    this.setData({
      bannerUrl: bannerFallbackUrl && this.data.bannerUrl !== bannerFallbackUrl
        ? bannerFallbackUrl
        : ''
    })
  },

  async onShow() {
    await this.loadData()
  },

  copyWechat() {
    const wechat = this.data.photographer?.contact?.wechat || PHOTOGRAPHER.contact.wechat

    wx.setClipboardData({
      data: wechat,
      success: () => {
        wx.showToast({ title: '微信号已复制', icon: 'success' })
      }
    })
  },

  copyEmail() {
    const email = this.data.photographer?.contact?.email || PHOTOGRAPHER.contact.email

    wx.setClipboardData({
      data: email,
      success: () => {
        wx.showToast({ title: '邮箱已复制', icon: 'success' })
      }
    })
  },

  showStudioNavigationFallback(message = '当前环境不支持直接拉起地图导航，请打开手机微信后重试，或粘贴已复制的地址到地图中搜索。') {
    const studio = this.data.photographer?.studio || PHOTOGRAPHER.studio
    const address = [studio.name, studio.address].filter(Boolean).join('\n')

    if (address) {
      wx.setClipboardData({
        data: address,
        success: () => {
          wx.showModal({
            title: '已复制店铺地址',
            content: message,
            showCancel: false,
            confirmText: '知道了'
          })
        }
      })
      return
    }

    wx.showToast({ title: '店铺定位暂未配置', icon: 'none' })
  },

  openStudioLocation() {
    const studio = this.data.photographer?.studio || PHOTOGRAPHER.studio
    const studioLatitude = studio.latitude as unknown
    const studioLongitude = studio.longitude as unknown
    const hasStudioCoordinates = studioLatitude !== null
      && studioLatitude !== undefined
      && studioLatitude !== ''
      && studioLongitude !== null
      && studioLongitude !== undefined
      && studioLongitude !== ''
    const latitude = hasStudioCoordinates ? Number(studioLatitude) : NaN
    const longitude = hasStudioCoordinates ? Number(studioLongitude) : NaN

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      this.showStudioNavigationFallback('当前还未配置可用的地图坐标，请打开地图后粘贴已复制的地址进行搜索。')
      return
    }

    const platform = wx.getSystemInfoSync().platform
    if (platform === 'devtools' || platform === 'windows' || platform === 'mac') {
      this.showStudioNavigationFallback('开发者工具或桌面端通常无法直接拉起地图导航，请在手机微信中打开小程序使用导航，或粘贴已复制的地址到地图中搜索。')
      return
    }

    wx.openLocation({
      latitude,
      longitude,
      scale: 18,
      name: studio.name || '门店地址',
      address: studio.address || '',
      fail: () => {
        this.showStudioNavigationFallback('当前环境未能成功打开地图导航，请在手机微信中重试，或粘贴已复制的地址到地图中搜索。')
      }
    })
  },

  copyStudioAddress() {
    const studio = this.data.photographer?.studio || PHOTOGRAPHER.studio
    const address = [studio.name, studio.address].filter(Boolean).join('\n')

    if (!address) {
      wx.showToast({ title: '暂无店铺地址', icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: address,
      success: () => {
        wx.showToast({ title: '地址已复制', icon: 'success' })
      }
    })
  },

  copyStoreAddress(e: WechatMiniprogram.TouchEvent) {
    const index = Number(e.currentTarget.dataset.index)
    const store = this.data.stores[index]
    const address = [store?.name, store?.address].filter(Boolean).join('\n')

    if (!address) {
      wx.showToast({ title: '暂无门店地址', icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: address,
      success: () => {
        wx.showToast({ title: '地址已复制', icon: 'success' })
      }
    })
  },

  openStoreDetail(e: WechatMiniprogram.TouchEvent) {
    const index = Number(e.currentTarget.dataset.index)
    const store = this.data.stores[index]
    if (!store) return

    this.setData({ selectedStore: store })
  },

  closeStoreDetail() {
    this.setData({ selectedStore: null })
  },

  noop() {},

  copySelectedStoreAddress() {
    const store = this.data.selectedStore
    const address = [store?.name, store?.address].filter(Boolean).join('\n')

    if (!address) {
      wx.showToast({ title: '暂无门店地址', icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: address,
      success: () => {
        wx.showToast({ title: '地址已复制', icon: 'success' })
      }
    })
  },

  getStoreCoordinates(store: any): { latitude: number; longitude: number } | null {
    const rawLatitude = store?.latitude
    const rawLongitude = store?.longitude
    const hasCoordinates = rawLatitude !== null
      && rawLatitude !== undefined
      && rawLatitude !== ''
      && rawLongitude !== null
      && rawLongitude !== undefined
      && rawLongitude !== ''
    const latitude = hasCoordinates ? Number(rawLatitude) : NaN
    const longitude = hasCoordinates ? Number(rawLongitude) : NaN

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null
    }

    return { latitude, longitude }
  },

  showStoreNavigationFallback(store: any, message = '当前门店未配置可用地图坐标，请打开地图后粘贴已复制的地址进行搜索。') {
    const address = [store?.name, store?.address].filter(Boolean).join('\n')

    if (!address) {
      wx.showToast({ title: '暂无门店地址', icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: address,
      success: () => {
        wx.showModal({
          title: '已复制门店地址',
          content: message,
          showCancel: false,
          confirmText: '知道了'
        })
      }
    })
  },

  openStoreLocation(e: WechatMiniprogram.TouchEvent) {
    const index = Number(e.currentTarget.dataset.index)
    const store = this.data.stores[index]
    const coordinates = this.getStoreCoordinates(store)

    if (!coordinates) {
      this.showStoreNavigationFallback(store)
      return
    }

    const platform = wx.getSystemInfoSync().platform
    if (platform === 'devtools' || platform === 'windows' || platform === 'mac') {
      this.showStoreNavigationFallback(store, '开发者工具或桌面端通常无法直接拉起地图导航，请在手机微信中打开小程序使用导航，或粘贴已复制的地址到地图中搜索。')
      return
    }

    wx.openLocation({
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      scale: 18,
      name: store?.name || '门店地址',
      address: store?.address || '',
      fail: () => {
        this.showStoreNavigationFallback(store, '当前环境未能成功打开地图导航，请在手机微信中重试，或粘贴已复制的地址到地图中搜索。')
      }
    })
  },

  callStorePhone(e: WechatMiniprogram.TouchEvent) {
    const index = Number(e.currentTarget.dataset.index)
    const store = this.data.stores[index]
    const phone = String(store?.phone || '').trim()

    if (!phone) {
      wx.showToast({ title: '暂未配置门店电话', icon: 'none' })
      return
    }

    wx.makePhoneCall({
      phoneNumber: phone,
      fail: () => {
        wx.setClipboardData({
          data: phone,
          success: () => {
            wx.showToast({ title: '电话已复制', icon: 'success' })
          }
        })
      }
    })
  },

  goBooking() {
    handleConsultButtonAction(this.data.consultButton)
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

  onShareAppMessage() {
    return createShareMessage({
      pageType: 'about',
      share: this.data.share,
      path: '/pages/about/about',
      contentImageUrl: this.data.share.fallbackImageUrl,
      imagePriority: 'global-first'
    })
  }
})
