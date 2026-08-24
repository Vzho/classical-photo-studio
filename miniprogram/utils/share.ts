import { getCosUrl } from './cos'
import type { ShareContent } from './cos'

export type SharePageType = 'portfolio' | 'series' | 'about' | 'stores' | 'packages' | 'package-detail' | 'booking'
export type ShareImagePriority = 'content-first' | 'global-first'

export const FALLBACK_SHARE_IMAGE = '/assets/share-default.png'

const PAGE_PREFIX: Partial<Record<SharePageType, string>> = {
  about: '妆造师介绍',
  stores: '门店信息',
  packages: '拍摄套餐',
  booking: '预约咨询'
}

export interface CreateShareMessageOptions {
  pageType: SharePageType
  share: ShareContent
  path: string
  contentTitle?: string
  contentImageUrl?: string
  imagePriority?: ShareImagePriority
}

interface ShareMessageResult {
  title: string
  path: string
  imageUrl: string
}

const imageCache: Record<string, string> = {}

export function buildShareTitle(pageType: SharePageType, baseTitle: string, contentTitle = ''): string {
  const normalizedBase = String(baseTitle || '').trim() || '妆造作品合集'
  if (pageType === 'portfolio') return normalizedBase

  const prefix = pageType === 'series' || pageType === 'package-detail'
    ? String(contentTitle || '').trim()
    : PAGE_PREFIX[pageType]

  return prefix ? `${prefix}｜${normalizedBase}` : normalizedBase
}

export function isSupportedShareImage(value: string): boolean {
  const cleanPath = String(value || '').split('?')[0].toLowerCase()
  return /\.(jpe?g|png)$/.test(cleanPath)
}

function getConfiguredImageUrl(imagePath: string): string {
  const value = String(imagePath || '').trim()
  if (!value) return ''
  if (/^(https?:\/\/|\/)/i.test(value)) return value
  return getCosUrl(value)
}

function uniqueSupportedImages(values: string[]): string[] {
  return Array.from(new Set(values.map(value => String(value || '').trim())))
    .filter(value => value && isSupportedShareImage(value))
}

function downloadShareImage(imageUrl: string): Promise<string> {
  if (!/^https?:\/\//i.test(imageUrl)) return Promise.resolve(imageUrl)
  if (imageCache[imageUrl]) return Promise.resolve(imageCache[imageUrl])

  return new Promise(resolve => {
    wx.downloadFile({
      url: imageUrl,
      success: result => {
        if (result.statusCode === 200 && result.tempFilePath) {
          imageCache[imageUrl] = result.tempFilePath
          resolve(result.tempFilePath)
          return
        }

        resolve('')
      },
      fail: () => resolve('')
    })
  })
}

async function resolveFirstImage(candidates: string[]): Promise<string> {
  for (const candidate of candidates) {
    const resolved = await downloadShareImage(candidate)
    if (resolved) return resolved
  }

  return FALLBACK_SHARE_IMAGE
}

function resolveWithin(candidates: string[], timeoutMs: number): Promise<string> {
  return new Promise(resolve => {
    let settled = false
    const timer = setTimeout(() => {
      settled = true
      resolve(FALLBACK_SHARE_IMAGE)
    }, timeoutMs)

    resolveFirstImage(candidates).then(imageUrl => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(imageUrl)
    })
  })
}

export function createShareMessage(options: CreateShareMessageOptions) {
  const title = buildShareTitle(options.pageType, options.share.title, options.contentTitle)
  const globalImage = getConfiguredImageUrl(options.share.imagePath)
  const contentImage = String(options.contentImageUrl || '').trim()
  const configuredFallback = String(options.share.fallbackImageUrl || '').trim()
  const ordered = options.imagePriority === 'content-first'
    ? [contentImage, globalImage, configuredFallback]
    : [globalImage, contentImage, configuredFallback]
  const candidates = uniqueSupportedImages(ordered)
  const promise = resolveWithin(candidates, 2500).then<ShareMessageResult>(imageUrl => ({
    title,
    path: options.path,
    imageUrl
  }))

  return {
    title,
    path: options.path,
    imageUrl: FALLBACK_SHARE_IMAGE,
    promise
  }
}
