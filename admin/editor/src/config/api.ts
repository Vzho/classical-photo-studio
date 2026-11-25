/**
 * API 端点配置
 * 集中管理所有 API 路径，避免硬编码
 */

export const API_ENDPOINTS = {
  DESIGN: {
    TEMPLATES: '/api/design/templates',
    APPLY_TEMPLATE: '/api/design/apply-template',
    DRAFT: '/api/design/draft',
    VALIDATE: '/api/design/validate',
    PUBLISH: '/api/design/publish',
    PREVIEW: '/api/design/preview',
  },
  RELEASES: {
    LIST: '/api/releases',
    ROLLBACK: (releaseId: string) => `/api/releases/${releaseId}/rollback`,
  },
  CONFIG: '/api/config',
} as const
