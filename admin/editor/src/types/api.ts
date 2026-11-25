/**
 * API 响应类型定义
 */

export interface FocalPoint {
  x: number
  y: number
}

export interface Series {
  id: string
  title: string
  coverPhoto: string | null
  photoCount: number
  focalPoint?: FocalPoint
}

export interface Theme {
  id: string
  title: string
  series: Series[]
}

export interface Block {
  id: string
  type: string
  variant: string
  enabled: boolean
  dataSource: {
    type: string
    [key: string]: any
  }
  settings: Record<string, unknown>
}

export interface PageConfig {
  blocks: Block[]
}

export interface Design {
  pages?: Record<string, PageConfig>
  mediaMeta?: Record<string, { focalPoint: FocalPoint }>
  [key: string]: any
}

export interface Template {
  id: string
  name: string
  preview?: string
  description?: string
}

export interface TemplateListResponse {
  templates: Template[]
}

export interface DraftResponse {
  draft: Design | null
  lastModified?: string
}

export interface ValidationIssue {
  level: 'error' | 'warning'
  message: string
  location?: string
}

export interface ValidationResponse {
  valid: boolean
  issues: {
    errors: ValidationIssue[]
    warnings: ValidationIssue[]
  }
}

export interface Release {
  releaseId: string
  timestamp: string
  design: Design
  isCurrent: boolean
}

export interface PublishResponse {
  success: boolean
  release?: Release
}

export interface ReleasesResponse {
  releases: Release[]
}

export interface RollbackResponse {
  success: boolean
  rolledBackTo: string
}

export interface ConfigResponse {
  themes: Theme[]
  [key: string]: any
}

/**
 * 预览区块：结构与线上运行时一致，额外附带真实内容。
 */
export interface PreviewBlock {
  id: string
  type: string
  variant: string
  rendererKey: string
  enabled: boolean
  dataSource: {
    type: string
    [key: string]: any
  }
  settings: Record<string, any>
  content?: any
  contentAvailable?: boolean
}

export interface PreviewPage {
  blocks: PreviewBlock[]
}

export interface PreviewPayload {
  templateId: string
  templateName: string
  tokens: Record<string, any>
  brand: Record<string, any>
  navigation: Record<string, any>
  pages: Record<string, PreviewPage>
  compiledPages: string[]
  warnings: string[]
}

export interface PreviewResponse {
  success: boolean
  preview: PreviewPayload
  validation: ValidationResponse
  published: { templateId: string; updatedAt: string } | null
  hasUnpublishedChanges: boolean
}
