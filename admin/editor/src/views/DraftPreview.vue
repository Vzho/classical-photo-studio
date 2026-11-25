<template>
  <div class="draft-preview">
    <div class="preview-header">
      <div class="header-left">
        <h2 class="section-title">草稿预览</h2>
        <span class="badge badge-draft">草稿 · 未上线</span>
        <span v-if="hasUnpublishedChanges" class="badge badge-warn">有未发布的改动</span>
        <span v-else-if="published" class="badge badge-live">与线上一致</span>
      </div>
      <div class="header-right">
        <span v-if="loading" class="preview-hint">加载中…</span>
        <button class="btn btn-secondary btn-small" :disabled="loading" @click="loadPreview">
          刷新预览
        </button>
      </div>
    </div>

    <p class="preview-note">
      这里显示的是<strong>草稿</strong>的实时效果，<strong>不会影响线上用户</strong>。
      满意后请到「发布中心」执行发布，发布成功才会同步到小程序。
    </p>

    <div v-if="error" class="preview-error">
      <strong>无法预览</strong>
      <span>{{ error }}</span>
    </div>

    <div v-else-if="!preview" class="preview-empty">
      <p>还没有草稿。</p>
      <p class="muted">请先到「模板中心」选择一个模板，预览会自动出现在这里。</p>
    </div>

    <div v-else class="preview-body">
      <div class="page-tabs">
        <button
          v-for="page in pageOptions"
          :key="page.key"
          :class="['page-tab', { active: activePage === page.key }]"
          @click="activePage = page.key"
        >
          {{ page.label }}
          <span class="tab-count">{{ page.blockCount }}</span>
        </button>
      </div>

      <div class="stage">
        <div class="phone-shell">
          <div class="phone-nav-bar">
            <span class="phone-nav-title">{{ preview.templateName }}</span>
          </div>
          <div class="phone-screen">
            <div v-if="warnings.length" class="preview-warnings">
              <details>
                <summary>{{ warnings.length }} 条编译提示</summary>
                <div v-for="(warning, index) in warnings" :key="index" class="warning-item">
                  {{ warning }}
                </div>
              </details>
            </div>

            <div v-if="!activeBlocks.length" class="phone-empty">
              该页面暂无可预览的区块
            </div>

            <section
              v-for="block in activeBlocks"
              :key="block.id"
              :class="['v3-block', `v3-block--${block.type}`]"
            >
              <!-- 首屏主视觉 -->
              <div v-if="block.type === 'hero'" class="v3-hero" :class="`v3-hero--${block.variant}`">
                <div v-if="heroSlides.length" class="v3-hero-media-wrap">
                  <img :src="heroSlides[0].imageUrl" :alt="heroSlides[0].title" class="v3-hero-media" />
                  <div class="v3-hero-mask"></div>
                  <div class="v3-hero-copy">
                    <span v-if="block.settings.showSubtitle !== false && heroSlides[0].category" class="v3-hero-category">
                      {{ heroSlides[0].category }}
                    </span>
                    <span class="v3-hero-title">{{ heroSlides[0].title }}</span>
                  </div>
                </div>
                <div v-else class="v3-hero-missing">
                  {{ block.dataSource?.type === 'current-series' ? '详情页首屏需在小程序中打开具体作品查看' : '首屏内容为空' }}
                </div>
              </div>

              <!-- 分类导航 -->
              <div v-else-if="block.type === 'category-nav'" class="v3-category-nav" :class="`v3-category-nav--${block.variant}`">
                <span
                  v-for="category in asList(block.content)"
                  :key="category.name"
                  class="v3-category-chip"
                >
                  {{ category.name }}
                  <em v-if="category.count">{{ category.count }}</em>
                </span>
              </div>

              <!-- 作品画廊 -->
              <div v-else-if="block.type === 'portfolio-grid'" class="v3-grid" :class="`v3-grid--${block.variant}`">
                <div
                  v-for="item in asList(block.content).slice(0, 6)"
                  :key="item.id"
                  class="v3-grid-card"
                >
                  <div class="v3-grid-media-wrap" :class="mediaRatioClass(block)">
                    <img v-if="item.imageUrl" :src="item.imageUrl" :alt="item.title" class="v3-grid-media" />
                    <div v-else class="v3-grid-media-empty"></div>
                  </div>
                  <div class="v3-grid-caption">
                    <span v-if="block.settings.showCategory !== false && item.category" class="v3-grid-category">
                      {{ item.category }}
                    </span>
                    <span class="v3-grid-title">{{ item.title }}</span>
                    <span v-if="block.settings.showPhotoCount && item.photoCount" class="v3-grid-count">
                      {{ item.photoCount }} 张
                    </span>
                  </div>
                </div>
              </div>

              <!-- 品牌介绍 -->
              <div v-else-if="block.type === 'brand-intro'" class="v3-brand-intro" :class="`v3-brand-intro--${block.variant}`">
                <h3 class="v3-section-title">{{ block.content?.brandName || '品牌名称' }}</h3>
                <p v-if="block.content?.slogan" class="v3-section-sub">{{ block.content.slogan }}</p>
                <p v-if="block.content?.description" class="v3-section-body">{{ block.content.description }}</p>
              </div>

              <!-- 套系列表 -->
              <div v-else-if="block.type === 'package-list'" class="v3-package-list" :class="`v3-package-list--${block.variant}`">
                <h3 class="v3-section-title">套系方案</h3>
                <div
                  v-for="pkg in asList(block.content)"
                  :key="pkg.id"
                  class="v3-package-card"
                >
                  <div class="v3-package-name">{{ pkg.name || pkg.title }}</div>
                  <div v-if="pkg.price" class="v3-package-price">{{ pkg.price }}</div>
                  <div v-if="pkg.description" class="v3-package-desc">{{ pkg.description }}</div>
                </div>
              </div>

              <!-- 团队展示 -->
              <div v-else-if="block.type === 'team'" class="v3-team" :class="`v3-team--${block.variant}`">
                <h3 class="v3-section-title">拍摄团队</h3>
                <div class="v3-team-list">
                  <div v-for="person in asList(block.content)" :key="person.id" class="v3-team-card">
                    <img v-if="person.avatar" :src="person.avatar" :alt="person.name" class="v3-team-avatar" />
                    <div v-else class="v3-team-avatar v3-team-avatar--empty"></div>
                    <div class="v3-team-name">{{ person.name }}</div>
                    <div v-if="person.title" class="v3-team-role">{{ person.title }}</div>
                  </div>
                </div>
              </div>

              <!-- 客户评价 -->
              <div v-else-if="block.type === 'testimonials'" class="v3-testimonials" :class="`v3-testimonials--${block.variant}`">
                <h3 class="v3-section-title">客户评价</h3>
                <div
                  v-for="item in asList(block.content)"
                  :key="item.id"
                  class="v3-testimonial-card"
                >
                  <p class="v3-testimonial-text">{{ item.content || item.quote || item.text }}</p>
                  <div class="v3-testimonial-author">{{ item.name || item.author }}</div>
                </div>
              </div>

              <!-- 服务流程 -->
              <div v-else-if="block.type === 'service-flow'" class="v3-service-flow" :class="`v3-service-flow--${block.variant}`">
                <h3 class="v3-section-title">服务流程</h3>
                <div
                  v-for="(step, index) in asList(block.content)"
                  :key="index"
                  class="v3-flow-step"
                >
                  <span class="v3-flow-index">{{ index + 1 }}</span>
                  <div>
                    <div class="v3-flow-title">{{ step.title || step.name }}</div>
                    <div v-if="step.description" class="v3-flow-desc">{{ step.description }}</div>
                  </div>
                </div>
              </div>

              <!-- 联系页脚 -->
              <div v-else-if="block.type === 'contact-footer'" class="v3-contact-footer" :class="`v3-contact-footer--${block.variant}`">
                <h3 class="v3-section-title">联系我们</h3>
                <div v-for="store in block.content?.stores || []" :key="store.id" class="v3-store-item">
                  <div class="v3-store-name">{{ store.name }}</div>
                  <div v-if="store.address" class="v3-store-line">{{ store.address }}</div>
                  <div v-if="store.phone" class="v3-store-line">{{ store.phone }}</div>
                </div>
                <div v-if="block.content?.consultation" class="v3-store-item">
                  <div class="v3-store-line">{{ block.content.consultation.description || '欢迎预约咨询' }}</div>
                </div>
              </div>

              <!-- 作品详情画廊 -->
              <div v-else-if="block.type === 'series-gallery'" class="v3-series-gallery" :class="`v3-series-gallery--${block.variant}`">
                <h3 class="v3-section-title">作品详情</h3>
                <div class="v3-series-empty">详情页需在小程序中打开具体作品查看</div>
              </div>

              <!-- 兜底：未识别的区块 -->
              <div v-else class="v3-block-unknown">
                区块「{{ block.type }}」暂无预览样式（{{ block.variant }}）
              </div>
            </section>
          </div>
        </div>

        <aside class="preview-meta">
          <div class="meta-block">
            <h4>草稿信息</h4>
            <dl>
              <dt>模板</dt>
              <dd>{{ preview.templateName }}</dd>
              <dt>页面</dt>
              <dd>{{ preview.compiledPages.length }} 个</dd>
              <dt>区块</dt>
              <dd>{{ totalBlockCount }} 个</dd>
            </dl>
          </div>
          <div v-if="published" class="meta-block">
            <h4>线上版本</h4>
            <dl>
              <dt>模板</dt>
              <dd>{{ published.templateId }}</dd>
              <dt>发布时间</dt>
              <dd>{{ formatDate(published.updatedAt) }}</dd>
            </dl>
          </div>
          <div v-else class="meta-block">
            <h4>线上版本</h4>
            <p class="muted">尚未发布过，线上仍为旧版装修。</p>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDesignApi } from '../composables/useDesignApi'
