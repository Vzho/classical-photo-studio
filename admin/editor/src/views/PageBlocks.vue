<template>
  <div class="page-blocks">
    <div class="blocks-layout">
      <!-- 左侧页面选择 -->
      <aside class="pages-sidebar">
        <h3>页面</h3>
        <nav class="pages-nav">
          <button
            v-for="page in pages"
            :key="page.key"
            :class="['page-btn', { active: activePage === page.key }]"
            @click="activePage = page.key"
          >
            {{ page.label }}
          </button>
        </nav>
      </aside>

      <!-- 中间区块列表 -->
      <main class="blocks-main">
        <div class="blocks-header">
          <h2>{{ currentPageLabel }}</h2>
          <p class="text-muted">拖动调整区块顺序，点击区块进行编辑</p>
        </div>

        <div class="blocks-list">
          <div
            v-for="(block, index) in currentBlocks"
            :key="block.id"
            class="block-item"
            @click="selectBlock(block)"
          >
            <div class="block-handle">⋮⋮</div>
            <div class="block-content">
              <div class="block-header">
                <span class="block-type">{{ getBlockLabel(block.type) }}</span>
                <span class="block-variant">{{ block.variant }}</span>
              </div>
              <div class="block-actions">
                <button @click.stop="toggleBlock(block)">
                  {{ block.enabled ? '✓ 显示' : '○ 隐藏' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentBlocks.length === 0" class="empty-state">
          <p>该页面暂无区块，请先应用模板</p>
        </div>
      </main>

      <!-- 右侧区块设置 -->
      <aside class="block-settings">
        <div v-if="selectedBlock">
          <h3>区块设置</h3>
          <div class="settings-form">
            <div class="form-group">
              <label class="label">变体</label>
              <select v-model="selectedBlock.variant" class="input">
                <option v-for="variant in getBlockVariants(selectedBlock.type)" :key="variant" :value="variant">
                  {{ variant }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label class="label">数据源</label>
              <select v-model="selectedBlock.dataSource.type" class="input">
                <option value="featured-series">精选作品</option>
                <option value="categories">分类列表</option>
                <option value="current-series">当前作品</option>
                <option value="packages">套餐列表</option>
                <option value="team">团队成员</option>
                <option value="testimonials">客户评价</option>
                <option value="brand">品牌信息</option>
                <option value="contact">联系方式</option>
              </select>
            </div>

            <div class="divider"></div>

            <div class="form-actions">
              <button class="btn btn-secondary" @click="selectedBlock = null">取消</button>
              <button class="btn btn-primary" @click="saveBlockSettings">保存</button>
            </div>
          </div>
        </div>
        <div v-else class="empty-settings">
          <p class="text-muted">选择一个区块进行编辑</p>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import Sortable from 'sortablejs'

interface Block {
  id: string
  type: string
  variant: string
  enabled: boolean
  dataSource: {
    type: string
  }
  settings: Record<string, unknown>
}

interface PageConfig {
  blocks: Block[]
}

const pages = [
  { key: 'portfolio', label: '作品首页' },
  { key: 'series', label: '作品详情' },
  { key: 'about', label: '关于我们' },
  { key: 'packages', label: '套餐列表' }
]

const blockRegistry: Record<string, { label: string; variants: string[] }> = {
  hero: { label: '首屏主视觉', variants: ['full-bleed-carousel', 'editorial-split', 'minimal-cover'] },
  'brand-intro': { label: '品牌介绍', variants: ['centered', 'editorial-left'] },
  'category-nav': { label: '分类导航', variants: ['text-tabs', 'circle-thumbnails'] },
  'portfolio-grid': { label: '作品画廊', variants: ['two-column', 'three-column', 'editorial-mixed'] },
  'series-gallery': { label: '作品详情画廊', variants: ['natural-flow', 'framed-grid', 'immersive-full'] },
  'package-list': { label: '套系列表', variants: ['banner', 'cards', 'minimal-list'] },
  team: { label: '团队展示', variants: ['horizontal-cards', 'portrait-grid'] },
  testimonials: { label: '客户评价', variants: ['quotes', 'cards'] },
  'service-flow': { label: '服务流程', variants: ['numbered', 'timeline'] },
  'contact-footer': { label: '联系页脚', variants: ['dark-media', 'minimal'] }
}

const activePage = ref('portfolio')
const pageConfigs = ref<Record<string, PageConfig>>({})
const selectedBlock = ref<Block | null>(null)
let sortableInstance: Sortable | null = null

const currentPageLabel = computed(() => pages.find(p => p.key === activePage.value)?.label || '')
const currentBlocks = computed(() => pageConfigs.value[activePage.value]?.blocks || [])

function getBlockLabel(type: string): string {
  return blockRegistry[type]?.label || type
}

function getBlockVariants(type: string): string[] {
  return blockRegistry[type]?.variants || []
}

function selectBlock(block: Block) {
  selectedBlock.value = { ...block }
}

function toggleBlock(block: Block) {
  block.enabled = !block.enabled
  saveDraft()
}

async function saveBlockSettings() {
  if (!selectedBlock.value) return

  const blocks = currentBlocks.value
  const index = blocks.findIndex(b => b.id === selectedBlock.value!.id)
  if (index >= 0) {
    blocks[index] = { ...selectedBlock.value }
  }

  await saveDraft()
  selectedBlock.value = null
}

async function loadDraft() {
  try {
    const response = await fetch('/api/design/draft')
    const data = await response.json()
    if (data.draft?.pages) {
      pageConfigs.value = data.draft.pages
    }
  } catch (error) {
    console.error('加载草稿失败:', error)
  }
}

async function saveDraft() {
  try {
    await fetch('/api/design/draft', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages: pageConfigs.value })
    })
  } catch (error) {
    console.error('保存草稿失败:', error)
    alert('保存失败，请重试')
  }
}

