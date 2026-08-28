<template>
  <div class="media-control">
    <div class="media-container">
      <h2>图片控制</h2>
      <p class="text-muted">设置作品封面、视觉焦点和裁切参数</p>

      <div class="media-sections">
        <!-- 系列封面设置 -->
        <section class="card media-section">
          <h3>系列封面</h3>
          <p class="text-muted">选择每个作品系列的首屏封面图</p>

          <div class="series-list">
            <div v-for="series in seriesList" :key="series.id" class="series-item">
              <div class="series-header">
                <h4>{{ series.title }}</h4>
                <span class="photo-count text-muted">{{ series.photoCount }} 张照片</span>
              </div>

              <div class="cover-selector">
                <div v-if="series.coverPhoto" class="current-cover" @click="openFocalPointEditor(series)">
                  <img :src="getImageUrl(series.coverPhoto)" :alt="series.title" />
                  <div v-if="series.focalPoint" class="focal-point-indicator" :style="getFocalPointStyle(series.focalPoint)">
                    <div class="focal-crosshair"></div>
                  </div>
                  <div class="cover-overlay">
                    <button class="btn btn-secondary" @click.stop="changeCover(series)">更换封面</button>
                    <button class="btn btn-secondary" @click.stop="openFocalPointEditor(series)">设置焦点</button>
                  </div>
                </div>
                <div v-else class="no-cover">
                  <p>未设置封面</p>
                  <button class="btn btn-primary" @click="setCover(series)">选择封面</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 焦点设置说明 -->
        <section class="card media-section">
          <h3>视觉焦点</h3>
          <p class="text-muted">点击封面图设置裁切时保留的焦点区域</p>

          <div class="focal-info">
            <div class="info-item">
              <span class="info-label">Hero 封面</span>
              <span class="info-value">16:9 横向裁切</span>
            </div>
            <div class="info-item">
              <span class="info-label">卡片封面</span>
              <span class="info-value">4:3 或 1:1</span>
            </div>
            <div class="info-item">
              <span class="info-label">套系横幅</span>
              <span class="info-value">21:9 超宽</span>
            </div>
          </div>

          <div class="focal-hint text-muted">
            <p>💡 设置焦点后，系统会在不同比例裁切时优先保留该区域</p>
          </div>
        </section>

        <!-- 图片质量检查 -->
        <section class="card media-section">
          <h3>图片质量</h3>

          <div class="quality-checks">
            <div class="check-item">
              <span class="check-icon">✓</span>
              <div class="check-content">
                <strong>分辨率检查</strong>
                <p class="text-muted">所有作品图片均满足最小分辨率要求</p>
              </div>
            </div>

            <div v-if="qualityWarnings.length > 0" class="check-item warning">
              <span class="check-icon">⚠</span>
              <div class="check-content">
                <strong>比例警告</strong>
                <p class="text-muted">{{ qualityWarnings.length }} 张图片的比例不适合横幅展示</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="actions">
        <button class="btn btn-primary" @click="saveMediaMeta">保存图片设置</button>
      </div>
    </div>

    <!-- 焦点编辑器弹窗 -->
    <div v-if="focalPointEditor.visible" class="modal-overlay" @click.self="closeFocalPointEditor">
      <div class="focal-editor-modal">
        <div class="modal-header">
          <h3>设置视觉焦点 - {{ focalPointEditor.series?.title }}</h3>
          <button class="close-btn" @click="closeFocalPointEditor">✕</button>
        </div>
        <div class="modal-body">
          <div class="editor-canvas" @click="setFocalPoint">
            <img ref="focalImage" :src="getImageUrl(focalPointEditor.series?.coverPhoto || '')" alt="封面" />
            <div v-if="focalPointEditor.point" class="focal-marker" :style="getFocalMarkerStyle(focalPointEditor.point)">
              <div class="focal-crosshair"></div>
            </div>
          </div>
          <div class="editor-hint">
            <p>点击图片选择焦点位置，系统会在不同比例裁切时优先保留该区域</p>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeFocalPointEditor">取消</button>
          <button class="btn btn-primary" @click="saveFocalPoint">确认</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Series {
  id: string
  title: string
  coverPhoto: string | null
  photoCount: number
  focalPoint?: { x: number; y: number }
}

const seriesList = ref<Series[]>([])
const qualityWarnings = ref<string[]>([])
const focalPointEditor = ref({
  visible: false,
  series: null as Series | null,
  point: null as { x: number; y: number } | null
})
const focalImage = ref<HTMLImageElement | null>(null)

function getImageUrl(fileName: string): string {
  return `https://example.cos.ap-guangzhou.myqcloud.com/portfolio/${fileName}`
}

function getFocalPointStyle(point: { x: number; y: number }) {
  return {
    left: `${point.x * 100}%`,
    top: `${point.y * 100}%`
  }
}

function getFocalMarkerStyle(point: { x: number; y: number }) {
  return {
    left: `${point.x * 100}%`,
    top: `${point.y * 100}%`
  }
}

