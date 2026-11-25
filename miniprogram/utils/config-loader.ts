// Config Loader（SaaS 多租户 · 方案 §3.2 / PRD C-01 C-05）：
// 三级容灾加载：Storage 本地缓存 → COS 远端（租户路径优先，遗留路径回退）→ 内置兜底配置。
// 并承载服务状态熔断（serviceStatus !== 'active' 时跳转维护提示页）。
//
// 该模块被 utils/cos.ts 的 requestRemoteConfig 薄封装调用，保持既有
// loadConfig 缓存与重试策略不变；不 import cos.ts 以避免循环依赖。

import { resolveTenantPaths, getRuntimeMode } from './tenant-resolver'

interface IAppOptionLike {
  globalData?: { cos?: { baseUrl?: string } }
}

const TENANT_CACHE_PREFIX = 'tenant-config-cache-'
const LEGACY_CACHE_KEY = 'portfolio-config-cache-v1'

export interface RemoteConfigResult {
  config: any
  /** 实际命中的 COS 对象 key（用于诊断与缓存归档） */
  sourceKey: string
}

function getBaseUrl(): string {
  const app = getApp<IAppOptionLike>()
  return String(app?.globalData?.cos?.baseUrl || '').replace(/\/+$/, '')
}

function buildObjectUrl(baseUrl: string, key: string): string {
  return `${baseUrl}/${key}`
}

function buildTenantCacheKey(appId: string): string {
  // 遗留模式沿用旧缓存 key，保持存量小程序缓存兼容
  return appId ? `${TENANT_CACHE_PREFIX}${appId}` : LEGACY_CACHE_KEY
}

/** 读取本地 Storage 缓存的租户配置（draft 模式不读缓存，保证实时预览）。 */
export function readTenantCachedConfig(appId: string): any | null {
  if (getRuntimeMode() === 'draft') return null
  try {
    const cached = wx.getStorageSync(buildTenantCacheKey(appId))
    if (cached && isValidPortfolioConfigLike(cached.config)) {
      return cached.config
    }
  } catch {
    // Storage 读取失败（容量/隐私模式）忽略
  }
  return null
}

/** 写入本地缓存（draft 模式不写，避免草稿污染正式缓存）。 */
export function rememberTenantConfig(appId: string, config: any): void {
  if (getRuntimeMode() === 'draft') return
  try {
    wx.setStorageSync(buildTenantCacheKey(appId), { config })
  } catch {
    // 写入失败忽略，不影响主流程
  }
}

function isValidPortfolioConfigLike(config: any): boolean {
  return Boolean(config && Array.isArray(config.themes))
}

function requestJson(url: string, timeout = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      timeout,
      success: (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Remote config returned HTTP ${res.statusCode}`))
          return
        }
        try {
          const config = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
          if (!isValidPortfolioConfigLike(config)) {
            reject(new Error('Invalid remote config'))
            return
          }
          resolve(config)
        } catch {
          reject(new Error('Invalid remote config JSON'))
        }
      },
      fail: (error) => {
        reject(new Error(`Remote config request failed: ${error?.errMsg || 'unknown'}`))
      }
    })
  })
}

/**
 * 远端拉取当前租户配置。
 * 顺序：draft 模式 → 仅 draft.json（实时，不缓存）；
 *       正式模式 → tenants/{appId}/config.json，失败回退 legacy 全局 key。
 * 返回实际命中的 key 与配置；租户路径 404（未迁移）时自动落到 legacy。
 */
export async function fetchRemoteTenantConfig(): Promise<RemoteConfigResult> {
  const baseUrl = getBaseUrl()
  if (!baseUrl) {
    return Promise.reject(new Error('COS baseUrl is not configured'))
  }

  const paths = resolveTenantPaths()
  const mode = getRuntimeMode()
  const targets: string[] = mode === 'draft' ? [paths.draftKey] : [paths.configKey, paths.legacyKey]

  let lastError: Error | null = null
  for (const key of targets) {
    try {
      const config = await requestJson(`${buildObjectUrl(baseUrl, key)}?t=${Date.now()}`)
      console.info('[portfolio-config] 使用 COS 配置:', buildObjectUrl(baseUrl, key))
      return { config, sourceKey: key }
    } catch (error) {
      lastError = error as Error
      // 404/无效配置视为“该路径不存在配置”，继续尝试下一个目标
      console.warn('[portfolio-config] 配置路径未命中，尝试回退:', key, lastError?.message)
    }
  }
  throw lastError || new Error('Remote config unavailable')
}

/**
 * 服务状态熔断（PRD C-05）：
 * 配置解析后校验 meta.serviceStatus；到期/冻结时 reLaunch 至维护提示页。
 * 规则：draft 模式不熔断（预览需要看到真实状态）；无 meta 字段的存量配置不熔断。
 */
export function enforceServiceStatus(config: any): boolean {
  if (!config || getRuntimeMode() === 'draft') return true
  const status = String(config?.meta?.serviceStatus || 'active').toLowerCase()
  if (status === 'active') return true
  if (status === 'expired' || status === 'suspended') {
    console.warn('[portfolio-config] 服务状态异常，进入维护提示页:', status)
    try {
      wx.reLaunch({ url: '/pages/suspended/suspended' })
    } catch {
      // reLaunch 失败（页面栈异常）忽略，页面渲染层会以空配置兜底
    }
    return false
  }
  // 未知状态值按正常处理，避免误伤
  return true
}
