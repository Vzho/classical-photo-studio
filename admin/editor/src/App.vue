<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <h1 class="app-title">拾光装修系统 v3</h1>
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
      <TemplateCenter v-if="activeTab === 'templates'" />
      <GlobalSettings v-else-if="activeTab === 'global'" />
      <PageBlocks v-else-if="activeTab === 'pages'" />
      <MediaControl v-else-if="activeTab === 'media'" />
      <PublishCenter v-else-if="activeTab === 'publish'" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TemplateCenter from './views/TemplateCenter.vue'
import GlobalSettings from './views/GlobalSettings.vue'
import PageBlocks from './views/PageBlocks.vue'
import MediaControl from './views/MediaControl.vue'
import PublishCenter from './views/PublishCenter.vue'

const activeTab = ref('templates')

const tabs = [
  { key: 'templates', label: '模板中心' },
  { key: 'global', label: '全局设置' },
  { key: 'pages', label: '页面区块' },
  { key: 'media', label: '图片控制' },
  { key: 'publish', label: '发布中心' }
]
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
