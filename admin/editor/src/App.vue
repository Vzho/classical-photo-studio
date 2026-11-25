<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <div class="header-left">
          <h1 class="app-title">拾光装修系统 v3</h1>
          <a class="back-to-admin" href="/" title="返回内容后台（作品 / 套餐 / 店铺资料）">← 内容后台</a>
          <span class="draft-state" :class="draftStateClass" :title="draftStateTitle">
            {{ draftStateText }}
          </span>
        </div>
        <nav class="app-nav">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="['nav-btn', { active: activeTab === tab.key }]"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>
    </header>

    <main class="app-main">
      <TemplateCenter v-if="activeTab === 'templates'" @preview="activeTab = 'preview'" />
      <GlobalSettings v-else-if="activeTab === 'global'" />
      <PageBlocks v-else-if="activeTab === 'pages'" />
      <MediaControl v-else-if="activeTab === 'media'" />
      <DraftPreview v-else-if="activeTab === 'preview'" />
      <PublishCenter v-else-if="activeTab === 'publish'" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import TemplateCenter from './views/TemplateCenter.vue'
import GlobalSettings from './views/GlobalSettings.vue'
import PageBlocks from './views/PageBlocks.vue'
import MediaControl from './views/MediaControl.vue'
import DraftPreview from './views/DraftPreview.vue'
import PublishCenter from './views/PublishCenter.vue'
import { useDesignApi } from './composables/useDesignApi'

const api = useDesignApi()

const activeTab = ref('templates')

// 草稿与线上发布稿的状态：用于顶栏常驻提示，避免误以为"改了就已经上线"。
const hasPublished = ref(false)
const hasUnpublishedChanges = ref(false)

const tabs = [
  { key: 'templates', label: '模板中心' },
  { key: 'global', label: '全局设置' },
  { key: 'pages', label: '页面区块' },
  { key: 'media', label: '图片控制' },
  { key: 'preview', label: '草稿预览' },
  { key: 'publish', label: '发布中心' }
]

const draftStateText = computed(() => {
  if (!hasPublished.value) return '未发布 · 线上为旧版'
  if (hasUnpublishedChanges.value) return '草稿有未发布改动'
  return '草稿与线上一致'
})

const draftStateClass = computed(() => {
  if (!hasPublished.value) return 'draft-state--draft'
  if (hasUnpublishedChanges.value) return 'draft-state--changed'
  return 'draft-state--synced'
})

const draftStateTitle = computed(() => {
  if (!hasPublished.value) {
    return '当前装修还没有发布过，用户访问的仍是旧版装修。到「发布中心」发布后才会生效。'
  }
  if (hasUnpublishedChanges.value) {
    return '草稿有改动尚未发布，用户当前看到的仍是上次发布的版本。'
  }
  return '草稿与线上发布版本一致，用户看到的就是当前草稿。'
})

async function loadDraftState() {
  try {
    const data = await api.getPreview()
    hasPublished.value = Boolean(data.published)
    hasUnpublishedChanges.value = Boolean(data.hasUnpublishedChanges)
  } catch {
    // 还没有草稿时预览接口会 404，此时按"未发布"处理，不打扰用户。
    hasPublished.value = false
    hasUnpublishedChanges.value = false
  }
}

onMounted(loadDraftState)
</script>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: var(--spacing-md) var(--spacing-xl);
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  min-width: 0;
}

.back-to-admin {
  display: inline-flex;
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  font-size: 0.875rem;
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.back-to-admin:hover {
  color: var(--color-text);
  background-color: var(--color-surface-secondary);
}

/* 草稿 / 线上状态徽章：常驻提示"改了还没上线"。 */
.draft-state {
  display: inline-flex;
  align-items: center;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  border: 1px solid transparent;
}

.draft-state--draft {
  background: #fef3c7;
  color: #92400e;
  border-color: #fde68a;
}

.draft-state--changed {
  background: #fee2e2;
  color: #991b1b;
  border-color: #fecaca;
}

.draft-state--synced {
  background: #dcfce7;
  color: #166534;
  border-color: #bbf7d0;
}

.app-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
}

.app-nav {
  display: flex;
  gap: var(--spacing-xs);
}

.nav-btn {
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: var(--radius-md);
  font-weight: 500;
  color: var(--color-text-muted);
  background-color: transparent;
  transition: all 0.15s ease;
}

.nav-btn:hover {
  color: var(--color-text);
  background-color: var(--color-surface-secondary);
}

.nav-btn.active {
  color: var(--color-primary);
  background-color: var(--color-surface-secondary);
}

.app-main {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-xl);
}
</style>