function initSortable() {
  const el = document.querySelector('.blocks-list')
  if (!el) return

  if (sortableInstance) {
    sortableInstance.destroy()
  }

  sortableInstance = Sortable.create(el as HTMLElement, {
    animation: 150,
    handle: '.block-handle',
    ghostClass: 'block-ghost',
    onEnd: (evt) => {
      const oldIndex = evt.oldIndex
      const newIndex = evt.newIndex
      if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) return

      const blocks = currentBlocks.value
      const [movedBlock] = blocks.splice(oldIndex, 1)
      blocks.splice(newIndex, 0, movedBlock)

      saveDraft()
    }
  })
}

onMounted(async () => {
  await loadDraft()
  await nextTick()
  initSortable()
})
</script>

<style scoped>
.blocks-layout {
  display: grid;
  grid-template-columns: 200px 1fr 320px;
  gap: var(--spacing-lg);
  height: calc(100vh - 120px);
}

.pages-sidebar {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  overflow-y: auto;
}

.pages-sidebar h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: var(--spacing-md);
}

.pages-nav {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.page-btn {
  width: 100%;
  padding: var(--spacing-sm);
  text-align: left;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text);
  font-weight: 500;
  transition: all 0.15s ease;
}

.page-btn:hover {
  background: var(--color-surface-secondary);
}

.page-btn.active {
  background: var(--color-surface-secondary);
  color: var(--color-primary);
}

.blocks-main {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.blocks-header {
  margin-bottom: var(--spacing-lg);
}

.blocks-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
}

.blocks-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.block-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.15s ease;
}

.block-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.block-handle {
  color: var(--color-text-muted);
  cursor: grab;
  user-select: none;
}

.block-handle:active {
  cursor: grabbing;
}

.block-ghost {
  opacity: 0.5;
  background: var(--color-surface-secondary);
}

.block-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.block-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.block-type {
  font-weight: 600;
}

.block-variant {
  padding: 0.25rem 0.5rem;
  background: var(--color-surface-secondary);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.block-actions button {
  padding: 0.25rem 0.75rem;
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
}

.block-settings {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  overflow-y: auto;
}

.block-settings h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: var(--spacing-lg);
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.form-actions {
  display: flex;
  gap: var(--spacing-sm);
  justify-content: flex-end;
}

.empty-state, .empty-settings {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--color-text-muted);
}
</style>
