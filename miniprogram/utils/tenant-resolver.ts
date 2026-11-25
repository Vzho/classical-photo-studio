// Tenant Resolver（SaaS 多租户 · 方案 §3.2）：
// 运行时自动识别当前小程序 AppID 并解析租户配置路径，支持 draft 草稿预览模式。
// 同一套编译产物通过 miniprogram-ci 批量发版至不同 AppID 时，无需修改任何代码。
//
// 路径规范：
//   正式配置  tenants/{appId}/config.json
//   草稿配置  tenants/{appId}/draft.json（扫码预览码携带 mode=draft 时读取）
//   遗留路径  config/portfolio-config.json（单租户时代的存量线上数据，作为回退）

export type RuntimeMode = 'published' | 'draft'

export interface TenantPaths {
  /** 当前小程序 AppID；开发工具或识别失败时为空字符串 */
  appId: string
  /** 是否处于租户模式（成功识别 AppID 时为 true） */
  isTenantMode: boolean
  /** 正式配置的 COS 对象 key */
  configKey: string
  /** 草稿配置的 COS 对象 key */
  draftKey: string
  /** 遗留全局配置的 COS 对象 key（兼容存量线上数据） */
  legacyKey: string
}

let cachedAppId: string | null = null
let cachedPaths: TenantPaths | null = null

/** 获取当前小程序 AppID；失败返回空字符串（进入 legacy 兼容模式）。 */
export function getCurrentAppId(): string {
  if (cachedAppId !== null) return cachedAppId
  let appId = ''
  try {
    const account = wx.getAccountInfoSync()
    appId = String(account?.miniProgram?.appId || '').trim()
  } catch {
    // 基础库过低或环境异常：保持空值，走 legacy 路径
    appId = ''
  }
  cachedAppId = appId
  return appId
}

/** 解析运行模式：进入参数携带 mode=draft 时为草稿预览（跳缓存实时拉取）。 */
export function getRuntimeMode(): RuntimeMode {
  try {
    // 优先取最近一次进入参数（覆盖热启动 scene 刷新）
    const enter = wx.getEnterOptionsSync?.()
    const query = (enter?.query || {}) as Record<string, string>
    if (String(query.mode || '').toLowerCase() === 'draft') return 'draft'
    const launch = wx.getLaunchOptionsSync()
    const launchQuery = (launch?.query || {}) as Record<string, string>
    if (String(launchQuery.mode || '').toLowerCase() === 'draft') return 'draft'
  } catch {
    // 解析失败按正式模式处理
  }
  return 'published'
}

/**
 * 解析当前租户的 COS 配置路径。
 * 成功识别 AppID → 租户路径；失败 → 遗留全局路径（存量单租户小程序行为不变）。
 */
export function resolveTenantPaths(): TenantPaths {
  if (cachedPaths) return cachedPaths
  const appId = getCurrentAppId()
  const isTenantMode = appId.length > 0
  const root = isTenantMode ? `tenants/${appId}` : ''
  cachedPaths = {
    appId,
    isTenantMode,
    configKey: isTenantMode ? `${root}/config.json` : 'config/portfolio-config.json',
    draftKey: isTenantMode ? `${root}/draft.json` : 'config/portfolio-config.json',
    legacyKey: 'config/portfolio-config.json'
  }
  return cachedPaths
}

/** 供测试与运行模式切换后重置内部缓存。 */
export function resetTenantResolverCache(): void {
  cachedAppId = null
  cachedPaths = null
}
