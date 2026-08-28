<template>
  <div class="publish-center">
    <div class="publish-container">
      <h2>发布中心</h2>
      <p class="text-muted">校验、发布装修配置，管理发布历史和回滚</p>

      <div class="publish-sections">
        <!-- 草稿状态 -->
        <section class="card publish-section">
          <h3>当前草稿</h3>

          <div v-if="draftInfo" class="draft-info">
            <div class="info-row">
              <span class="info-label">模板</span>
              <span class="info-value">{{ draftInfo.templateId }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">最后更新</span>
              <span class="info-value">{{ formatDate(draftInfo.updatedAt) }}</span>
            </div>
          </div>

          <div v-else class="no-draft">
            <p class="text-muted">暂无草稿，请先应用模板或修改设置</p>
          </div>
        </section>

        <!-- 校验结果 -->
        <section class="card publish-section">
          <h3>装修校验</h3>

          <div v-if="!validationResult" class="validation-actions">
            <button class="btn btn-primary" :disabled="validating" @click="validateDesign">
              {{ validating ? '校验中...' : '运行校验' }}
            </button>
          </div>

          <div v-else class="validation-result">
            <div v-if="validationResult.valid" class="validation-success">
              <span class="status-icon">✓</span>
              <div class="status-content">
                <strong>校验通过</strong>
                <p class="text-muted">装修配置符合规范，可以发布</p>
              </div>
            </div>

            <div v-else class="validation-errors">
              <div class="error-summary">
                <span class="status-icon">✗</span>
                <strong>发现 {{ validationResult.errors.length }} 个问题</strong>
              </div>

              <div class="error-list">
                <div v-for="(error, index) in validationResult.errors" :key="index" class="error-item">
                  <span :class="['error-level', error.level]">{{ error.level }}</span>
                  <p>{{ error.message }}</p>
                </div>
              </div>
            </div>

            <button class="btn btn-secondary" @click="validationResult = null">重新校验</button>
          </div>
        </section>

        <!-- 发布操作 -->
        <section class="card publish-section">
          <h3>发布到线上</h3>

          <div class="publish-warning">
            <p>⚠️ 发布后，装修配置将立即生效到小程序线上环境</p>
          </div>

          <div class="publish-actions">
            <button
              class="btn btn-primary btn-large"
              :disabled="publishing || !canPublish"
              @click="publishDesign"
            >
              {{ publishing ? '发布中...' : '发布装修' }}
            </button>
          </div>

          <div v-if="publishResult" class="publish-result">
            <div v-if="publishResult.success" class="result-success">
              <p>✓ 发布成功！版本号: {{ publishResult.releaseId }}</p>
            </div>
            <div v-else class="result-error">
              <p>✗ 发布失败: {{ publishResult.error }}</p>
            </div>
          </div>
        </section>

        <!-- 发布历史 -->
        <section class="card publish-section">
          <h3>发布历史</h3>

          <div v-if="releases.length > 0" class="releases-list">
            <div v-for="release in releases" :key="release.id" class="release-item">
              <div class="release-header">
                <div>
                  <strong>版本 {{ release.id }}</strong>
                  <span class="release-date text-muted">{{ formatDate(release.createdAt) }}</span>
                </div>
                <span v-if="release.current" class="current-badge">当前版本</span>
              </div>

              <div class="release-meta">
                <span class="meta-item">模板: {{ release.templateId }}</span>
                <span class="meta-item">{{ release.pageCount }} 个页面</span>
              </div>

              <div class="release-actions">
                <button
                  v-if="!release.current"
                  class="btn btn-secondary btn-small"
                  @click="rollbackTo(release)"
                >
                  回滚到此版本
                </button>
              </div>
            </div>
          </div>

          <div v-else class="no-releases">
            <p class="text-muted">暂无发布记录</p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface DraftInfo {
  templateId: string
  updatedAt: string
}

interface ValidationResult {
  valid: boolean
  errors: Array<{ level: string; message: string }>
}

interface Release {
  id: string
  templateId: string
  pageCount: number
  createdAt: string
  current: boolean
}

const draftInfo = ref<DraftInfo | null>(null)
const validationResult = ref<ValidationResult | null>(null)
const validating = ref(false)
const publishing = ref(false)
const publishResult = ref<any>(null)
const releases = ref<Release[]>([])

const canPublish = computed(() => {
  return validationResult.value?.valid && draftInfo.value
})

function formatDate(date: string): string {
  return new Date(date).toLocaleString('zh-CN')
}

async function loadDraft() {
  try {
    const response = await fetch('/api/design/draft')
    const data = await response.json()
    if (data.draft) {
      draftInfo.value = {
        templateId: data.draft.templateId,
        updatedAt: data.draft.updatedAt
      }
    }
  } catch (error) {
    console.error('加载草稿失败:', error)
  }
}

async function validateDesign() {
  validating.value = true
  validationResult.value = null

  try {
    const response = await fetch('/api/design/validate', {
      method: 'POST'
    })
    const data = await response.json()
    validationResult.value = data
  } catch (error) {
    console.error('校验失败:', error)
    alert('校验失败，请重试')
  } finally {
    validating.value = false
  }
}

async function publishDesign() {
  if (!confirm('确定要发布装修配置到线上吗？')) return

  publishing.value = true
  publishResult.value = null

  try {
    const response = await fetch('/api/design/publish', {
      method: 'POST'
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '发布失败')
    }

    const data = await response.json()
    publishResult.value = { success: true, releaseId: data.releaseId }

    // 刷新发布历史
    await loadReleases()
    alert('发布成功！')
  } catch (error: any) {
    publishResult.value = { success: false, error: error.message }
    alert(`发布失败: ${error.message}`)
  } finally {
    publishing.value = false
  }
}

async function loadReleases() {
  try {
    const response = await fetch('/api/releases')
    const data = await response.json()
    releases.value = data.releases || []
  } catch (error) {
    console.error('加载发布历史失败:', error)
  }
}

async function rollbackTo(release: Release) {
  if (!confirm(`确定要回滚到版本 ${release.id} 吗？这将替换当前线上的装修配置。`)) return

  try {
    const response = await fetch(`/api/releases/${release.id}/rollback`, {
      method: 'POST'
    })

    if (!response.ok) {
      throw new Error('回滚失败')
    }

    alert('回滚成功！')
    await loadReleases()
  } catch (error) {
    console.error('回滚失败:', error)
    alert('回滚失败，请重试')
  }
}

onMounted(() => {
  loadDraft()
  loadReleases()
})
</script>

<style scoped>
.publish-center {
  max-width: 900px;
  margin: 0 auto;
}

.publish-container h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
}