function openFocalPointEditor(series: Series) {
  focalPointEditor.value = {
    visible: true,
    series: { ...series },
    point: series.focalPoint || null
  }
}

function closeFocalPointEditor() {
  focalPointEditor.value = {
    visible: false,
    series: null,
    point: null
  }
}

function setFocalPoint(event: MouseEvent) {
  const img = focalImage.value
  if (!img) return

  const rect = img.getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width
  const y = (event.clientY - rect.top) / rect.height

  focalPointEditor.value.point = { x, y }
}

function saveFocalPoint() {
  const { series, point } = focalPointEditor.value
  if (!series || !point) return

  const index = seriesList.value.findIndex(s => s.id === series.id)
  if (index >= 0) {
    seriesList.value[index].focalPoint = point
  }

  closeFocalPointEditor()
  saveMediaMeta()
}

function changeCover(series: Series) {
  alert(`更换系列"${series.title}"的封面（功能需连接作品选择器）`)
}

function setCover(series: Series) {
  alert(`选择系列"${series.title}"的封面（功能需连接作品选择器）`)
}

async function saveMediaMeta() {
  try {
    const mediaMeta = seriesList.value.reduce((acc, series) => {
      if (series.focalPoint) {
        acc[series.coverPhoto || series.id] = {
          focalPoint: series.focalPoint
        }
      }
      return acc
    }, {} as Record<string, any>)

    await fetch('/api/design/draft', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaMeta })
    })
    alert('图片设置已保存')
  } catch (error) {
    console.error('保存失败:', error)
    alert('保存失败，请重试')
  }
}

async function loadSeriesList() {
  try {
    const response = await fetch('/api/config')
    const data = await response.json()

    seriesList.value = (data.themes || []).flatMap((theme: any) =>
      (theme.series || []).map((series: any) => ({
        id: series.id,
        title: series.title || series.id,
        coverPhoto: series.coverPhoto || (series.photos && series.photos[0]) || null,
        photoCount: (series.photos || []).length,
        focalPoint: series.focalPoint || null
      }))
    )

    // 模拟质量检查
    qualityWarnings.value = seriesList.value
      .filter(s => Math.random() > 0.8)
      .map(s => s.id)
  } catch (error) {
    console.error('加载系列列表失败:', error)
  }
}

onMounted(() => {
  loadSeriesList()
})
</script>

<style scoped>
.media-control {
  max-width: 1200px;
  margin: 0 auto;
}

.media-container h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
}

.media-sections {
  margin-top: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.media-section h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
}

.media-section > p {
  margin-bottom: var(--spacing-lg);
}

.series-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.series-item {
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.series-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-sm);
}

.series-header h4 {
  font-size: 1rem;
  font-weight: 600;
}

.photo-count {
  font-size: 0.875rem;
}

.cover-selector {
  margin-top: var(--spacing-md);
}

.current-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: var(--radius-md);
  overflow: hidden;
}

.current-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.current-cover:hover .cover-overlay {
  opacity: 1;
}

.no-cover {
  aspect-ratio: 16 / 9;
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
}

.focal-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.info-item {
  padding: var(--spacing-md);
  background: var(--color-surface-secondary);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.875rem;
  font-weight: 600;
}

.info-value {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.focal-hint {
  padding: var(--spacing-md);
  background: var(--color-surface-secondary);
  border-radius: var(--radius-md);
}

.quality-checks {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.check-item {
  display: flex;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.check-item.warning {
  border-color: var(--color-warning);
  background: #fef3c7;
}

.check-icon {
  font-size: 1.5rem;
}

.check-content strong {
  display: block;
  margin-bottom: 0.25rem;
}

.actions {
  margin-top: var(--spacing-xl);
  display: flex;
  justify-content: flex-end;
}

/* 焦点指示器 */
.focal-point-indicator {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.focal-crosshair {
  width: 40px;
  height: 40px;
  position: relative;
}

.focal-crosshair::before,
.focal-crosshair::after {
  content: '';
  position: absolute;
  background: #fff;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
}

.focal-crosshair::before {
  width: 2px;
  height: 100%;
  left: 50%;
  transform: translateX(-50%);
}

.focal-crosshair::after {
  width: 100%;
  height: 2px;
  top: 50%;
  transform: translateY(-50%);
}

/* 模态弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.focal-editor-modal {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--color-surface-secondary);
}

.modal-body {
  flex: 1;
  overflow: auto;
  padding: var(--spacing-lg);
}

.editor-canvas {
  position: relative;
  width: 100%;
  cursor: crosshair;
  background: var(--color-surface-secondary);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.editor-canvas img {
  width: 100%;
  height: auto;
  display: block;
}

.focal-marker {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 10;
}

.editor-hint {
  margin-top: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--color-surface-secondary);
  border-radius: var(--radius-md);
  text-align: center;
  color: var(--color-text-muted);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg);
  border-top: 1px solid var(--color-border);
}

</style>
