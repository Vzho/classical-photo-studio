// Theme Service（方案 §7.1、§6）：把受控 Token 档位转换为 CSS 变量。
// 客户只能选择档位（字体组合 / 密度 / 圆角 / 按钮 / 蒙层），不允许任意数值。
import { V3RuntimeConfig } from '../compatibility/v25-adapter'

export interface V3ThemeTokens {
  fontPair: string
  density: string
  radiusMood: string
  buttonStyle: string
  overlayMask: string
  colorScheme: string
  accentColor: string
}

export interface V3Theme {
  style: string
  tokens: V3ThemeTokens
}

const FONT_STACKS: Record<string, { display: string; body: string; letterSpacing: string; headingWeight: string }> = {
  'editorial-serif': {
    display: '"Songti SC", "STSong", "SimSun", serif',
    body: '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif',
    letterSpacing: '0.08em',
    headingWeight: '600'
  },
  'soft-lifestyle': {
    display: '"PingFang SC", "Hiragino Sans GB", sans-serif',
    body: '"PingFang SC", "Hiragino Sans GB", sans-serif',
    letterSpacing: '0.04em',
    headingWeight: '500'
  },
  'modern-sans': {
    display: '-apple-system, "Helvetica Neue", "PingFang SC", sans-serif',
    body: '-apple-system, "Helvetica Neue", "PingFang SC", sans-serif',
    letterSpacing: '0.02em',
    headingWeight: '600'
  }
}

const DENSITY_TIERS: Record<string, { page: string; section: string; card: string; text: string }> = {
  compact: { page: '32rpx', section: '56rpx', card: '16rpx', text: '8rpx' },
  standard: { page: '40rpx', section: '88rpx', card: '24rpx', text: '12rpx' },
  relaxed: { page: '48rpx', section: '128rpx', card: '32rpx', text: '16rpx' }
}

const RADIUS_TIERS: Record<string, { image: string; card: string; button: string }> = {
  sharp: { image: '0rpx', card: '4rpx', button: '4rpx' },
  light: { image: '12rpx', card: '16rpx', button: '999rpx' },
  soft: { image: '28rpx', card: '32rpx', button: '999rpx' }
}

const OVERLAY_OPACITY: Record<string, string> = {
  none: '0',
  light: '0.18',
  medium: '0.32',
  dark: '0.5'
}

function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : fallback
}

function mapLegacyRadius(imageRadius: unknown): string {
  switch (imageRadius) {
    case 'none': return 'sharp'
    case 'small': return 'light'
    case 'medium':
    case 'large': return 'soft'
    default: return ''
  }
}

function mapLegacyDensity(layoutDensity: unknown): string {
  switch (layoutDensity) {
    case 'compact': return 'compact'
    case 'spacious':
    case 'relaxed': return 'relaxed'
    case 'standard':
    case 'normal': return 'standard'
    default: return ''
  }
}

/**
 * 由 v3 运行时（含 v2.5 适配结果）构建页面主题：
 * - designTokens（受控档位）优先；
 * - 旧 theme 颜色字段作为底色来源；
 * - 输出 CSS 变量字符串与逻辑 Token。
 */
export function buildV3Theme(runtime: V3RuntimeConfig): V3Theme {
  // v2.5 适配时 designTokens 已包含 theme 字段；原生 v3 运行时直接携带受控档位。
  const tokens: Record<string, any> = { ...(runtime.designTokens || {}) }

  const background = normalizeHexColor(tokens.backgroundColor, '#ffffff')
  const surface = normalizeHexColor(tokens.surfaceColor, '#f7f5f2')
  const surfaceMuted = normalizeHexColor(tokens.surfaceMutedColor, '#efece7')
  const text = normalizeHexColor(tokens.textColor, '#1c1917')
  const muted = normalizeHexColor(tokens.mutedTextColor, '#78716c')
  const divider = normalizeHexColor(tokens.dividerColor, '#e7e5e4')
  const accent = normalizeHexColor(tokens.accentColor || tokens.primaryColor, '#111111')
  const onMedia = '#ffffff'

  const isDarkSurface = background.toLowerCase() === '#000000' || tokens.preset === 'dark-gallery'
  const resolvedBackground = isDarkSurface && background === '#ffffff' ? '#0c0a09' : background
  const resolvedText = isDarkSurface && text === '#1c1917' ? '#f5f5f4' : text
  const resolvedMuted = isDarkSurface && muted === '#78716c' ? '#a8a29e' : muted

  const fontPair = String(tokens.fontPair || (tokens.fontStyle === 'serif' ? 'editorial-serif' : 'modern-sans'))
  const density = String(tokens.density || mapLegacyDensity(tokens.layoutDensity) || 'standard')
  const radiusMood = String(tokens.radiusMood || mapLegacyRadius(tokens.imageRadius) || 'light')
  const buttonStyle = String(tokens.buttonStyle || 'solid')
  const overlayMask = String(tokens.overlayMask || 'medium')

  const font = FONT_STACKS[fontPair] || FONT_STACKS['modern-sans']
  const spacing = DENSITY_TIERS[density] || DENSITY_TIERS.standard
  const radius = RADIUS_TIERS[radiusMood] || RADIUS_TIERS.light
  const overlayOpacity = OVERLAY_OPACITY[overlayMask] ?? OVERLAY_OPACITY.medium

  const style = [
    `--v3-color-bg:${resolvedBackground}`,
    `--v3-color-surface:${surface}`,
    `--v3-color-surface-muted:${surfaceMuted}`,
    `--v3-color-text:${resolvedText}`,
    `--v3-color-muted:${resolvedMuted}`,
    `--v3-color-divider:${divider}`,
    `--v3-color-accent:${accent}`,
    `--v3-color-on-media:${onMedia}`,
    `--v3-overlay:rgba(0,0,0,${overlayOpacity})`,
    `--v3-font-display:${font.display}`,
    `--v3-font-body:${font.body}`,
    `--v3-heading-weight:${font.headingWeight}`,
    `--v3-letter-spacing:${font.letterSpacing}`,
    `--v3-space-page:${spacing.page}`,
    `--v3-space-section:${spacing.section}`,
    `--v3-space-card:${spacing.card}`,
    `--v3-space-text:${spacing.text}`,
    `--v3-radius-image:${radius.image}`,
    `--v3-radius-card:${radius.card}`,
    `--v3-radius-button:${radius.button}`
  ].join(';')

  return {
    style,
    tokens: {
      fontPair,
      density,
      radiusMood,
      buttonStyle,
      overlayMask,
      colorScheme: String(tokens.colorScheme || ''),
      accentColor: accent
    }
  }
}