.publish-sections {
  margin-top: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.publish-section h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: var(--spacing-lg);
}

.draft-info, .info-row {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-sm) 0;
  border-bottom: 1px solid var(--color-border);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-weight: 500;
  color: var(--color-text-muted);
}

.no-draft {
  text-align: center;
  padding: var(--spacing-xl);
}

.validation-actions {
  text-align: center;
}

.validation-success {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background: #dcfce7;
  border: 1px solid #16a34a;
  border-radius: var(--radius-md);
}

.validation-errors {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.error-summary {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  padding: var(--spacing-md);
  background: #fee2e2;
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.error-item {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.error-level {
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.error-level.error {
  background: var(--color-danger);
  color: white;
}

.error-level.warning {
  background: var(--color-warning);
  color: white;
}

.status-icon {
  font-size: 1.5rem;
}

.status-content strong {
  display: block;
  margin-bottom: 0.25rem;
}

.publish-warning {
  padding: var(--spacing-md);
  background: #fef3c7;
  border: 1px solid var(--color-warning);
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-md);
}

.publish-actions {
  text-align: center;
}

.btn-large {
  padding: var(--spacing-md) var(--spacing-xl);
  font-size: 1rem;
}

.publish-result {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
}

.result-success {
  background: #dcfce7;
  color: #16a34a;
}

.result-error {
  background: #fee2e2;
  color: var(--color-danger);
}

.releases-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.release-item {
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.release-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.release-date {
  margin-left: var(--spacing-sm);
  font-size: 0.875rem;
}

.current-badge {
  padding: 0.25rem 0.5rem;
  background: var(--color-primary);
  color: white;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
}

.release-meta {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-sm);
}

.meta-item {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.release-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.btn-small {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.no-releases {
  text-align: center;
  padding: var(--spacing-xl);
}
</style>