import type { PreviewResponse, PreviewBlock, PreviewPayload } from '../types/api'

const api = useDesignApi()

const preview = ref<PreviewPayload | null>(null)
const published = ref<{ templateId: string; updatedAt: string } | null>(null)
const hasUnpublishedChanges = ref(false)
const activePage = ref('portfolio')
const loading = ref(false)
const error = ref('')

const PAGE_LABELS: Record<string, string> = {
  portfolio: '作品首页',
  series: '作品详情',
  about: '关于我们',
  packages: '套餐列表'
}

function asList(value: any): any[] {
  return Array.isArray(value) ? value : []
}

function mediaRatioClass(block: PreviewBlock): string {
  const ratio = block.settings?.mediaRatio
  if (ratio === 'square') return 'v3-grid-media--square'
  if (ratio === 'landscape') return 'v3-grid-media--landscape'
  if (ratio === 'natural') return 'v3-grid-media--natural'
  return 'v3-grid-media--portrait'
}

function formatDate(value: string): string {
  if (!value) return '未知'
  try {
    return new Date(value).toLocaleString('zh-CN')
  } catch {
    return value
  }
}

const pageOptions = computed(() => {
  if (!preview.value) return []
  return Object.entries(preview.value.pages).map(([key, page]) => ({
    key,
    label: PAGE_LABELS[key] || key,
    blockCount: page.blocks?.length || 0
  }))
})

