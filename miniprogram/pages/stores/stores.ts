import { PHOTOGRAPHER } from '../../utils/constants'
import {
  buildThemeStyle,
  DEFAULT_SHARE_CONTENT,
  getAboutPageData,
  getCosUrl,
  getThemePreset,
  QuickJumpContent,
  ShareContent,
  shouldShowQuickJump,
  StoreItem
} from '../../utils/cos'
import { DEFAULT_DECORATION, DecorationSection } from '../../utils/decoration'
import { setPageNavigationTitle } from '../../utils/navigation'
import { createShareMessage } from '../../utils/share'

function getCoordinates(store: StoreItem): { latitude: number; longitude: number } | null {
  const hasCoordinates = store.latitude !== null
    && store.latitude !== undefined
    && store.latitude !== ('' as unknown)
    && store.longitude !== null
    && store.longitude !== undefined
    && store.longitude !== ('' as unknown)
  const latitude = hasCoordinates ? Number(store.latitude) : NaN
  const longitude = hasCoordinates ? Number(store.longitude) : NaN

  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude }
    : null
}

Page({
  data: {
    themeStyle: '',
    themePreset: 'minimal',
    bannerUrl: '',
    stores: [] as StoreItem[],
    section: DEFAULT_DECORATION.about.sections.find(item => item.type === 'stores') as DecorationSection,
    icons: DEFAULT_DECORATION.icons,
    quickJump: {
      enabled: true,
      bookingText: '咨询',
      portfolioText: '作品集'
    } as Partial<QuickJumpContent>,
    quickJumpVisible: true,
    share: { ...DEFAULT_SHARE_CONTENT } as ShareContent
  },

  async onShow() {
    const { photographer, theme, stores, quickJump, share, icons, decoration } = await getAboutPageData()
    const profile = {
      ...PHOTOGRAPHER,
      ...(photographer || {}),
      contact: { ...PHOTOGRAPHER.contact, ...(photographer?.contact || {}) },
      studio: { ...PHOTOGRAPHER.studio, ...(photographer?.studio || {}) }
    }
    const fallbackStore: StoreItem | null = profile.studio?.name || profile.studio?.address
      ? {
          id: 'primary-store',
          name: profile.studio.name || '门店信息',
          address: profile.studio.address || '',
          phone: profile.contact?.phone || '',
          latitude: profile.studio.latitude,
          longitude: profile.studio.longitude,
          enabled: true
        }
      : null
    const section = decoration.sections.find(item => item.type === 'stores')
      || DEFAULT_DECORATION.about.sections.find(item => item.type === 'stores')!

    this.setData({
      themeStyle: buildThemeStyle(theme),
      themePreset: getThemePreset(theme),
      bannerUrl: getCosUrl('banner/about-banner.jpg'),
      stores: stores.length ? stores : (fallbackStore ? [fallbackStore] : []),
      section,
      icons,
      quickJump: {
        enabled: true,
        bookingText: '咨询',
        portfolioText: '作品集',
        ...(quickJump || {})
      },
      quickJumpVisible: shouldShowQuickJump(quickJump, 'stores'),
      share
    })

    setPageNavigationTitle(section.title || '门店信息', '门店信息')
  },

  onBannerError() {
    this.setData({ bannerUrl: '' })
  },

  copyStoreAddress(e: WechatMiniprogram.TouchEvent) {
    const store = this.data.stores[Number(e.currentTarget.dataset.index)]
    const address = [store?.name, store?.address].filter(Boolean).join('\n')
    if (!address) {
      wx.showToast({ title: '暂无门店地址', icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: address,
      success: () => wx.showToast({ title: '地址已复制', icon: 'success' })
    })
  },

  openStoreLocation(e: WechatMiniprogram.TouchEvent) {
    const store = this.data.stores[Number(e.currentTarget.dataset.index)]
    if (!store) return
    const coordinates = getCoordinates(store)
    const platform = wx.getSystemInfoSync().platform

    if (!coordinates || platform === 'devtools' || platform === 'windows' || platform === 'mac') {
      const message = coordinates
        ? '请在手机微信中打开小程序使用地图导航。门店地址已复制。'
        : '当前门店还未填写地图坐标。门店地址已复制，可粘贴到地图中搜索。'
      const address = [store.name, store.address].filter(Boolean).join('\n')
      if (!address) {
        wx.showToast({ title: '暂无门店地址', icon: 'none' })
        return
      }
      wx.setClipboardData({
        data: address,
        success: () => wx.showModal({ title: '已复制门店地址', content: message, showCancel: false })
      })
      return
    }

    wx.openLocation({
      ...coordinates,
      scale: 18,
      name: store.name || '门店地址',
      address: store.address || '',
      fail: () => this.copyStoreAddress(e)
    })
  },

  callStorePhone(e: WechatMiniprogram.TouchEvent) {
    const store = this.data.stores[Number(e.currentTarget.dataset.index)]
    const phone = String(store?.phone || '').trim()
    if (!phone) {
      wx.showToast({ title: '暂未填写门店电话', icon: 'none' })
      return
    }

    wx.makePhoneCall({
      phoneNumber: phone,
      fail: () => wx.setClipboardData({ data: phone })
    })
  },

  goBooking() {
    wx.switchTab({ url: '/pages/booking/booking' })
  },

  onShareAppMessage() {
    return createShareMessage({
      pageType: 'stores',
      share: this.data.share,
      path: '/pages/stores/stores',
      contentImageUrl: this.data.share.fallbackImageUrl,
      imagePriority: 'global-first'
    })
  }
})
