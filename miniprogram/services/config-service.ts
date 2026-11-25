// Config Service（方案 §7.1）：读取运行配置并解析为 blocks-v3 运行时视图。
// 只读原则（§7.2）：不写回 COS、不改 configVersion、未知区块跳过不阻断。
import { adaptV25ToRuntime, isV3Runtime, V3RuntimeConfig } from '../compatibility/v25-adapter'
import { loadPortfolioRawConfig } from '../utils/cos'

export interface RuntimeLoadResult {
  config: any
  runtime: V3RuntimeConfig
}

let cachedResult: RuntimeLoadResult | null = null
let activeRequest: Promise<RuntimeLoadResult> | null = null

export function resolveConfigRuntime(config: any): V3RuntimeConfig {
  // v3 原生配置直接使用；v2.5 配置走只读适配。两条路径都不产生副作用。
  return isV3Runtime(config) ? adaptV25ToRuntime(config) : adaptV25ToRuntime(config)
}

/**
 * V3 配置防御性规范化（SaaS Sprint1 任务 1.2）：
 * 对多租户来源（tenants/{appId}/config.json）可能出现的字段缺失做兜底，
 * 杜绝 WXML 渲染报错。纯内存操作、不写回、不改变字段语义：
 *  - meta 缺失时补默认 meta（serviceStatus 默认 active，避免存量配置被误熔断）
 *  - v3Pages 逐页保证 blocks 为数组、剔除非对象区块
 *  - designTokens 缺失时置空对象（渲染层有 token 默认值兜底）
 */
export function normalizeConfigV3(raw: any): any {
  if (!raw || typeof raw !== 'object') return raw

  const config = raw
  if (!config.meta || typeof config.meta !== 'object') {
    config.meta = { serviceStatus: 'active' }
  } else if (config.meta.serviceStatus === undefined) {
    config.meta.serviceStatus = 'active'
  }

  if (config.v3Pages && typeof config.v3Pages === 'object') {
    const pages = { ...config.v3Pages }
    for (const pageKey of Object.keys(pages)) {
      const page = pages[pageKey]
      if (!page || typeof page !== 'object') {
        delete pages[pageKey]
        continue
      }
      if (!Array.isArray(page.blocks)) {
        pages[pageKey] = { ...page, blocks: [] }
        continue
      }
      const safeBlocks = page.blocks.filter((block: any) => block && typeof block === 'object')
      if (safeBlocks.length !== page.blocks.length) {
        pages[pageKey] = { ...page, blocks: safeBlocks }
      }
    }
    config.v3Pages = pages
  }

  if (!config.designTokens || typeof config.designTokens !== 'object') {
    config.designTokens = {}
  }

  return config
}

export async function loadRuntimeConfig(force = false): Promise<RuntimeLoadResult> {
  if (cachedResult && !force) return cachedResult
  if (activeRequest && !force) return activeRequest

  activeRequest = (async () => {
    const config = normalizeConfigV3(await loadPortfolioRawConfig())
    const runtime = resolveConfigRuntime(config)
    cachedResult = { config, runtime }
    return cachedResult
  })()

  try {
    return await activeRequest
  } finally {
    activeRequest = null
  }
}

// 页面是否应使用 blocks-v3 渲染（双引擎判断，方案 §10.2）。
export function shouldUseBlocksV3(runtime: V3RuntimeConfig | null | undefined, pageKey: string): boolean {
  if (!runtime || runtime.engine !== 'blocks-v3') return false
  const page = runtime.v3Pages?.[pageKey]
  return Boolean(page && Array.isArray(page.blocks) && page.blocks.length > 0)
}
