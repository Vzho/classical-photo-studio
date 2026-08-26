import { NavigationItemKey } from './decoration'

export const SITE_PAGE_PATHS: Record<NavigationItemKey, string> = {
  portfolio: '/pages/portfolio/portfolio',
  gallery: '/pages/gallery/gallery',
  about: '/pages/about/about',
  packages: '/pages/packages/packages',
  booking: '/pages/booking/booking',
  stores: '/pages/stores/stores'
}

const TAB_PAGE_KEYS: NavigationItemKey[] = ['portfolio', 'about', 'packages', 'booking', 'stores']

export function navigateToSitePage(key: NavigationItemKey): void {
  const url = SITE_PAGE_PATHS[key]
  if (TAB_PAGE_KEYS.includes(key)) {
    wx.switchTab({ url })
    return
  }

  wx.navigateTo({ url })
}
