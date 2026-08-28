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

export async function loadRuntimeConfig(force = false): Promise<RuntimeLoadResult> {
  if (cachedResult && !force) return cachedResult
  if (activeRequest && !force) return activeRequest

  activeRequest = (async () => {
    const config = await loadPortfolioRawConfig()
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