const activeBlocks = computed<PreviewBlock[]>(() => {
  if (!preview.value) return []
  return preview.value.pages?.[activePage.value]?.blocks || []
})

const heroSlides = computed(() => {
  const hero = activeBlocks.value.find((block) => block.type === 'hero')
  return asList(hero?.content)
})

const warnings = computed(() => preview.value?.warnings || [])

const totalBlockCount = computed(() => {
  if (!preview.value) return 0
  return Object.values(preview.value.pages).reduce(
    (sum, page) => sum + (page.blocks?.length || 0),
    0
  )
})

async function loadPreview() {
  loading.value = true
  error.value = ''
  try {
    const data: PreviewResponse = await api.getPreview()
    preview.value = data.preview
    published.value = data.published
    hasUnpublishedChanges.value = data.hasUnpublishedChanges
    if (!data.preview?.pages?.[activePage.value]) {
      const first = Object.keys(data.preview?.pages || {})[0]
      if (first) activePage.value = first
    }
  } catch (err: any) {
    preview.value = null
    error.value = err?.message || '预览加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadPreview)
</script>

<style scoped>
.draft-preview {
  max-width: 1200px;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge-draft {
  background: #fef3c7;
  color: #92400e;
}

.badge-warn {
  background: #fee2e2;
  color: #991b1b;
}

.badge-live {
  background: #dcfce7;
  color: #166534;
}

.preview-hint {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.preview-note {
  margin: 12px 0 20px;
  padding: 12px 16px;
  background: var(--color-surface-secondary);
  border-left: 3px solid var(--color-primary);
  border-radius: 4px;
  font-size: 0.875rem;
  line-height: 1.7;
  color: var(--color-text-muted);
}

.preview-note strong {
  color: var(--color-text);
}

.preview-error {
  padding: 20px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-empty {
  padding: 48px 24px;
  text-align: center;
  color: var(--color-text-muted);
}

.preview-empty p {
  margin: 0 0 6px;
}

.muted {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.page-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 18px;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 10px;
}

.page-tab {
  padding: 7px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.875rem;
  transition: all 0.15s ease;
}

.page-tab:hover {
  color: var(--color-text);
  background: var(--color-surface-secondary);
}

.page-tab.active {
  color: var(--color-primary);
  background: var(--color-surface-secondary);
  border-color: var(--color-primary);
}

.tab-count {
  margin-left: 6px;
  font-size: 0.75rem;
  opacity: 0.7;
}

.stage {
  display: flex;
  gap: 28px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.phone-shell {
  width: 375px;
  flex: 0 0 375px;
  background: #1c1917;
  border-radius: 36px;
  padding: 12px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.18);
}

.phone-nav-bar {
  background: #fff;
  border-radius: 26px 26px 0 0;
  padding: 14px 18px 10px;
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1c1917;
  text-align: center;
}

.phone-screen {
  background: #fff;
  border-radius: 0 0 26px 26px;
  padding: 14px 16px 24px;
  max-height: 640px;
  overflow-y: auto;
}

.phone-empty {
  padding: 40px 0;
  text-align: center;
  color: #a8a29e;
  font-size: 0.875rem;
}

.preview-warnings {
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 6px;
}

.preview-warnings summary {
  font-size: 0.75rem;
  color: #92400e;
  cursor: pointer;
  list-style: none;
}

.preview-warnings summary::-webkit-details-marker {
  display: none;
}

.preview-warnings summary::before {
  content: '▸ ';
}

.preview-warnings details[open] summary::before {
  content: '▾ ';
}

.warning-item {
  font-size: 0.75rem;
  color: #92400e;
  line-height: 1.6;
  margin-top: 4px;
}

.v3-block {
  margin-bottom: 22px;
}

.v3-section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1c1917;
  margin: 0 0 4px;
}

.v3-section-sub {
  font-size: 0.8125rem;
  color: #78716c;
  margin: 0 0 10px;
}

.v3-section-body {
  font-size: 0.8125rem;
  color: #57534e;
  line-height: 1.8;
  margin: 0;
}

.v3-hero-media-wrap {
  position: relative;
  height: 210px;
  border-radius: 10px;
  overflow: hidden;
}

.v3-hero-media {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.v3-hero-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.05) 35%, rgba(0, 0, 0, 0.6) 100%);
}

.v3-hero-copy {
  position: absolute;
  left: 16px;
  bottom: 14px;
  color: #fff;
}

.v3-hero-category {
  display: block;
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  opacity: 0.85;
}

.v3-hero-title {
  display: block;
  font-size: 1.375rem;
  font-weight: 600;
  margin-top: 4px;
}

.v3-hero-missing,
.v3-series-empty {
  padding: 28px 12px;
  text-align: center;
  color: #a8a29e;
  font-size: 0.8125rem;
  background: #f5f5f4;
  border-radius: 8px;
}

.v3-category-nav {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.v3-category-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 7px 14px;
  border: 1px solid #e7e5e4;
  border-radius: 999px;
  background: #fafaf9;
  font-size: 0.8125rem;
  color: #1c1917;
}

.v3-category-chip em {
  font-style: normal;
  font-size: 0.6875rem;
  color: #a8a29e;
}

.v3-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.v3-grid--three-column {
  grid-template-columns: repeat(3, 1fr);
}

.v3-grid-media-wrap {
  border-radius: 8px;
  overflow: hidden;
  background: #f5f5f4;
}

.v3-grid-media--portrait {
  aspect-ratio: 3 / 4;
}

.v3-grid-media--square {
  aspect-ratio: 1 / 1;
}

.v3-grid-media--landscape {
  aspect-ratio: 4 / 3;
}

.v3-grid-media {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.v3-grid-media-empty {
  width: 100%;
  height: 100%;
  background: #e7e5e4;
}

.v3-grid-caption {
  padding-top: 6px;
}

.v3-grid-category {
  display: block;
  font-size: 0.6875rem;
  color: #a8a29e;
}

.v3-grid-title {
  display: block;
  font-size: 0.8125rem;
  color: #1c1917;
  font-weight: 500;
}

.v3-grid-count {
  display: block;
  font-size: 0.6875rem;
  color: #a8a29e;
}

.v3-package-card {
  margin-top: 10px;
  padding: 14px 16px;
  background: #fafaf9;
  border: 1px solid #e7e5e4;
  border-radius: 10px;
}

.v3-package-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1c1917;
}

.v3-package-price {
  margin-top: 6px;
  font-size: 1rem;
  color: #7c6a5d;
  font-weight: 600;
}

.v3-package-desc {
  margin-top: 6px;
  font-size: 0.75rem;
  color: #78716c;
  line-height: 1.6;
}

.v3-team-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 12px;
}

.v3-team-card {
  text-align: center;
}

.v3-team-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  margin: 0 auto;
  display: block;
}

