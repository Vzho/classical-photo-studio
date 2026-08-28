<template>
  <div class="template-center">
    <div class="section-header">
      <h2>模板中心</h2>
      <p class="text-muted">选择一套商业模板作为装修起点，应用后会保留您的作品和套餐内容</p>
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
          <button class="btn btn-primary" @click="applyTemplate(template)">
            应用模板
          </button>
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

interface Template {
  id: string
  name: string
  description: string
  industryTags: string[]
  preview?: {
    cover?: string
  }
}

const templates = ref<Template[]>([])
const loading = ref(false)

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

async function applyTemplate(template: Template) {
  if (!confirm(`确定要应用模板"${template.name}"吗？这会替换当前的装修设计但保留您的内容。`)) {
    return
  }

  loading.value = true
  try {
    const response = await fetch('/api/design/apply-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: template.id })
    })

    if (!response.ok) {
      throw new Error('应用模板失败')
    }

    alert('模板已应用到草稿，请前往"页面区块"继续编辑')
  } catch (error) {
    console.error('应用模板失败:', error)
    alert('应用模板失败，请重试')
  } finally {
    loading.value = false
  }
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
</style>
