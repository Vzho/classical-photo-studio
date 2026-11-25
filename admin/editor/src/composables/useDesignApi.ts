import { ref } from 'vue'
import type {
  TemplateListResponse,
  DraftResponse,
  Design,
  ValidationResponse,
  PublishResponse,
  ReleasesResponse,
  RollbackResponse,
  ConfigResponse,
  PreviewResponse
} from '../types/api'
import { useToast } from './useToast'
import { API_ENDPOINTS } from '../config/api'

const API_BASE = ''

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`
    let errorData

    try {
      errorData = await response.json()
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch {
      errorMessage = await response.text() || errorMessage
    }

    throw new ApiError(errorMessage, response.status, errorData)
  }

  return response.json()
}

export function useDesignApi() {
  const toast = useToast()

  // 模板相关
  async function getTemplates() {
    try {
      const data = await request<TemplateListResponse>(API_ENDPOINTS.DESIGN.TEMPLATES)
      return data.templates
    } catch (error) {
      toast.error('加载模板失败', error instanceof ApiError ? error.message : '网络错误')
      throw error
    }
  }

  async function applyTemplate(templateId: string) {
    try {
      await request(API_ENDPOINTS.DESIGN.APPLY_TEMPLATE, {
        method: 'POST',
        body: JSON.stringify({ templateId })
      })
      toast.success('模板已应用', '请继续编辑草稿')
      return true
    } catch (error) {
      toast.error('应用模板失败', error instanceof ApiError ? error.message : '网络错误')
      return false
    }
  }

  // 草稿相关
  async function getDraft() {
    try {
      const data = await request<DraftResponse>(API_ENDPOINTS.DESIGN.DRAFT)
      return data
    } catch (error) {
      toast.error('加载草稿失败', error instanceof ApiError ? error.message : '网络错误')
      throw error
    }
  }

  async function updateDraft(payload: Partial<Design>) {
    try {
      await request(API_ENDPOINTS.DESIGN.DRAFT, {
        method: 'PUT',
        body: JSON.stringify(payload)
      })
      toast.success('草稿已保存')
      return true
    } catch (error) {
      toast.error('保存草稿失败', error instanceof ApiError ? error.message : '网络错误')
      return false
    }
  }

  // 校验相关
  async function validateDesign() {
    try {
      const data = await request<ValidationResponse>(API_ENDPOINTS.DESIGN.VALIDATE, {
        method: 'POST'
      })

      if (data.valid) {
        toast.success('校验通过', '装修配置符合规范')
      } else {
        toast.warning('发现问题', `${data.issues.errors.length} 个错误需要修复`)
      }

      return data
    } catch (error) {
      toast.error('校验失败', error instanceof ApiError ? error.message : '网络错误')
      throw error
    }
  }

  // 发布相关
  async function publishDesign() {
    try {
      const data = await request<PublishResponse>(API_ENDPOINTS.DESIGN.PUBLISH, {
        method: 'POST'
      })

      if (data.success) {
        toast.success('发布成功', `版本号: ${data.release?.releaseId}`)
      }

      return data
    } catch (error) {
      toast.error('发布失败', error instanceof ApiError ? error.message : '网络错误')
      throw error
    }
  }

  async function getReleases() {
    try {
      const data = await request<ReleasesResponse>(API_ENDPOINTS.RELEASES.LIST)
      return data.releases
    } catch (error) {
      toast.error('加载发布历史失败', error instanceof ApiError ? error.message : '网络错误')
      throw error
    }
  }

  async function rollbackRelease(releaseId: string) {
    try {
      const data = await request<RollbackResponse>(API_ENDPOINTS.RELEASES.ROLLBACK(releaseId), {
        method: 'POST'
      })

      toast.success('回滚成功', `已回滚到版本 ${data.rolledBackTo}`)
      return data
    } catch (error) {
      toast.error('回滚失败', error instanceof ApiError ? error.message : '网络错误')
      throw error
    }
  }

  // 内容配置（用于加载系列列表）
  async function getConfig() {
    try {
      const data = await request<ConfigResponse>(API_ENDPOINTS.CONFIG)
      return data
    } catch (error) {
      toast.error('加载配置失败', error instanceof ApiError ? error.message : '网络错误')
      throw error
    }
  }

  // 预览相关：读取草稿的实时预览（不触达线上）
  async function getPreview() {
    try {
      const data = await request<PreviewResponse>(API_ENDPOINTS.DESIGN.PREVIEW)
      return data
    } catch (error) {
      throw error
    }
  }

  return {
    getTemplates,
    applyTemplate,
    getDraft,
    updateDraft,
    validateDesign,
    publishDesign,
    getReleases,
    rollbackRelease,
    getConfig,
    getPreview
  }
}
