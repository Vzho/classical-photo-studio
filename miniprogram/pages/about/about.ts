import { PHOTOGRAPHER } from '../../utils/constants'
import { buildThemeStyle, getAboutPageData, getCosUrl } from '../../utils/cos'

Page({
  data: {
    photographer: PHOTOGRAPHER,
    themeStyle: '',
    avatarUrl: '',
    bannerUrl: '',
    canOpenStudioLocation: false,
    stores: [] as any[],
    photographers: [] as any[],
    testimonials: [] as any[],
    serviceFlow: { enabled: false, steps: [] } as any,
    faq: { enabled: false, items: [] } as any
  },

  async onLoad() {
    // 优先加载远程配置的摄影师信息
    const { photographer: remoteProfile, theme, stores, photographers, testimonials, serviceFlow, faq } = await getAboutPageData()
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
    const bannerUrl = getCosUrl('banner/about-banner.jpg')
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
      avatarUrl: getCosUrl(profile.avatar),
      bannerUrl,
      canOpenStudioLocation: Number.isFinite(latitude) && Number.isFinite(longitude),
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
      }
    })
  },

  onBannerError() {
    console.log('Banner 加载失败，使用默认背景')
    this.setData({ bannerUrl: '' })
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
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

  goBooking() {
    wx.switchTab({ url: '/pages/booking/booking' })
  },

  onShareAppMessage() {
    return {
      title: '摄影作品合集 - 摄影师简介',
      path: '/pages/about/about'
    }
  }
})
