<template>
  <div class="global-settings">
    <div class="settings-container">
      <h2>全局设置</h2>
      <p class="text-muted">配置品牌信息、配色方案、字体组合和视觉风格</p>

      <div class="settings-sections">
        <!-- 品牌信息 -->
        <section class="card settings-section">
          <h3>品牌信息</h3>
          <div class="form-group">
            <label class="label">品牌名称</label>
            <input v-model="settings.brand.name" type="text" class="input" placeholder="拾光摄影工作室" />
          </div>
          <div class="form-group">
            <label class="label">英文名称</label>
            <input v-model="settings.brand.nameEn" type="text" class="input" placeholder="Shiguang Studio" />
          </div>
          <div class="form-group">
            <label class="label">品牌标语</label>
            <input v-model="settings.brand.slogan" type="text" class="input" placeholder="记录美好瞬间" />
          </div>
        </section>

        <!-- 推荐配色 -->
        <section class="card settings-section">
          <h3>推荐配色方案</h3>
          <div class="color-schemes">
            <label v-for="scheme in colorSchemes" :key="scheme.id" class="color-scheme">
              <input v-model="settings.colorScheme" type="radio" :value="scheme.id" />
              <span class="scheme-preview">
                <span v-for="color in scheme.colors" :key="color" :style="{ backgroundColor: color }" class="color-swatch"></span>
              </span>
              <span class="scheme-name">{{ scheme.name }}</span>
            </label>
          </div>
        </section>

        <!-- 字体组合 -->
        <section class="card settings-section">
          <h3>字体组合</h3>
          <div class="font-options">
            <label v-for="font in fontOptions" :key="font.id" class="font-option">
              <input v-model="settings.fontStyle" type="radio" :value="font.id" />
              <span class="font-preview" :style="{ fontFamily: font.preview }">{{ font.name }}</span>
            </label>
          </div>
        </section>

        <!-- 页面密度 -->
        <section class="card settings-section">
          <h3>页面密度</h3>
          <div class="density-options">
            <label v-for="density in densityOptions" :key="density.value" class="density-option">
              <input v-model="settings.layoutDensity" type="radio" :value="density.value" />
              <span>{{ density.label }}</span>
            </label>
          </div>
        </section>

        <!-- 圆角气质 -->
        <section class="card settings-section">
          <h3>圆角气质</h3>
          <div class="radius-options">
            <label v-for="radius in radiusOptions" :key="radius.value" class="radius-option">
              <input v-model="settings.imageRadius" type="radio" :value="radius.value" />
              <span>{{ radius.label }}</span>
            </label>
          </div>
        </section>
      </div>

      <div class="actions">
        <button class="btn btn-secondary" @click="resetDefaults">恢复默认</button>
        <button class="btn btn-primary" @click="saveSettings">保存草稿</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const settings = ref({
  brand: {
    name: '',
    nameEn: '',
    slogan: ''
  },
  colorScheme: 'warm-natural',
  fontStyle: 'modern-sans',
  layoutDensity: 'normal',
  imageRadius: 'rounded'
})

const colorSchemes = [
  { id: 'warm-natural', name: '温暖自然', colors: ['#f5f5f4', '#7c6a5d', '#292524'] },
  { id: 'cool-minimal', name: '清冷简约', colors: ['#ffffff', '#94a3b8', '#1e293b'] },
  { id: 'dark-luxury', name: '深色奢华', colors: ['#0f172a', '#8b5cf6', '#e2e8f0'] }
]

const fontOptions = [
  { id: 'modern-sans', name: '现代无衬线', preview: '-apple-system, sans-serif' },
  { id: 'editorial-serif', name: '编辑部衬线', preview: 'Georgia, serif' },
  { id: 'lifestyle-soft', name: '柔和生活方式', preview: 'system-ui, sans-serif' }
]

const densityOptions = [
  { value: 'compact', label: '紧凑' },
  { value: 'normal', label: '标准' },
  { value: 'spacious', label: '舒展' }
]

const radiusOptions = [
  { value: 'none', label: '直角' },
  { value: 'rounded', label: '轻圆角' },
  { value: 'soft', label: '柔和' }
]

async function loadSettings() {
  try {
    const response = await fetch('/api/design/draft')
    const data = await response.json()
    if (data.draft) {
      settings.value = {
        brand: data.draft.brand || settings.value.brand,
        colorScheme: data.draft.tokens?.colorScheme || settings.value.colorScheme,
        fontStyle: data.draft.tokens?.fontStyle || settings.value.fontStyle,
        layoutDensity: data.draft.tokens?.layoutDensity || settings.value.layoutDensity,
        imageRadius: data.draft.tokens?.imageRadius || settings.value.imageRadius
      }
    }
  } catch (error) {
    console.error('加载设置失败:', error)
  }
}

async function saveSettings() {
  try {
    const response = await fetch('/api/design/draft', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand: settings.value.brand,
        tokens: {
          colorScheme: settings.value.colorScheme,
          fontStyle: settings.value.fontStyle,
          layoutDensity: settings.value.layoutDensity,
          imageRadius: settings.value.imageRadius
        }
      })
    })

    if (!response.ok) throw new Error('保存失败')

    alert('设置已保存到草稿')
  } catch (error) {
    console.error('保存设置失败:', error)
    alert('保存失败，请重试')
  }
}

function resetDefaults() {
  if (!confirm('确定要恢复默认设置吗？')) return
  settings.value = {
    brand: { name: '', nameEn: '', slogan: '' },
    colorScheme: 'warm-natural',
    fontStyle: 'modern-sans',
    layoutDensity: 'normal',
    imageRadius: 'rounded'
  }
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.global-settings {
  max-width: 900px;
  margin: 0 auto;
}

.settings-container h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: var(--spacing-xs);
}

.settings-sections {
  margin-top: var(--spacing-xl);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.settings-section h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: var(--spacing-md);
}

.form-group {
  margin-bottom: var(--spacing-md);
}

.form-group:last-child {
  margin-bottom: 0;
}

.color-schemes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-md);
}

.color-scheme {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
}

.color-scheme:has(input:checked) {
  border-color: var(--color-primary);
  background-color: var(--color-surface-secondary);
}

.color-scheme input {
  margin: 0;
}

.scheme-preview {
  display: flex;
  gap: 0.25rem;
}

.color-swatch {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
}

.scheme-name {
  font-weight: 500;
}

.font-options, .density-options, .radius-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.font-option, .density-option, .radius-option {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s ease;
}

.font-option:has(input:checked),
.density-option:has(input:checked),
.radius-option:has(input:checked) {
  border-color: var(--color-primary);
  background-color: var(--color-surface-secondary);
}

.font-preview {
  font-size: 1.125rem;
  font-weight: 500;
}

.actions {
  margin-top: var(--spacing-xl);
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
}
</style>
