// v3 页面接入辅助（方案 §10.2 双引擎）：
// 各页面共享的 v3 初始状态、渲染刷新与区块动作处理，保持页面薄壳。
import { loadRuntimeConfig } from '../services/config-service'
import { ContentResolveContext } from '../services/content-service'
import { preparePageRender, PreparedBlock, PreparedPage } from '../services/render-service'
import { handleConsultButtonAction } from './consult-action'

export interface V3PageState {
  v3Active: boolean
  v3Loading: boolean
  v3ThemeStyle: string
  v3ButtonStyle: string
  v3Blocks: PreparedBlock[]
}

export const V3_INITIAL_STATE: V3PageState = {
  v3Active: false,
  v3Loading: true,
  v3ThemeStyle: '',
  v3ButtonStyle: 'solid',
  v3Blocks: []
}

interface V3HostPage {
  data: { consultButton?: any } & Record<string, any>
  v3Prepared?: PreparedPage | null
  setData(data: Record<string, any>): void
}

/**
 * 刷新页面 v3 渲染模型：
 * - 未命中 v3 或加载失败时静默回退旧渲染路径（§16），不打扰客户；
 * - 成功后写入 v3Blocks 等状态供 page-shell 渲染。
 */
export async function refreshV3ForPage(page: V3HostPage, pageKey: string, ctx: ContentResolveContext = {}): Promise<void> {
  try {
    const { config, runtime } = await loadRuntimeConfig()
    const prepared = preparePageRender(runtime, config, pageKey, ctx)
    page.v3Prepared = prepared
    if (!prepared) {
      page.setData({ v3Active: false, v3Loading: false })
      return
    }
    page.setData({
      v3Active: true,
      v3Loading: false,
      v3ThemeStyle: prepared.theme.style,
      v3ButtonStyle: prepared.theme.tokens.buttonStyle,
      v3Blocks: prepared.blocks
    })
  } catch (error) {
    page.setData({ v3Active: false, v3Loading: false })
  }
}

// 区块动作统一处理：系列跳转、套餐跳转、咨询入口。
export function handleV3BlockAction(page: V3HostPage, detail: Record<string, any> | undefined): void {
  const action = detail || {}
  switch (action.type) {
    case 'open-series':
      if (action.seriesId) {
        wx.navigateTo({ url: `/pages/series/series?seriesId=${action.seriesId}` })
      }
      break
    case 'open-package':
      if (action.packageId) {
        wx.navigateTo({ url: `/pages/package-detail/package-detail?id=${action.packageId}` })
      }
      break
    case 'consult':
      handleConsultButtonAction(page.data.consultButton || { enabled: true })
      break
    default:
      break
  }
}