.v3-team-avatar--empty {
  background: #e7e5e4;
}

.v3-team-name {
  margin-top: 8px;
  font-size: 0.8125rem;
  color: #1c1917;
}

.v3-team-role {
  font-size: 0.6875rem;
  color: #a8a29e;
}

.v3-testimonial-card {
  margin-top: 10px;
  padding: 14px 16px;
  background: #fafaf9;
  border: 1px solid #e7e5e4;
  border-radius: 10px;
}

.v3-testimonial-text {
  margin: 0;
  font-size: 0.8125rem;
  color: #44403c;
  line-height: 1.75;
}

.v3-testimonial-author {
  margin-top: 8px;
  font-size: 0.6875rem;
  color: #a8a29e;
}

.v3-flow-step {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  margin-top: 12px;
}

.v3-flow-index {
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #7c6a5d;
  color: #fff;
  font-size: 0.6875rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.v3-flow-title {
  font-size: 0.875rem;
  color: #1c1917;
}

.v3-flow-desc {
  margin-top: 2px;
  font-size: 0.75rem;
  color: #78716c;
  line-height: 1.6;
}

.v3-contact-footer {
  padding: 18px;
  background: #f5f5f4;
  border-radius: 12px;
}

.v3-store-item {
  margin-top: 8px;
}

.v3-store-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1c1917;
}

.v3-store-line {
  font-size: 0.75rem;
  color: #78716c;
  line-height: 1.7;
}

.v3-block-unknown {
  padding: 14px;
  border: 1px dashed #d6d3d1;
  border-radius: 8px;
  color: #a8a29e;
  font-size: 0.75rem;
  text-align: center;
}

.preview-meta {
  flex: 1;
  min-width: 240px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.meta-block {
  padding: 16px 18px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.meta-block h4 {
  margin: 0 0 10px;
  font-size: 0.875rem;
  color: var(--color-text);
}

.meta-block dl {
  margin: 0;
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 6px 10px;
  font-size: 0.8125rem;
}

.meta-block dt {
  color: var(--color-text-muted);
}

.meta-block dd {
  margin: 0;
  color: var(--color-text);
  word-break: break-all;
}
</style>
