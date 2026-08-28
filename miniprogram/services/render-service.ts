// Render Service（方案 §8）：把运行时配置 + 内容解析为页面可渲染的区块视图模型。
// 页面只负责调用本服务并把结果交给 page-shell / section-renderer，双引擎判断集中于此。
import { V3RuntimeBlock, V3RuntimeConfig } from '../compatibility/v25-adapter'
import { resolveBlockContent, ContentResolveContext } from './content-service'
import { shouldUseBlocksV3 } from './config-service'
import { buildV3Theme, V3Theme } from './theme-service'

export interface PreparedBlock {
  block: V3RuntimeBlock
  content: any
  available: boolean
}

export interface PreparedPage {
  useV3: boolean
  theme: V3Theme
  blocks: PreparedBlock[]
}

/**
 * 组装页面渲染模型：
 * - 非 v3 页面返回 useV3: false，页面走旧渲染路径；
 * - v3 页面逐区块解析内容，内容缺失的区块标记 available: false 由组件安全降级。
 */
export function preparePageRender(
  runtime: V3RuntimeConfig | null | undefined,
  config: any,
  pageKey: string,
  ctx: ContentResolveContext = {}
): PreparedPage | null {
  if (!runtime || !shouldUseBlocksV3(runtime, pageKey)) return null

  const theme = buildV3Theme(runtime)
  const page = runtime.v3Pages[pageKey]
  const blocks: PreparedBlock[] = []

  for (const block of page.blocks || []) {
    if (block.enabled === false) continue
    const result = resolveBlockContent(config, block.dataSource, ctx)
    blocks.push({ block, content: result.data, available: result.available })
  }

  return { useV3: true, theme, blocks }
}
