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
            <div class="info-row">
              <span class="info-label">线上状态</span>
              <span class="info-value">
                <span v-if="!publishedInfo" class="state-tag state-tag--draft">未发布 · 线上为旧版</span>
                <span v-else-if="hasUnpublishedChanges" class="state-tag state-tag--changed">有未发布的改动</span>
                <span v-else class="state-tag state-tag--synced">与线上一致</span>
              </span>
            </div>
            <div v-if="publishedInfo" class="info-row">
              <span class="info-label">线上版本</span>
              <span class="info-value">
                {{ publishedInfo.templateId }} · {{ formatDate(publishedInfo.updatedAt) }}
              </span>
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
                <strong>发现 {{ validationResult.issues.errors.length }} 个问题</strong>
              </div>

              <div class="error-list">
                <div v-for="(error, index) in validationResult.issues.errors" :key="index" class="error-item">
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
            <p class="text-muted">发布前建议先到「草稿预览」确认效果 —— 只有点了发布，用户访问才会改变。</p>
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
            <div v-for="release in releases" :key="release.releaseId" class="release-item">
              <div class="release-header">
                <div>
                  <strong>版本 {{ release.releaseId }}</strong>
                  <span class="release-date text-muted">{{ formatDate(release.timestamp) }}</span>
                </div>
                <span v-if="release.isCurrent" class="current-badge">当前版本</span>
              </div>

              <div class="release-meta">
                <span class="meta-item">模板: {{ release.design.templateId || 'N/A' }}</span>
                <span class="meta-item">{{ Object.keys(release.design.pages || {}).length }} 个页面</span>
              </div>

              <div class="release-actions">
                <button
                  v-if="!release.isCurrent"
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
import { useDesignApi } from '../composables/useDesignApi'
import { useToast } from '../composables/useToast'
import type { ValidationResponse, Release } from '../types/api'

const api = useDesignApi()
const toast = useToast()

interface DraftInfo {
  templateId: string
  updatedAt: string
}

const draftInfo = ref<DraftInfo | null>(null)
const publishedInfo = ref<{ templateId: string; updatedAt: string } | null>(null)
const hasUnpublishedChanges = ref(false)
const validationResult = ref<ValidationResponse | null>(null)
const validating = ref(false)
const publishing = ref(false)
const publishResult = ref<{ success: boolean; releaseId?: string; error?: string } | null>(null)
const releases = ref<Release[]>([])

const canPublish = computed(() => {
  return validationResult.value?.valid && draftInfo.value && !publishing.value
})

function formatDate(date: string): string {
  return new Date(date).toLocaleString('zh-CN')
}

async function loadDraft() {
  try {
    const data = await api.getDraft()
    if (data.draft) {
      draftInfo.value = {
        templateId: data.draft.templateId || '',
        updatedAt: data.draft.updatedAt || new Date().toISOString()
      }
    }
  } catch (error) {
    console.error('加载草稿失败:', error)
    draftInfo.value = null
  }

  // 草稿与线上发布稿的差异：预览接口会同时返回两者关系（只读，不触达线上）。
  try {
    const preview = await api.getPreview()
    publishedInfo.value = preview.published
    hasUnpublishedChanges.value = Boolean(preview.hasUnpublishedChanges)
  } catch {
    publishedInfo.value = null
    hasUnpublishedChanges.value = false
  }
}

async function validateDesign() {
  validating.value = true
  validationResult.value = null

  try {
    const data = await api.validateDesign()
    validationResult.value = data
  } catch (error) {
    console.error('校验失败:', error)
  } finally {
    validating.value = false
  }
}

async function publishDesign() {
  if (!confirm('确定要发布装修配置到线上吗？此操作将立即生效。')) return

  publishing.value = true
  publishResult.value = null

  try {
    const data = await api.publishDesign()

    if (data.success) {
      publishResult.value = {
        success: true,
        releaseId: data.release?.releaseId
      }

      // 刷新发布历史
      await loadReleases()
    } else {
      publishResult.value = {
        success: false,
        error: '发布失败，请重试'
      }
    }
  } catch (error: any) {
    publishResult.value = {
      success: false,
      error: error.message || '发布失败'
    }
  } finally {
    publishing.value = false
  }
}

async function loadReleases() {
  try {
    const data = await api.getReleases()
    releases.value = data || []
  } catch (error) {
    console.error('加载发布历史失败:', error)
    releases.value = []
  }
}

async function rollbackTo(release: Release) {
  if (!confirm(`确定要回滚到版本 ${release.releaseId} 吗？这将替换当前线上的装修配置。`)) return

  try {
    await api.rollbackRelease(release.releaseId)
    await loadReleases()
  } catch (error) {
    console.error('回滚失败:', error)
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

/* 草稿 / 线上状态标签 */
.state-tag {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid transparent;
}

.state-tag--draft {
  background: #fef3c7;
  color: #92400e;
  border-color: #fde68a;
}

.state-tag--changed {
  background: #fee2e2;
  color: #991b1b;
  border-color: #fecaca;
}

.state-tag--synced {
  background: #dcfce7;
  color: #166534;
  border-color: #bbf7d0;
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
