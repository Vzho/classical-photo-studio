// Image Optimizer（SaaS 多租户 · PRD C-03 / 性能指标 §5.2）：
// 统一封装腾讯云数据万象（CI）图片处理参数拼接。
//   withThumb     — 列表页缩略图：WebP + 指定宽度（单张目标 <150KB）
//   withWatermark — 防盗版权文字水印（数据万象 imageMogr2 watermark 指令）
// 纯字符串拼接、无副作用；相对路径自动基于 COS baseUrl 补全。

import { getRuntimeMode } from './tenant-resolver'

interface IAppOptionLike {
  globalData?: { cos?: { baseUrl?: string } }
}

function resolveAbsoluteUrl(url: string): string {
  const trimmed = String(url || '').trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  const app = getApp<IAppOptionLike>()
  const baseUrl = String(app?.globalData?.cos?.baseUrl || '').replace(/\/+$/, '')
  if (!baseUrl) return trimmed
  return `${baseUrl}/${trimmed.replace(/^\/+/, '')}`
}

function appendParams(url: string, params: string[]): string {
  if (!params.length) return url
  return url + (url.includes('?') ? '&' : '?') + params.join('/')
}

export interface ThumbOptions {
  /** 输出格式，默认 webp */
  format?: string
  /** 压缩质量 0~100，默认 80 */
  quality?: number
}

/** 列表缩略图：format/webp + thumbnail/{width}x + quality。 */
export function withThumb(url: string, width: number, options?: ThumbOptions): string {
  const absolute = resolveAbsoluteUrl(url)
  if (!absolute) return ''
  const format = options?.format ?? 'webp'
  const quality = options?.quality ?? 80
  const params: string[] = ['imageMogr2', `format/${format}`]
  if (width > 0) params.push(`thumbnail/${Math.round(width)}x`)
  if (quality > 0) params.push(`quality/${Math.round(quality)}`)
  return appendParams(absolute, params)
}

export interface WatermarkOptions {
  /** 水印文字字号（数据万象单位），默认 20 */
  fontSize?: number
  /** 不透明度 0~100，默认 35 */
  opacity?: number
  /** 水印位置，默认东南角 */
  gravity?: string
  /** 文字颜色十六进制（不含 #），默认 7f7f7f */
  fill?: string
}

/** 防盗水印：数据万象文字水印，text 需 base64（内部自动编码）。 */
export function withWatermark(url: string, text: string, options?: WatermarkOptions): string {
  const absolute = resolveAbsoluteUrl(url)
  if (!absolute || !text) return absolute
  const fontSize = Math.round(options?.fontSize ?? 20)
  const opacity = Math.max(1, Math.min(100, Math.round(options?.opacity ?? 35)))
  const gravity = options?.gravity ?? 'southeast'
  const fill = (options?.fill || '7f7f7f').replace('#', '')
  let encoded = ''
  try {
    // wx 环境无 btoa：手动 UTF-8 + base64
    encoded = base64Utf8(text)
  } catch {
    return absolute
  }
  const params: string[] = [
    'watermark/1',
    `text/${encoded}`,
    `fontsize/${fontSize}`,
    `dissolve/${opacity}`,
    `gravity/${gravity}`,
    `fill/${fill}`
  ]
  return appendParams(absolute, params)
}

function base64Utf8(input: string): string {
  const bytes: number[] = []
  for (let i = 0; i < input.length; i++) {
    let code = input.charCodeAt(i)
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < input.length) {
      // 代理对合并为完整码点
      const next = input.charCodeAt(i + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = (code - 0xd800) * 0x400 + (next - 0xdc00) + 0x10000
        i++
      }
    }
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      )
    }
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : -1
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : -1
    out += chars[b0 >> 2]
    out += chars[((b0 & 0x03) << 4) | (b1 >= 0 ? b1 >> 4 : 0)]
    out += b1 >= 0 ? chars[((b1 & 0x0f) << 2) | (b2 >= 0 ? b2 >> 6 : 0)] : '='
    out += b2 >= 0 ? chars[b2 & 0x3f] : '='
  }
  return out
}

/** draft 预览模式下禁用水印（方便摄影师审片），正式模式启用。 */
export function shouldApplyWatermark(): boolean {
  return getRuntimeMode() !== 'draft'
}
