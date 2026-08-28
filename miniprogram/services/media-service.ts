// Media Service（方案 §7.1、§7.5）：图片 URL、缩略参数、焦点与裁切。
// 作品详情原图不裁切（widthFix）；Hero / 封面走受控 cover 容器，读取焦点配置。
import { getCosUrl } from '../utils/cos'

export interface MediaMeta {
  width?: number
  height?: number
  focalPoint?: { x: number; y: number }
  alt?: string
  crops?: {
    hero?: CropConfig
    card?: CropConfig
    packageBanner?: CropConfig
  }
}

export interface CropConfig {
  focalPoint?: { x: number; y: number }
  zoom?: number
}

export type CropKey = 'hero' | 'card' | 'packageBanner'

export function thumbnailUrl(photoName: string, width = 400): string {
  return getCosUrl(`portfolio/${photoName}`, { width, format: 'webp' })
}

export function originalUrl(photoName: string): string {
  return getCosUrl(`portfolio/${photoName}`)
}

function clampUnit(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.min(1, Math.max(0, value))
}

/**
 * 按“裁切用途 > 图片焦点 > 居中”解析 object-position。
 * 未配置焦点时返回空串，容器使用默认居中裁切。
 */
export function resolveObjectPosition(
  mediaMeta: Record<string, MediaMeta> | undefined,
  imageKey: string,
  cropKey?: CropKey
): string {
  const meta = mediaMeta?.[imageKey]
  if (!meta) return ''

  const crop = cropKey ? meta.crops?.[cropKey] : undefined
  const focal = crop?.focalPoint || meta.focalPoint
  const x = clampUnit(focal?.x)
  const y = clampUnit(focal?.y)
  if (x === null || y === null) return ''
  return `object-position:${(x * 100).toFixed(1)}% ${(y * 100).toFixed(1)}%`
}

// 低清晰度保护（方案 §16）：已知尺寸过小时提示区块降级。
export function isLowResolution(meta: MediaMeta | undefined, minWidth = 600): boolean {
  if (!meta || !meta.width || !meta.height) return false
  return meta.width < minWidth
}
