<template>
  <div class="template-center">
    <div class="section-header">
      <h2>模板中心</h2>
      <p class="text-muted">选择一套商业模板作为装修起点。应用只写入<b>草稿</b>，用户访问不会改变；编辑满意后再到「发布中心」发布上线。</p>
    </div>

    <div class="flow-hint">
      <span class="flow-step"><em>1</em>挑选模板</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step"><em>2</em>应用到草稿</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step"><em>3</em>预览与编辑</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step"><em>4</em>发布上线</span>
    </div>

    <div class="templates-grid">
      <div v-for="template in templates" :key="template.id" class="template-card">
        <div class="template-preview">
          <img v-if="template.preview?.cover" :src="template.preview.cover" :alt="template.name" />
          <div v-else class="template-preview-placeholder">{{ template.name }}</div>
        </div>
        <div class="template-info">
          <h3 class="template-name">{{ template.name }}</h3>
          <p class="template-description text-muted">{{ template.description }}</p>
          <div class="template-tags">
            <span v-for="tag in template.industryTags" :key="tag" class="template-tag">{{ tag }}</span>
          </div>
          <div class="template-actions">
            <button class="btn btn-secondary" @click="previewTemplate(template)">
              预览页面
            </button>
            <button class="btn btn-primary" @click="applyTemplate(template)">
              应用到草稿
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 模板页面预览：应用前先看效果 -->
    <div v-if="previewTemplateData" class="modal-mask" @click.self="previewTemplateData = null">
      <div class="preview-modal">
        <div class="modal-header">
          <h3>{{ previewTemplateData.name }} · 页面预览</h3>
          <button class="modal-close" @click="previewTemplateData = null">×</button>
        </div>
        <div class="modal-body">
          <div class="modal-images">
            <div v-for="(url, key) in previewTemplateData.pages" :key="key" class="modal-image-item">
              <img :src="url" :alt="key" />
              <span class="modal-image-label">{{ key }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <span class="modal-tip">预览图仅示意模板版式，实际效果以「草稿预览」为准（会使用您的真实作品内容）。</span>
          <div class="modal-footer-actions">
            <button class="btn btn-secondary" @click="previewTemplateData = null">关闭</button>
            <button class="btn btn-primary" @click="confirmApplyFromPreview">应用到草稿并预览</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">加载中...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDesignApi } from '../composables/useDesignApi'

const emit = defineEmits<{ (event: 'preview'): void }>()

interface Template {
  id: string
  name: string
  description: string
  industryTags: string[]
  preview?: {
    cover?: string
    pages?: Record<string, string>
  }
}

const api = useDesignApi()

const templates = ref<Template[]>([])
const loading = ref(false)
const previewTemplateData = ref<(Template & { pages: Record<string, string> }) | null>(null)

async function loadTemplates() {
  loading.value = true
  try {
    const response = await fetch('/api/design/templates')
    const data = await response.json()
    templates.value = data.templates || []
  } catch (error) {
    console.error('加载模板失败:', error)
    alert('加载模板失败，请刷新页面重试')
  } finally {
    loading.value = false
  }
}

function previewTemplate(template: Template) {
  const pages = template.preview?.pages || {}
  previewTemplateData.value = { ...template, pages }
}

async function applyTemplate(template: Template) {
  if (!confirm(
    `确定要把模板「${template.name}」应用到草稿吗？\n\n` +
    `· 只写入本地草稿，线上用户访问不受影响\n` +
    `· 您的作品、套餐等内容会完整保留\n` +
    `· 应用后可在「草稿预览」查看效果，确认满意再去发布中心发布`
  )) {
    return
  }

  loading.value = true
  try {
    const success = await api.applyTemplate(template.id)
    if (success) {
      emit('preview')
    }
  } finally {
    loading.value = false
  }
}

async function confirmApplyFromPreview() {
  const target = previewTemplateData.value
  if (!target) return
  previewTemplateData.value = null
  await applyTemplate(target)
}

onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.template-center {
  max-width: 1400px;
  margin: 0 auto;
}

.section-header {
  margin-bottom: var(--spacing-xl);
}

.section-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--spacing-lg);
}

.template-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: box-shadow 0.15s ease;
}

.template-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.template-preview {
  aspect-ratio: 16 / 9;
  background: var(--color-surface-secondary);
  overflow: hidden;
}

.template-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.template-preview-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.template-info {
  padding: var(--spacing-lg);
}

.template-name {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
}

.template-description {
  margin-bottom: var(--spacing-md);
  line-height: 1.5;
}

.template-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
}

.template-tag {
  padding: 0.25rem 0.5rem;
  background: var(--color-surface-secondary);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  padding: var(--spacing-lg) var(--spacing-xl);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-weight: 500;
}

/* 流程提示条：明确"应用 ≠ 上线"。 */
.flow-hint {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 16px 0 24px;
  padding: 12px 18px;
  background: var(--color-surface-secondary);
  border-radius: var(--radius-md);
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.flow-step {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.flow-step em {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  font-style: normal;
  font-size: 0.6875rem;
  font-weight: 600;
}

.flow-arrow {
  color: var(--color-border);
}

.template-actions {
  display: flex;
  gap: var(--spacing-sm);
}

/* 模板页面预览弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 24px;
}

.preview-modal {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  width: min(1000px, 100%);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.0625rem;
  color: var(--color-text);
}

.modal-close {
  border: none;
  background: transparent;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0 4px;
}

.modal-close:hover {
  color: var(--color-text);
}

.modal-body {
  padding: 20px 22px;
  overflow-y: auto;
}

.modal-images {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.modal-image-item img {
  width: 100%;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  display: block;
}

.modal-image-label {
  display: block;
  margin-top: 6px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-align: center;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 16px 22px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-secondary);
}

.modal-tip {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  flex: 1;
  min-width: 220px;
}

.modal-footer-actions {
  display: flex;
  gap: var(--spacing-sm);
}
</style>
