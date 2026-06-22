// 配置
const CONFIG = {
  // API 地址
  apiUrl: 'http://localhost:8080/api',  // 改为 8080
  // 腾讯云 COS 配置
  cos: {
    BaseUrl: ''
  }
}

// 全局状态
let portfolioData = { themes: [] }
let currentTheme = null
let currentSeries = null
let currentEditSeriesIndex = -1
let selectedFiles = []
let nextSelectedFileId = 1
let uploadTasks = []
let uploadPollTimer = null
const expandedSeriesKeys = new Set()
const UI_CONFIG = {
  maxVisiblePhotos: 8,
  photoThumbSize: 120
}
const DEFAULT_HOME_BANNER = {
  logoText: '摄影作品合集',
  tagText: '精选作品',
  description: '展示摄影作品、服务风格和预约入口。'
}
// CMS 配置缺失时的兜底值；真实客户配置通过“预约设置”保存到 booking.styleOptions。
const FALLBACK_BOOKING_CONFIG = {
  styleOptions: ['写真', '古风', '婚纱', '亲子', '商业']
}

const DEFAULT_CONSULTATION_TEMPLATE = `你好，我想咨询拍摄：

称呼：{{name}}
联系方式：{{contact}}
拍摄风格：{{style}}
意向套餐：{{package}}
期望日期：{{date}}
门店：{{store}}
摄影师：{{photographer}}
备注：{{note}}

我是在小程序中看到作品后联系你的，想进一步确认档期和拍摄方案。`

const DEFAULT_V11_CONFIG = {
  configVersion: '1.1.0',
  modules: {
    theme: true,
    packages: true,
    schedule: true,
    testimonials: true,
    photographers: false,
    stores: true,
    serviceFlow: true,
    faq: true,
    consultButton: true
  },
  theme: {
    enabled: true,
    preset: 'minimal',
    brandName: '摄影作品合集',
    primaryColor: '#7C6A5D',
    backgroundColor: '#FAFAF9',
    textColor: '#292524',
    cardStyle: 'soft',
    buttonStyle: 'rounded',
    imageRadius: 'medium',
    layoutDensity: 'comfortable',
    homeLayout: 'banner-first',
    showDecorations: true
  },
  packages: [
    {
      id: 'portrait-basic',
      name: '个人写真基础套餐',
      priceText: '¥699 起',
      subtitle: '适合头像、生日纪念、日常写真',
      duration: '约 2 小时',
      retouchCount: '6 张精修',
      originalPhotos: '底片精选交付',
      makeupIncluded: true,
      makeupText: '含基础妆造',
      includes: ['拍摄前沟通', '拍摄指导', '服装搭配建议', '6 张精修', '底片精选交付'],
      suitableFor: ['个人写真', '头像拍摄', '生日纪念'],
      relatedSeriesIds: [],
      relatedPhotographerIds: [],
      isRecommended: true,
      sort: 1,
      enabled: true
    }
  ],
  schedule: {
    enabled: true,
    title: '近期档期',
    notice: '档期仅供参考，具体拍摄时间请与摄影师确认。',
    availableText: '本周还有少量可沟通档期',
    restDays: [],
    busyDates: [],
    specialNotes: ['周末档期较紧张，建议提前沟通']
  },
  testimonials: [
    {
      id: 'review-001',
      name: '示例客户',
      shootType: '个人写真',
      content: '摄影师很会引导，拍摄过程轻松，成片效果很喜欢。',
      imageUrl: '',
      relatedSeriesId: '',
      relatedPackageId: 'portrait-basic',
      dateText: '2026 年 6 月',
      sort: 1,
      enabled: true
    }
  ],
  consultButton: {
    enabled: true,
    text: '咨询拍摄',
    action: 'booking',
    showOnPages: ['portfolio', 'seriesDetail', 'packageDetail', 'about']
  },
  consultation: {
    title: '预约咨询',
    description: '填写信息后可生成咨询内容，发送给摄影师确认档期和方案。',
    template: DEFAULT_CONSULTATION_TEMPLATE,
    privacyTip: '你填写的信息仅用于生成咨询内容，请复制后发送给摄影师确认档期和拍摄方案。'
  },
  serviceFlow: {
    enabled: true,
    steps: [
      { title: '咨询沟通', description: '确认拍摄风格、预算、人数和时间。' },
      { title: '确定方案', description: '根据需求推荐合适套餐和拍摄地点。' },
      { title: '正式拍摄', description: '摄影师现场引导动作和情绪。' },
      { title: '选片修图', description: '拍摄后进行选片和精修交付。' }
    ]
  },
  faq: {
    enabled: true,
    items: [
      { question: '需要提前多久预约咨询？', answer: '建议提前 3-7 天沟通，周末档期建议更早确认。' },
      { question: '不会摆动作怎么办？', answer: '摄影师会在现场进行动作和表情引导。' }
    ]
  },
  photographers: [],
  stores: []
}

const THEME_PRESETS = {
  minimal: {
    preset: 'minimal',
    primaryColor: '#1F1F1F',
    backgroundColor: '#F7F4EF',
    textColor: '#222222',
    cardStyle: 'minimal',
    buttonStyle: 'rounded',
    imageRadius: 'medium',
    layoutDensity: 'comfortable',
    homeLayout: 'banner-first',
    showDecorations: false
  },
  film: {
    preset: 'film',
    primaryColor: '#8A5A44',
    backgroundColor: '#F4E9DD',
    textColor: '#2F241F',
    cardStyle: 'film',
    buttonStyle: 'rounded',
    imageRadius: 'small',
    layoutDensity: 'comfortable',
    homeLayout: 'banner-first',
    showDecorations: true
  },
  bridal: {
    preset: 'bridal',
    primaryColor: '#B9897D',
    backgroundColor: '#FFF7F2',
    textColor: '#3C2F2C',
    cardStyle: 'soft',
    buttonStyle: 'pill',
    imageRadius: 'large',
    layoutDensity: 'spacious',
    homeLayout: 'banner-first',
    showDecorations: true
  },
  family: {
    preset: 'family',
    primaryColor: '#5F8D7A',
    backgroundColor: '#F7FBF5',
    textColor: '#25342E',
    cardStyle: 'soft',
    buttonStyle: 'pill',
    imageRadius: 'large',
    layoutDensity: 'comfortable',
    homeLayout: 'banner-first',
    showDecorations: true
  },
  oriental: {
    preset: 'oriental',
    primaryColor: '#7C3F35',
    backgroundColor: '#F6F0E6',
    textColor: '#2D241C',
    cardStyle: 'minimal',
    buttonStyle: 'rounded',
    imageRadius: 'medium',
    layoutDensity: 'spacious',
    homeLayout: 'banner-first',
    showDecorations: true
  }
}

// 初始化
async function init() {
  console.log('🚀 管理后台启动中...')

  await loadRuntimeSettings()
  await loadConfig()
  await syncUploadTasks()
  renderThemeList()
  updateStats()
  setupDragAndDrop()

  console.log('✅ 管理后台启动完成')
}

async function loadRuntimeSettings() {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/settings`)
    const result = await response.json()
    const bucket = result?.config?.Bucket
    const region = result?.config?.Region

    if (bucket && region) {
      CONFIG.cos.BaseUrl = `https://${bucket}.cos.${region}.myqcloud.com`
    }
  } catch (error) {
    console.warn('未能加载 COS 运行配置:', error)
  }
}

// 加载配置文件
async function loadConfig() {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/config`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    portfolioData = await response.json()
    console.log('✅ 配置加载成功')
  } catch (error) {
    console.error('❌ 加载配置失败:', error)
    showToast('加载配置失败: ' + error.message, 'error')
    portfolioData = { themes: [] }
  }
}

// 保存配置文件
async function saveConfig() {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(portfolioData)
    })

    const result = await response.json()

    if (result.success) {
      console.log('✅ 配置已保存到文件')
      return true
    } else {
      throw new Error(result.error || '保存失败')
    }
  } catch (error) {
    console.error('❌ 保存配置失败:', error)
    showToast('保存配置失败: ' + error.message, 'error')
    return false
  }
}

function getSeriesStateKey(themeId, seriesId) {
  return `${themeId}::${seriesId}`
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function parseListInput(value) {
  return String(value || '')
    .split(/\r?\n|[,，]/)
    .map(item => item.trim())
    .filter(Boolean)
}

function listToTextarea(value) {
  return Array.isArray(value) ? value.join('\n') : ''
}

function setOptionalText(target, key, value) {
  const normalized = String(value || '').trim()
  if (normalized) {
    target[key] = normalized
  } else {
    delete target[key]
  }
}

function setOptionalList(target, key, value) {
  const list = parseListInput(value)
  if (list.length) {
    target[key] = list
  } else {
    delete target[key]
  }
}

function getPhotoThumbUrl(photoName, size = UI_CONFIG.photoThumbSize) {
  if (!CONFIG.cos.BaseUrl) {
    return ''
  }

  return `${CONFIG.cos.BaseUrl}/portfolio/${encodeURIComponent(photoName)}?imageMogr2/format/webp/thumbnail/${size}x/quality/75`
}

function getCosAssetUrl(assetPath) {
  if (!CONFIG.cos.BaseUrl || !assetPath) {
    return ''
  }

  const normalizedPath = String(assetPath).replace(/^\/+/, '')
  return `${CONFIG.cos.BaseUrl}/${normalizedPath}`
}

function resetUploadSelection() {
  selectedFiles.forEach(item => {
    if (item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl)
    }
  })

  selectedFiles = []
  document.getElementById('previewList').innerHTML = ''
  document.getElementById('uploadSummary').textContent = ''
  document.getElementById('fileInput').value = ''
  document.getElementById('uploadBtn').disabled = true
}

function renderUploadPreview() {
  const previewList = document.getElementById('previewList')
  const uploadSummary = document.getElementById('uploadSummary')

  const totalSize = selectedFiles.reduce((sum, item) => sum + item.file.size, 0)
  uploadSummary.textContent = selectedFiles.length > 0
    ? `已选择 ${selectedFiles.length} 张，共 ${formatFileSize(totalSize)}`
    : ''

  previewList.innerHTML = selectedFiles.map(item => `
    <div class="preview-item">
      <img src="${item.previewUrl}" alt="${escapeHtml(item.file.name)}" loading="lazy">
      <button class="remove-preview" onclick="removeFile(${item.id})">×</button>
    </div>
  `).join('')

  document.getElementById('uploadBtn').disabled = selectedFiles.length === 0
}

function formatFileSize(size) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function getUploadStatusMeta(status) {
  switch (status) {
    case 'queued':
      return { label: '排队中', tone: 'info' }
    case 'running':
      return { label: '上传中', tone: 'info' }
    case 'completed':
      return { label: '已完成', tone: 'success' }
    case 'failed':
      return { label: '失败', tone: 'error' }
    default:
      return { label: '未知', tone: 'info' }
  }
}

function renderUploadTasks() {
  const panel = document.getElementById('uploadQueuePanel')
  const list = document.getElementById('uploadQueueList')
  const clearBtn = document.getElementById('clearFinishedUploadsBtn')

  if (!panel || !list) return

  if (uploadTasks.length === 0) {
    panel.style.display = 'none'
    list.innerHTML = ''
    if (clearBtn) clearBtn.disabled = true
    return
  }

  panel.style.display = 'block'
  if (clearBtn) {
    const hasFinishedTasks = uploadTasks.some(task => task.status === 'completed' || task.status === 'failed')
    clearBtn.disabled = !hasFinishedTasks
  }
  list.innerHTML = uploadTasks.map(task => {
    const meta = getUploadStatusMeta(task.status)
    const percent = Number.isFinite(task.progress) ? task.progress : 0
    const progressWidth = Math.max(0, Math.min(100, percent))
    const detail = `${task.completedFiles}/${task.totalFiles} 张 · ${formatFileSize(task.uploadedBytes || 0)} / ${formatFileSize(task.totalBytes || 0)}`

    return `
      <div class="upload-task-card">
        <div class="upload-task-header">
          <div>
            <div class="upload-task-title">${escapeHtml(task.themeName)} / ${escapeHtml(task.seriesTitle)}</div>
            <div class="upload-task-meta">${detail}</div>
          </div>
          <span class="upload-task-badge ${meta.tone}">${meta.label}</span>
        </div>
        <div class="upload-progress-track">
          <div class="upload-progress-bar ${meta.tone}" style="width: ${progressWidth}%"></div>
        </div>
        <div class="upload-task-message">${escapeHtml(task.error || task.message || '')}</div>
      </div>
    `
  }).join('')
}

async function clearFinishedUploads() {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/uploads/finished`, {
      method: 'DELETE'
    })
    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || '清理失败')
    }

    uploadTasks = uploadTasks.filter(task => task.status === 'queued' || task.status === 'running')
    renderUploadTasks()
    updateUploadPolling()
    showToast(`已清理 ${result.clearedCount} 条已结束任务`, 'success')
  } catch (error) {
    console.error('清理上传任务失败:', error)
    showToast('清理上传任务失败: ' + error.message, 'error')
  }
}

function updateUploadPolling() {
  const hasActiveTask = uploadTasks.some(task => task.status === 'queued' || task.status === 'running')

  if (hasActiveTask && !uploadPollTimer) {
    uploadPollTimer = setInterval(() => {
      syncUploadTasks()
    }, 2000)
  }

  if (!hasActiveTask && uploadPollTimer) {
    clearInterval(uploadPollTimer)
    uploadPollTimer = null
  }
}

async function syncUploadTasks({ silent = true } = {}) {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/uploads`)
    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || '获取上传任务失败')
    }

    const previousStatusMap = new Map(uploadTasks.map(task => [task.id, task.status]))
    uploadTasks = result.tasks || []
    renderUploadTasks()
    updateUploadPolling()

    const completedTasks = uploadTasks.filter(task => {
      const previousStatus = previousStatusMap.get(task.id)
      return previousStatus && previousStatus !== 'completed' && task.status === 'completed'
    })

    const failedTasks = uploadTasks.filter(task => {
      const previousStatus = previousStatusMap.get(task.id)
      return previousStatus && previousStatus !== 'failed' && task.status === 'failed'
    })

    if (completedTasks.length > 0) {
      await reloadPortfolioData()
      showToast(`后台上传完成：${completedTasks[0].seriesTitle}`, 'success')
    }

    if (failedTasks.length > 0) {
      showToast(`后台上传失败：${failedTasks[0].seriesTitle}`, 'error')
    }
  } catch (error) {
    console.error('获取上传任务失败:', error)
    if (!silent) {
      showToast('获取上传任务失败: ' + error.message, 'error')
    }
  }
}

async function reloadPortfolioData({ showLoadingToast = false, showSuccessToast = false } = {}) {
  if (showLoadingToast) {
    showToast('刷新中...', 'info')
  }

  await loadConfig()

  if (currentTheme) {
    const theme = portfolioData.themes.find(t => t.id === currentTheme.id)
    if (theme) {
      currentTheme = theme
      renderSeriesList()
    }
  }

  renderThemeList()
  updateStats()

  if (showSuccessToast) {
    showToast('刷新完成', 'success')
  }
}

// 渲染主题列表
function renderThemeList() {
  const themeList = document.getElementById('themeList')
  themeList.innerHTML = portfolioData.themes.map(theme => `
    <li class="theme-item ${currentTheme && currentTheme.id === theme.id ? 'active' : ''}" onclick="selectThemeById('${escapeHtml(theme.id)}')">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>${escapeHtml(theme.name)}</span>
        <span class="edit-icon" onclick="openEditThemeModalById(event, '${escapeHtml(theme.id)}')" title="编辑主题">✏️</span>
      </div>
      <span class="theme-count">${theme.series.length} 系列</span>
    </li>
  `).join('')
}

function selectThemeById(themeId) {
  const theme = portfolioData.themes.find(item => item.id === themeId)
  if (theme) {
    selectTheme(theme)
  }
}

// 选择主题
function selectTheme(theme) {
  currentTheme = theme
  renderThemeList()
  renderSeriesList()
  document.getElementById('currentThemeName').textContent = theme.name
  document.getElementById('addSeriesBtn').style.display = 'block'
}

// 渲染系列列表
function renderSeriesList() {
  const container = document.getElementById('seriesContainer')

  if (!currentTheme || currentTheme.series.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📸</div>
        <p>暂无系列，点击右上角添加</p>
      </div>
    `
    return
  }

  container.innerHTML = `
    <div class="series-grid">
      ${currentTheme.series.map((series, index) => {
        const seriesKey = getSeriesStateKey(currentTheme.id, series.id)
        const isExpanded = expandedSeriesKeys.has(seriesKey)
        const visiblePhotos = isExpanded
          ? series.photos
          : series.photos.slice(0, UI_CONFIG.maxVisiblePhotos)
        const hasMorePhotos = series.photos.length > UI_CONFIG.maxVisiblePhotos
        const photosHtml = visiblePhotos.map((photo, photoIndex) => `
      <div class="photo-item">
        <img loading="lazy" decoding="async" src="${getPhotoThumbUrl(photo)}" alt="${escapeHtml(photo)}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'60\\' height=\\'60\\'%3E%3Crect fill=\\'%23f5f5f4\\' width=\\'60\\' height=\\'60\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'%23a8a29e\\' font-size=\\'12\\'%3E?%3C/text%3E%3C/svg%3E'">
        <button class="delete-photo" onclick="deletePhoto(${index}, ${photoIndex})">×</button>
      </div>
    `).join('')

        return `
    <div class="series-card">
      <div class="series-header">
        <div>
          <div class="series-title">${escapeHtml(series.title)}</div>
          <div style="font-size: 12px; color: #78716c; margin-top: 4px;">
            ❤️ ${series.likes} · 📷 ${series.photos.length} 张
          </div>
          ${series.bannerDescription ? `
            <div style="font-size: 12px; color: #57534e; margin-top: 6px; line-height: 1.5;">
              轮播描述：${escapeHtml(series.bannerDescription)}
            </div>
          ` : ''}
          ${series.description ? `
            <div style="font-size: 12px; color: #57534e; margin-top: 6px; line-height: 1.5;">
              系列介绍：${escapeHtml(series.description)}
            </div>
          ` : ''}
          ${Array.isArray(series.tags) && series.tags.length ? `
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;">
              ${series.tags.map(tag => `<span style="font-size: 11px; color: #7c6a5d; background: #f5f5f4; padding: 3px 8px; border-radius: 999px;">${escapeHtml(tag)}</span>`).join('')}
            </div>
          ` : ''}
        </div>
        <div class="series-actions">
          <button class="icon-btn" onclick="openUploadModal(${index})" title="上传照片">📤</button>
          <button class="icon-btn" onclick="openEditSeriesModal(${index})" title="编辑信息">✏️</button>
          <button class="icon-btn" onclick="deleteSeries(${index})" title="删除系列">🗑️</button>
        </div>
      </div>
      <div class="photo-list">
        ${photosHtml}
        <div class="add-photo-btn" onclick="openUploadModal(${index})">+</div>
      </div>
      ${hasMorePhotos ? `
        <button class="photo-toggle" onclick="toggleSeriesPhotos('${escapeHtml(seriesKey)}')">
          ${isExpanded ? '收起照片' : `展开全部 ${series.photos.length} 张`}
        </button>
      ` : ''}
    </div>
        `
      }).join('')}
    </div>
  `
}

function toggleSeriesPhotos(seriesKey) {
  if (expandedSeriesKeys.has(seriesKey)) {
    expandedSeriesKeys.delete(seriesKey)
  } else {
    expandedSeriesKeys.add(seriesKey)
  }

  renderSeriesList()
}

// 更新统计
function updateStats() {
  let totalSeries = 0
  let totalPhotos = 0

  portfolioData.themes.forEach(theme => {
    totalSeries += theme.series.length
    theme.series.forEach(series => {
      totalPhotos += series.photos.length
    })
  })

  document.getElementById('themeCount').textContent = portfolioData.themes.length
  document.getElementById('seriesCount').textContent = totalSeries
  document.getElementById('photoCount').textContent = totalPhotos
}


// 打开编辑主题模态框 (通过 ID)
function openEditThemeModalById(event, themeId) {
  event.stopPropagation()
  const theme = portfolioData.themes.find(t => t.id === themeId)
  if (!theme) return

  document.getElementById('editThemeId').value = theme.id
  document.getElementById('editThemeName').value = theme.name
  openModal('editThemeModal')
}

// 更新主题
async function updateTheme() {
  const id = document.getElementById('editThemeId').value
  const name = document.getElementById('editThemeName').value.trim()

  if (!name) {
    showToast('主题名称不能为空', 'error')
    return
  }

  const theme = portfolioData.themes.find(t => t.id === id)
  if (theme) {
    theme.name = name
    renderThemeList()
    // 如果当前选中的就是这个主题，更新标题
    if (currentTheme && currentTheme.id === id) {
      document.getElementById('currentThemeName').textContent = name
    }
    await saveConfig()
    closeModal('editThemeModal')
    showToast('主题已更新', 'success')
  }
}

// 删除当前编辑的主题
async function deleteCurrentTheme() {
  const id = document.getElementById('editThemeId').value

  if (!confirm('确定要删除这个主题吗？这将删除该主题下的所有系列和照片！')) return

  const index = portfolioData.themes.findIndex(t => t.id === id)
  if (index === -1) return

  const theme = portfolioData.themes[index]

  // 检查是否有照片需要删除
  let photosToDelete = []
  theme.series.forEach(s => {
    photosToDelete.push(...s.photos)
  })

  if (photosToDelete.length > 0) {
    if (!confirm(`该主题包含 ${photosToDelete.length} 张照片，确定要全部删除吗？`)) return

    try {
      const response = await fetch(`${CONFIG.apiUrl}/photos/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileNames: photosToDelete })
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error)
    } catch (error) {
      console.error('删除照片失败:', error)
      if (!confirm('照片删除失败，是否强行删除主题配置？')) return
    }
  }

  portfolioData.themes.splice(index, 1)

  if (currentTheme && currentTheme.id === id) {
    currentTheme = null
    document.getElementById('currentThemeName').textContent = '选择一个主题'
    document.getElementById('seriesContainer').innerHTML = '<div class="empty-state"><div class="empty-state-icon">📁</div><p>请从左侧选择一个主题</p></div>'
    document.getElementById('addSeriesBtn').style.display = 'none'
  }

  renderThemeList()
  updateStats()
  await saveConfig()
  closeModal('editThemeModal')
  showToast('主题已删除', 'success')
}

// 打开编辑系列模态框
function openEditSeriesModal(index) {
  currentEditSeriesIndex = index
  const series = currentTheme.series[index]

  document.getElementById('editSeriesId').value = series.id
  document.getElementById('editSeriesTitle').value = series.title
  document.getElementById('editSeriesLikes').value = series.likes
  document.getElementById('editSeriesBannerDescription').value = series.bannerDescription || ''
  document.getElementById('editSeriesDescription').value = series.description || ''
  document.getElementById('editSeriesSuitableFor').value = listToTextarea(series.suitableFor)
  document.getElementById('editSeriesScenes').value = listToTextarea(series.scenes)
  document.getElementById('editSeriesTags').value = listToTextarea(series.tags)
  document.getElementById('editSeriesRelatedPackageIds').value = listToTextarea(series.relatedPackageIds)
  document.getElementById('editSeriesRelatedPhotographerIds').value = listToTextarea(series.relatedPhotographerIds)
  openModal('editSeriesModal')
}

// 更新系列
async function updateSeries() {
  if (!currentTheme || currentEditSeriesIndex === -1) return

  const title = document.getElementById('editSeriesTitle').value.trim()
  const likes = parseInt(document.getElementById('editSeriesLikes').value) || 0
  const bannerDescription = document.getElementById('editSeriesBannerDescription').value.trim()
  const description = document.getElementById('editSeriesDescription').value.trim()
  const suitableFor = document.getElementById('editSeriesSuitableFor').value
  const scenes = document.getElementById('editSeriesScenes').value
  const tags = document.getElementById('editSeriesTags').value
  const relatedPackageIds = document.getElementById('editSeriesRelatedPackageIds').value
  const relatedPhotographerIds = document.getElementById('editSeriesRelatedPhotographerIds').value

  if (!title) {
    showToast('标题不能为空', 'error')
    return
  }

  const series = currentTheme.series[currentEditSeriesIndex]
  series.title = title
  series.likes = likes
  setOptionalText(series, 'bannerDescription', bannerDescription)
  setOptionalText(series, 'description', description)
  setOptionalList(series, 'suitableFor', suitableFor)
  setOptionalList(series, 'scenes', scenes)
  setOptionalList(series, 'tags', tags)
  setOptionalList(series, 'relatedPackageIds', relatedPackageIds)
  setOptionalList(series, 'relatedPhotographerIds', relatedPhotographerIds)

  renderSeriesList()
  await saveConfig()
  closeModal('editSeriesModal')
  showToast('系列已更新', 'success')
}

function openAddThemeModal() {
  document.getElementById('themeId').value = ''
  document.getElementById('themeName').value = ''
  openModal('addThemeModal')
}

// 添加主题
function addTheme() {
  const id = document.getElementById('themeId').value.trim()
  const name = document.getElementById('themeName').value.trim()

  if (!id || !name) {
    showToast('请填写完整信息', 'error')
    return
  }

  // 检查ID是否重复
  if (portfolioData.themes.find(t => t.id === id)) {
    showToast('主题ID已存在', 'error')
    return
  }

  portfolioData.themes.push({
    id,
    name,
    series: []
  })

  renderThemeList()
  updateStats()
  saveConfig()
  closeModal('addThemeModal')
  showToast('主题添加成功', 'success')
}

// 打开添加系列模态框
function openAddSeriesModal() {
  if (!currentTheme) {
    showToast('请先选择一个主题', 'error')
    return
  }

  document.getElementById('seriesId').value = ''
  document.getElementById('seriesTitle').value = ''
  document.getElementById('seriesLikes').value = '100'
  document.getElementById('seriesBannerDescription').value = ''
  document.getElementById('seriesDescription').value = ''
  document.getElementById('seriesSuitableFor').value = ''
  document.getElementById('seriesScenes').value = ''
  document.getElementById('seriesTags').value = ''
  document.getElementById('seriesRelatedPackageIds').value = ''
  document.getElementById('seriesRelatedPhotographerIds').value = ''
  openModal('addSeriesModal')
}

// 添加系列
function addSeries() {
  if (!currentTheme) return

  const id = document.getElementById('seriesId').value.trim()
  const title = document.getElementById('seriesTitle').value.trim()
  const likes = parseInt(document.getElementById('seriesLikes').value) || 100
  const bannerDescription = document.getElementById('seriesBannerDescription').value.trim()
  const description = document.getElementById('seriesDescription').value.trim()
  const suitableFor = document.getElementById('seriesSuitableFor').value
  const scenes = document.getElementById('seriesScenes').value
  const tags = document.getElementById('seriesTags').value
  const relatedPackageIds = document.getElementById('seriesRelatedPackageIds').value
  const relatedPhotographerIds = document.getElementById('seriesRelatedPhotographerIds').value

  if (!id || !title) {
    showToast('请填写完整信息', 'error')
    return
  }

  // 检查ID是否重复
  if (currentTheme.series.find(s => s.id === id)) {
    showToast('系列ID已存在', 'error')
    return
  }

  const nextSeries = {
    id,
    title,
    likes,
    photos: []
  }

  setOptionalText(nextSeries, 'bannerDescription', bannerDescription)
  setOptionalText(nextSeries, 'description', description)
  setOptionalList(nextSeries, 'suitableFor', suitableFor)
  setOptionalList(nextSeries, 'scenes', scenes)
  setOptionalList(nextSeries, 'tags', tags)
  setOptionalList(nextSeries, 'relatedPackageIds', relatedPackageIds)
  setOptionalList(nextSeries, 'relatedPhotographerIds', relatedPhotographerIds)

  currentTheme.series.push(nextSeries)

  renderSeriesList()
  updateStats()
  saveConfig()
  closeModal('addSeriesModal')
  showToast('系列添加成功', 'success')
}

// 删除系列
async function deleteSeries(seriesIndex) {
  if (!confirm('确定要删除这个系列吗？这将同时删除 COS 上的所有照片！')) return

  const series = currentTheme.series[seriesIndex]

  // 删除 COS 上的照片
  if (series.photos.length > 0) {
    try {
      const response = await fetch(`${CONFIG.apiUrl}/photos/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileNames: series.photos })
      })

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error)
      }

      console.log('✅ COS 照片已删除')
    } catch (error) {
      console.error('❌ 删除 COS 照片失败:', error)
      if (!confirm('删除 COS 照片失败，是否继续删除系列？')) {
        return
      }
    }
  }

  currentTheme.series.splice(seriesIndex, 1)
  renderSeriesList()
  updateStats()
  await saveConfig()
  showToast('系列已删除', 'success')
}

// 打开上传照片模态框
function openUploadModal(seriesIndex) {
  currentSeries = currentTheme.series[seriesIndex]
  resetUploadSelection()
  openModal('uploadPhotoModal')
}

// 处理文件选择
function handleFileSelect(event) {
  const files = Array.from(event.target.files)
  addFilesToPreview(files)
  event.target.value = ''
}

// 添加文件到预览
function addFilesToPreview(files) {
  files.forEach(file => {
    if (!file.type.startsWith('image/')) {
      showToast('只能上传图片文件', 'error')
      return
    }

    selectedFiles.push({
      id: nextSelectedFileId++,
      file,
      previewUrl: URL.createObjectURL(file)
    })
  })

  renderUploadPreview()
}

// 移除文件
function removeFile(fileId) {
  const target = selectedFiles.find(item => item.id === fileId)
  if (target?.previewUrl) {
    URL.revokeObjectURL(target.previewUrl)
  }

  selectedFiles = selectedFiles.filter(item => item.id !== fileId)
  renderUploadPreview()
}

// 上传照片
async function uploadPhotos() {
  if (!currentSeries || selectedFiles.length === 0) return

  const uploadBtn = document.getElementById('uploadBtn')
  uploadBtn.disabled = true
  uploadBtn.textContent = '提交中...'

  try {
    const formData = new FormData()
    formData.append('themeId', currentTheme.id)
    formData.append('seriesId', currentSeries.id)

    selectedFiles.forEach(item => {
      formData.append('photos', item.file)
    })

    closeModal('uploadPhotoModal')
    showToast('正在提交后台上传任务...', 'info')

    const response = await fetch(`${CONFIG.apiUrl}/upload`, {
      method: 'POST',
      body: formData
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error)
    }

    if (result.task) {
      uploadTasks = [result.task, ...uploadTasks.filter(task => task.id !== result.task.id)]
      renderUploadTasks()
      updateUploadPolling()
      await syncUploadTasks({ silent: true })
    }

    showToast('已加入后台上传队列', 'success')
  } catch (error) {
    console.error('❌ 上传失败:', error)
    showToast('上传失败: ' + error.message, 'error')
  } finally {
    uploadBtn.disabled = false
    uploadBtn.textContent = '上传'
  }
}

// 删除照片
async function deletePhoto(seriesIndex, photoIndex) {
  if (!confirm('确定要删除这张照片吗？')) return

  const series = currentTheme.series[seriesIndex]
  const photoName = series.photos[photoIndex]

  try {
    // 从 COS 删除照片
    const response = await fetch(`${CONFIG.apiUrl}/photo/${photoName}`, {
      method: 'DELETE'
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error)
    }

    console.log('✅ COS 照片已删除')
  } catch (error) {
    console.error('❌ 删除 COS 照片失败:', error)
    if (!confirm('删除 COS 照片失败，是否继续删除配置？')) {
      return
    }
  }

  series.photos.splice(photoIndex, 1)

  renderSeriesList()
  updateStats()
  await saveConfig()
  showToast('照片已删除', 'success')
}

// 设置拖拽上传
function setupDragAndDrop() {
  const uploadArea = document.getElementById('uploadArea')

  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault()
    uploadArea.classList.add('dragover')
  })

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover')
  })

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault()
    uploadArea.classList.remove('dragover')
    const files = Array.from(e.dataTransfer.files)
    addFilesToPreview(files)
  })
}

// 模态框操作
function openModal(modalId) {
  document.getElementById(modalId).classList.add('active')
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active')
  if (modalId === 'uploadPhotoModal') {
    resetUploadSelection()
  }
  if (modalId === 'profileModal') {
    selectedAvatar = null
    const fileInput = document.getElementById('file-profile-avatar')
    const uploadBtn = document.getElementById('btn-upload-profile-avatar')
    if (fileInput) fileInput.value = ''
    if (uploadBtn) uploadBtn.style.display = 'none'
  }
}

// Toast 提示
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast')
  const toastMessage = document.getElementById('toastMessage')

  toastMessage.textContent = message
  toast.className = `toast ${type} show`

  setTimeout(() => {
    toast.classList.remove('show')
  }, 3000)
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', init)

// 刷新数据
async function refreshData() {
  console.log('🔄 刷新数据...')
  await reloadPortfolioData({ showLoadingToast: true, showSuccessToast: true })
  await syncUploadTasks({ silent: true })
}

function ensureHomeBannerConfig() {
  if (!portfolioData.homeBanner) {
    portfolioData.homeBanner = { ...DEFAULT_HOME_BANNER }
  } else {
    portfolioData.homeBanner = {
      ...DEFAULT_HOME_BANNER,
      ...portfolioData.homeBanner
    }
  }

  return portfolioData.homeBanner
}

function openHomeBannerModal() {
  const banner = ensureHomeBannerConfig()

  document.getElementById('homeBannerLogoText').value = banner.logoText || ''
  document.getElementById('homeBannerTagText').value = banner.tagText || ''
  document.getElementById('homeBannerDescription').value = banner.description || ''

  openModal('homeBannerModal')
}

async function saveHomeBanner() {
  const banner = ensureHomeBannerConfig()
  banner.logoText = document.getElementById('homeBannerLogoText').value.trim()
  banner.tagText = document.getElementById('homeBannerTagText').value.trim()
  banner.description = document.getElementById('homeBannerDescription').value.trim()

  if (!banner.logoText || !banner.tagText || !banner.description) {
    showToast('请填写完整的首页轮播文案', 'error')
    return
  }

  const success = await saveConfig()
  if (success) {
    closeModal('homeBannerModal')
    showToast('首页轮播文案已更新', 'success')
  }
}

function setSelectValue(id, value) {
  const element = document.getElementById(id)
  if (!element) return

  const hasOption = Array.from(element.options || []).some(option => option.value === value)
  element.value = hasOption ? value : (element.options?.[0]?.value || '')
}

function openThemeSettingsModal() {
  const config = ensureV11Config()
  const theme = fillMissingObject(config.theme, DEFAULT_V11_CONFIG.theme)

  document.getElementById('themeEnabled').checked = theme.enabled !== false
  setSelectValue('themePreset', theme.preset || 'minimal')
  document.getElementById('themeBrandName').value = theme.brandName || ''
  document.getElementById('themePrimaryColor').value = theme.primaryColor || DEFAULT_V11_CONFIG.theme.primaryColor
  document.getElementById('themeBackgroundColor').value = theme.backgroundColor || DEFAULT_V11_CONFIG.theme.backgroundColor
  document.getElementById('themeTextColor').value = theme.textColor || DEFAULT_V11_CONFIG.theme.textColor
  setSelectValue('themeCardStyle', theme.cardStyle || 'soft')
  setSelectValue('themeButtonStyle', theme.buttonStyle || 'rounded')
  setSelectValue('themeImageRadius', theme.imageRadius || 'medium')
  setSelectValue('themeLayoutDensity', theme.layoutDensity || 'comfortable')
  setSelectValue('themeHomeLayout', theme.homeLayout || 'banner-first')
  document.getElementById('themeShowDecorations').checked = theme.showDecorations !== false

  openModal('themeSettingsModal')
}

function applySelectedThemePreset() {
  const presetKey = document.getElementById('themePreset').value
  const preset = THEME_PRESETS[presetKey]
  if (!preset) return

  document.getElementById('themePrimaryColor').value = preset.primaryColor
  document.getElementById('themeBackgroundColor').value = preset.backgroundColor
  document.getElementById('themeTextColor').value = preset.textColor
  setSelectValue('themeCardStyle', preset.cardStyle)
  setSelectValue('themeButtonStyle', preset.buttonStyle)
  setSelectValue('themeImageRadius', preset.imageRadius)
  setSelectValue('themeLayoutDensity', preset.layoutDensity)
  setSelectValue('themeHomeLayout', preset.homeLayout)
  document.getElementById('themeShowDecorations').checked = preset.showDecorations !== false
}

async function saveThemeSettings() {
  ensureV11Config()

  const brandName = document.getElementById('themeBrandName').value.trim()

  portfolioData.theme = {
    ...(portfolioData.theme || {}),
    enabled: document.getElementById('themeEnabled').checked,
    preset: document.getElementById('themePreset').value,
    brandName,
    primaryColor: document.getElementById('themePrimaryColor').value,
    backgroundColor: document.getElementById('themeBackgroundColor').value,
    textColor: document.getElementById('themeTextColor').value,
    cardStyle: document.getElementById('themeCardStyle').value,
    buttonStyle: document.getElementById('themeButtonStyle').value,
    imageRadius: document.getElementById('themeImageRadius').value,
    layoutDensity: document.getElementById('themeLayoutDensity').value,
    homeLayout: document.getElementById('themeHomeLayout').value,
    showDecorations: document.getElementById('themeShowDecorations').checked
  }
  portfolioData.modules = {
    ...(portfolioData.modules || {}),
    theme: document.getElementById('themeEnabled').checked
  }

  if (brandName && portfolioData.homeBanner) {
    portfolioData.homeBanner.logoText = brandName
  }

  const success = await saveConfig()
  if (success) {
    closeModal('themeSettingsModal')
    showToast('主题设置已更新', 'success')
  }
}

function ensureBookingConfig() {
  const currentBooking = portfolioData.booking || {}
  const styleOptions = Array.isArray(currentBooking.styleOptions)
    ? currentBooking.styleOptions
    : FALLBACK_BOOKING_CONFIG.styleOptions

  portfolioData.booking = {
    ...currentBooking,
    styleOptions: normalizeBookingStyleOptions(styleOptions)
  }

  return portfolioData.booking
}

function normalizeBookingStyleOptions(styleOptions) {
  const normalized = (styleOptions || [])
    .map(item => String(item).trim())
    .filter(item => item && item !== '其他')

  return Array.from(new Set(normalized))
}

function openBookingSettingsModal() {
  const booking = ensureBookingConfig()
  document.getElementById('bookingStyleOptions').value = booking.styleOptions.join('\n')
  openModal('bookingSettingsModal')
}

async function saveBookingSettings() {
  const rawOptions = document.getElementById('bookingStyleOptions').value
    .split(/\r?\n/)
  const styleOptions = normalizeBookingStyleOptions(rawOptions)

  if (styleOptions.length === 0) {
    showToast('请至少填写一个预约风格', 'error')
    return
  }

  portfolioData.booking = {
    ...(portfolioData.booking || {}),
    styleOptions
  }

  const success = await saveConfig()
  if (success) {
    closeModal('bookingSettingsModal')
    showToast('预约设置已更新', 'success')
  }
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value))
}

function fillMissingObject(target, defaults) {
  const output = { ...(target || {}) }

  Object.entries(defaults).forEach(([key, value]) => {
    if (output[key] === undefined) {
      output[key] = deepClone(value)
    } else if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      output[key] &&
      typeof output[key] === 'object' &&
      !Array.isArray(output[key])
    ) {
      output[key] = fillMissingObject(output[key], value)
    }
  })

  return output
}

function ensureV11Config() {
  if (!portfolioData || typeof portfolioData !== 'object') {
    portfolioData = { themes: [] }
  }

  if (!Array.isArray(portfolioData.themes)) {
    portfolioData.themes = []
  }

  portfolioData.configVersion = portfolioData.configVersion || DEFAULT_V11_CONFIG.configVersion
  portfolioData.modules = fillMissingObject(portfolioData.modules, DEFAULT_V11_CONFIG.modules)
  portfolioData.theme = fillMissingObject(portfolioData.theme, DEFAULT_V11_CONFIG.theme)
  portfolioData.packages = Array.isArray(portfolioData.packages)
    ? portfolioData.packages
    : deepClone(DEFAULT_V11_CONFIG.packages)
  portfolioData.schedule = fillMissingObject(portfolioData.schedule, DEFAULT_V11_CONFIG.schedule)
  portfolioData.testimonials = Array.isArray(portfolioData.testimonials)
    ? portfolioData.testimonials
    : deepClone(DEFAULT_V11_CONFIG.testimonials)
  portfolioData.consultButton = fillMissingObject(portfolioData.consultButton, DEFAULT_V11_CONFIG.consultButton)
  portfolioData.consultation = fillMissingObject(portfolioData.consultation, DEFAULT_V11_CONFIG.consultation)
  portfolioData.serviceFlow = fillMissingObject(portfolioData.serviceFlow, DEFAULT_V11_CONFIG.serviceFlow)
  portfolioData.faq = fillMissingObject(portfolioData.faq, DEFAULT_V11_CONFIG.faq)
  portfolioData.photographers = Array.isArray(portfolioData.photographers)
    ? portfolioData.photographers
    : deepClone(DEFAULT_V11_CONFIG.photographers)
  portfolioData.stores = Array.isArray(portfolioData.stores)
    ? portfolioData.stores
    : deepClone(DEFAULT_V11_CONFIG.stores)

  return portfolioData
}

function setJsonTextarea(id, value) {
  document.getElementById(id).value = JSON.stringify(value, null, 2)
}

function parseJsonTextarea(id, label) {
  const raw = document.getElementById(id).value.trim()

  try {
    return JSON.parse(raw)
  } catch (error) {
    throw new Error(`${label} 不是合法 JSON：${error.message}`)
  }
}

function requireArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} 必须是 JSON 数组`)
  }
}

function renderContentModuleStructuredEditors(config) {
  renderPackageEditor(config.packages || [])
  renderScheduleEditor(config.schedule || {})
  renderTestimonialEditor(config.testimonials || [])
  renderConsultButtonEditor(config.consultButton || {})
  renderServiceFlowEditor(config.serviceFlow || {})
  renderFaqEditor(config.faq || {})
}

function renderPackageEditor(packages) {
  const container = document.getElementById('packageEditorList')
  if (!container) return

  if (!packages.length) {
    container.innerHTML = '<div style="color: #78716c; font-size: 13px;">暂无套餐，点击“新增套餐”。</div>'
    return
  }

  container.innerHTML = packages.map((item, index) => `
    <div data-index="${index}" style="background: #fff; border: 1px solid #e7e5e4; border-radius: 8px; padding: 14px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 12px;">
        <strong>${escapeHtml(item.name || item.id || `套餐 ${index + 1}`)}</strong>
        <button class="btn btn-danger" type="button" onclick="removePackageEditorItem(${index})">删除</button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;">
        ${editorInput('id', '套餐 ID', item.id, 'portrait-basic')}
        ${editorInput('name', '套餐名称', item.name, '个人写真基础套餐')}
        ${editorInput('priceText', '价格文案', item.priceText, '¥699 起')}
        ${editorInput('subtitle', '副标题', item.subtitle, '适合头像、生日纪念')}
        ${editorInput('duration', '拍摄时长', item.duration, '约 2 小时')}
        ${editorInput('retouchCount', '精修数量', item.retouchCount, '6 张精修')}
        ${editorInput('originalPhotos', '底片说明', item.originalPhotos, '底片精选交付')}
        ${editorInput('makeupText', '妆造说明', item.makeupText, '含基础妆造')}
        ${editorInput('sort', '排序', item.sort ?? index + 1, '1', 'number')}
        <label style="display: flex; align-items: center; gap: 8px; margin-top: 24px;">
          <input type="checkbox" data-field="enabled" ${item.enabled !== false ? 'checked' : ''}> 启用
        </label>
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" data-field="isRecommended" ${item.isRecommended ? 'checked' : ''}> 首页推荐
        </label>
      </div>
      ${editorTextarea('includes', '包含服务（一行一个）', item.includes)}
      ${editorTextarea('suitableFor', '适合人群（一行一个）', item.suitableFor)}
      ${editorTextarea('relatedSeriesIds', '关联作品系列 ID（一行一个）', item.relatedSeriesIds)}
      ${editorTextarea('relatedPhotographerIds', '关联摄影师 ID（一行一个）', item.relatedPhotographerIds)}
    </div>
  `).join('')
}

function renderScheduleEditor(schedule) {
  setCheckedValue('scheduleEnabled', schedule.enabled !== false)
  setInputValue('scheduleTitle', schedule.title || '')
  setInputValue('scheduleAvailableText', schedule.availableText || '')
  setInputValue('scheduleNotice', schedule.notice || '')
  setInputValue('scheduleRestDays', listToTextarea(schedule.restDays))
  setInputValue('scheduleBusyDates', listToTextarea(schedule.busyDates))
  setInputValue('scheduleSpecialNotes', listToTextarea(schedule.specialNotes))
}

function renderTestimonialEditor(testimonials) {
  const container = document.getElementById('testimonialEditorList')
  if (!container) return

  if (!testimonials.length) {
    container.innerHTML = '<div style="color: #78716c; font-size: 13px;">暂无评价，点击“新增评价”。</div>'
    return
  }

  container.innerHTML = testimonials.map((item, index) => `
    <div data-index="${index}" style="background: #fff; border: 1px solid #e7e5e4; border-radius: 8px; padding: 14px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 12px;">
        <strong>${escapeHtml(item.name || item.id || `评价 ${index + 1}`)}</strong>
        <button class="btn btn-danger" type="button" onclick="removeTestimonialEditorItem(${index})">删除</button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;">
        ${editorInput('id', '评价 ID', item.id, 'review-001')}
        ${editorInput('name', '客户称呼', item.name, '示例客户')}
        ${editorInput('shootType', '拍摄类型', item.shootType, '个人写真')}
        ${editorInput('dateText', '时间文案', item.dateText, '2026 年 6 月')}
        ${editorInput('relatedSeriesId', '关联作品系列 ID', item.relatedSeriesId, 'series-sample-sample-series')}
        ${editorInput('relatedPackageId', '关联套餐 ID', item.relatedPackageId, 'portrait-basic')}
        ${editorInput('imageUrl', '评价图片 URL / COS key', item.imageUrl, '')}
        ${editorInput('sort', '排序', item.sort ?? index + 1, '1', 'number')}
        <label style="display: flex; align-items: center; gap: 8px;">
          <input type="checkbox" data-field="enabled" ${item.enabled !== false ? 'checked' : ''}> 启用
        </label>
      </div>
      ${editorTextarea('content', '评价内容', item.content ? [item.content] : [], 4)}
    </div>
  `).join('')
}

function renderConsultButtonEditor(consultButton) {
  setCheckedValue('consultButtonEnabled', consultButton.enabled !== false)
  setInputValue('consultButtonText', consultButton.text || '')
  setInputValue('consultButtonAction', consultButton.action || 'booking')

  const showOnPages = Array.isArray(consultButton.showOnPages) ? consultButton.showOnPages : []
  document.querySelectorAll('[data-consult-page]').forEach(input => {
    input.checked = showOnPages.includes(input.dataset.consultPage)
  })
}

function renderServiceFlowEditor(serviceFlow) {
  setCheckedValue('serviceFlowEnabled', serviceFlow.enabled !== false)
  const steps = Array.isArray(serviceFlow.steps) ? serviceFlow.steps : []
  const container = document.getElementById('serviceFlowEditorList')
  if (!container) return

  if (!steps.length) {
    container.innerHTML = '<div style="color: #78716c; font-size: 13px;">暂无服务流程，点击“新增步骤”。</div>'
    return
  }

  container.innerHTML = steps.map((item, index) => `
    <div data-index="${index}" style="background: #fff; border: 1px solid #e7e5e4; border-radius: 8px; padding: 14px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 12px;">
        <strong>步骤 ${index + 1}</strong>
        <button class="btn btn-danger" type="button" onclick="removeServiceFlowEditorItem(${index})">删除</button>
      </div>
      ${editorInput('title', '步骤标题', item.title, '咨询沟通')}
      ${editorTextarea('description', '步骤说明', item.description ? [item.description] : [], 3)}
    </div>
  `).join('')
}

function renderFaqEditor(faq) {
  setCheckedValue('faqEnabled', faq.enabled !== false)
  const items = Array.isArray(faq.items) ? faq.items : []
  const container = document.getElementById('faqEditorList')
  if (!container) return

  if (!items.length) {
    container.innerHTML = '<div style="color: #78716c; font-size: 13px;">暂无 FAQ，点击“新增问题”。</div>'
    return
  }

  container.innerHTML = items.map((item, index) => `
    <div data-index="${index}" style="background: #fff; border: 1px solid #e7e5e4; border-radius: 8px; padding: 14px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 12px;">
        <strong>问题 ${index + 1}</strong>
        <button class="btn btn-danger" type="button" onclick="removeFaqEditorItem(${index})">删除</button>
      </div>
      ${editorInput('question', '问题', item.question, '拍摄前需要准备什么？')}
      ${editorTextarea('answer', '回答', item.answer ? [item.answer] : [], 3)}
    </div>
  `).join('')
}

function editorInput(field, label, value = '', placeholder = '', type = 'text') {
  return `
    <label style="display: block;">
      <span style="display: block; font-size: 12px; color: #57534e; margin-bottom: 4px;">${label}</span>
      <input type="${type}" data-field="${field}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}">
    </label>
  `
}

function editorTextarea(field, label, value, rows = 3) {
  return `
    <label style="display: block; margin-top: 12px;">
      <span style="display: block; font-size: 12px; color: #57534e; margin-bottom: 4px;">${label}</span>
      <textarea data-field="${field}" rows="${rows}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">${escapeHtml(listToTextarea(value))}</textarea>
    </label>
  `
}

function setInputValue(id, value) {
  const el = document.getElementById(id)
  if (el) el.value = value
}

function setCheckedValue(id, value) {
  const el = document.getElementById(id)
  if (el) el.checked = Boolean(value)
}

function getFieldValue(card, field) {
  const el = card.querySelector(`[data-field="${field}"]`)
  return el ? String(el.value || '').trim() : ''
}

function getFieldChecked(card, field) {
  const el = card.querySelector(`[data-field="${field}"]`)
  return el ? Boolean(el.checked) : false
}

function readPackageEditor() {
  return Array.from(document.querySelectorAll('#packageEditorList [data-index]')).map((card, index) => {
    const id = getFieldValue(card, 'id')
    const name = getFieldValue(card, 'name')

    if (!id || !name) {
      throw new Error(`第 ${index + 1} 个套餐必须填写 ID 和名称`)
    }

    return {
      id,
      name,
      priceText: getFieldValue(card, 'priceText'),
      subtitle: getFieldValue(card, 'subtitle'),
      duration: getFieldValue(card, 'duration'),
      retouchCount: getFieldValue(card, 'retouchCount'),
      originalPhotos: getFieldValue(card, 'originalPhotos'),
      makeupText: getFieldValue(card, 'makeupText'),
      includes: parseListInput(getFieldValue(card, 'includes')),
      suitableFor: parseListInput(getFieldValue(card, 'suitableFor')),
      relatedSeriesIds: parseListInput(getFieldValue(card, 'relatedSeriesIds')),
      relatedPhotographerIds: parseListInput(getFieldValue(card, 'relatedPhotographerIds')),
      isRecommended: getFieldChecked(card, 'isRecommended'),
      sort: Number(getFieldValue(card, 'sort')) || index + 1,
      enabled: getFieldChecked(card, 'enabled')
    }
  })
}

function readScheduleEditor() {
  return {
    enabled: Boolean(document.getElementById('scheduleEnabled')?.checked),
    title: document.getElementById('scheduleTitle')?.value.trim() || '',
    availableText: document.getElementById('scheduleAvailableText')?.value.trim() || '',
    notice: document.getElementById('scheduleNotice')?.value.trim() || '',
    restDays: parseListInput(document.getElementById('scheduleRestDays')?.value || ''),
    busyDates: parseListInput(document.getElementById('scheduleBusyDates')?.value || ''),
    specialNotes: parseListInput(document.getElementById('scheduleSpecialNotes')?.value || '')
  }
}

function readTestimonialEditor() {
  return Array.from(document.querySelectorAll('#testimonialEditorList [data-index]')).map((card, index) => {
    const id = getFieldValue(card, 'id')
    const name = getFieldValue(card, 'name')
    const content = getFieldValue(card, 'content')

    if (!id || !name || !content) {
      throw new Error(`第 ${index + 1} 条评价必须填写 ID、客户称呼和评价内容`)
    }

    return {
      id,
      name,
      shootType: getFieldValue(card, 'shootType'),
      content,
      imageUrl: getFieldValue(card, 'imageUrl'),
      relatedSeriesId: getFieldValue(card, 'relatedSeriesId'),
      relatedPackageId: getFieldValue(card, 'relatedPackageId'),
      dateText: getFieldValue(card, 'dateText'),
      sort: Number(getFieldValue(card, 'sort')) || index + 1,
      enabled: getFieldChecked(card, 'enabled')
    }
  })
}

function readConsultButtonEditor() {
  return {
    enabled: Boolean(document.getElementById('consultButtonEnabled')?.checked),
    text: document.getElementById('consultButtonText')?.value.trim() || '',
    action: document.getElementById('consultButtonAction')?.value || 'booking',
    showOnPages: Array.from(document.querySelectorAll('[data-consult-page]'))
      .filter(input => input.checked)
      .map(input => input.dataset.consultPage)
  }
}

function readServiceFlowEditor() {
  return {
    enabled: Boolean(document.getElementById('serviceFlowEnabled')?.checked),
    steps: Array.from(document.querySelectorAll('#serviceFlowEditorList [data-index]')).map((card, index) => {
      const title = getFieldValue(card, 'title')
      const description = getFieldValue(card, 'description')

      if (!title || !description) {
        throw new Error(`第 ${index + 1} 个服务流程步骤必须填写标题和说明`)
      }

      return { title, description }
    })
  }
}

function readFaqEditor() {
  return {
    enabled: Boolean(document.getElementById('faqEnabled')?.checked),
    items: Array.from(document.querySelectorAll('#faqEditorList [data-index]')).map((card, index) => {
      const question = getFieldValue(card, 'question')
      const answer = getFieldValue(card, 'answer')

      if (!question || !answer) {
        throw new Error(`第 ${index + 1} 个 FAQ 必须填写问题和回答`)
      }

      return { question, answer }
    })
  }
}

function syncStructuredContentToJson() {
  setJsonTextarea('v11PackagesJson', readPackageEditor())
  setJsonTextarea('v11ScheduleJson', readScheduleEditor())
  setJsonTextarea('v11TestimonialsJson', readTestimonialEditor())
  setJsonTextarea('v11ConsultButtonJson', readConsultButtonEditor())
  setJsonTextarea('v11ServiceFlowJson', readServiceFlowEditor())
  setJsonTextarea('v11FaqJson', readFaqEditor())
}

function addPackageEditorItem() {
  const packages = readPackageEditor()
  packages.push({
    id: `package-${packages.length + 1}`,
    name: '新套餐',
    priceText: '',
    subtitle: '',
    includes: [],
    suitableFor: [],
    relatedSeriesIds: [],
    relatedPhotographerIds: [],
    sort: packages.length + 1,
    enabled: true
  })
  renderPackageEditor(packages)
  setJsonTextarea('v11PackagesJson', packages)
}

function removePackageEditorItem(index) {
  const packages = readPackageEditor()
  packages.splice(index, 1)
  renderPackageEditor(packages)
  setJsonTextarea('v11PackagesJson', packages)
}

function addTestimonialEditorItem() {
  const testimonials = readTestimonialEditor()
  testimonials.push({
    id: `review-${String(testimonials.length + 1).padStart(3, '0')}`,
    name: '新客户',
    shootType: '',
    content: '这里填写客户评价内容。',
    sort: testimonials.length + 1,
    enabled: true
  })
  renderTestimonialEditor(testimonials)
  setJsonTextarea('v11TestimonialsJson', testimonials)
}

function removeTestimonialEditorItem(index) {
  const testimonials = readTestimonialEditor()
  testimonials.splice(index, 1)
  renderTestimonialEditor(testimonials)
  setJsonTextarea('v11TestimonialsJson', testimonials)
}

function addServiceFlowEditorItem() {
  const serviceFlow = readServiceFlowEditor()
  serviceFlow.steps.push({
    title: '新步骤',
    description: '这里填写服务流程说明。'
  })
  renderServiceFlowEditor(serviceFlow)
  setJsonTextarea('v11ServiceFlowJson', serviceFlow)
}

function removeServiceFlowEditorItem(index) {
  const serviceFlow = readServiceFlowEditor()
  serviceFlow.steps.splice(index, 1)
  renderServiceFlowEditor(serviceFlow)
  setJsonTextarea('v11ServiceFlowJson', serviceFlow)
}

function addFaqEditorItem() {
  const faq = readFaqEditor()
  faq.items.push({
    question: '新问题',
    answer: '这里填写回答。'
  })
  renderFaqEditor(faq)
  setJsonTextarea('v11FaqJson', faq)
}

function removeFaqEditorItem(index) {
  const faq = readFaqEditor()
  faq.items.splice(index, 1)
  renderFaqEditor(faq)
  setJsonTextarea('v11FaqJson', faq)
}

function openContentModulesModal() {
  const config = ensureV11Config()

  setJsonTextarea('v11ModulesJson', config.modules)
  setJsonTextarea('v11ThemeJson', config.theme)
  setJsonTextarea('v11PackagesJson', config.packages)
  setJsonTextarea('v11ScheduleJson', config.schedule)
  setJsonTextarea('v11TestimonialsJson', config.testimonials)
  setJsonTextarea('v11ConsultButtonJson', config.consultButton)
  setJsonTextarea('v11ServiceFlowJson', config.serviceFlow)
  setJsonTextarea('v11FaqJson', config.faq)
  setJsonTextarea('v11PhotographersJson', config.photographers)
  setJsonTextarea('v11StoresJson', config.stores)
  renderContentModuleStructuredEditors(config)

  document.getElementById('v11ConsultationTitle').value = config.consultation.title || ''
  document.getElementById('v11ConsultationDescription').value = config.consultation.description || ''
  document.getElementById('v11ConsultationTemplate').value = config.consultation.template || DEFAULT_CONSULTATION_TEMPLATE
  document.getElementById('v11ConsultationPrivacyTip').value = config.consultation.privacyTip || ''

  openModal('contentModulesModal')
}

async function saveContentModules() {
  try {
    syncStructuredContentToJson()

    const modules = parseJsonTextarea('v11ModulesJson', '模块开关')
    const theme = parseJsonTextarea('v11ThemeJson', '主题设置')
    const packages = parseJsonTextarea('v11PackagesJson', '套餐')
    const schedule = parseJsonTextarea('v11ScheduleJson', '档期')
    const testimonials = parseJsonTextarea('v11TestimonialsJson', '客户评价')
    const consultButton = parseJsonTextarea('v11ConsultButtonJson', '固定咨询按钮')
    const serviceFlow = parseJsonTextarea('v11ServiceFlowJson', '服务流程')
    const faq = parseJsonTextarea('v11FaqJson', '常见问题')
    const photographers = parseJsonTextarea('v11PhotographersJson', '摄影师列表')
    const stores = parseJsonTextarea('v11StoresJson', '门店列表')

    requireArray(packages, '套餐 packages')
    requireArray(testimonials, '客户评价 testimonials')
    requireArray(photographers, '摄影师列表 photographers')
    requireArray(stores, '门店列表 stores')

    const consultation = {
      title: document.getElementById('v11ConsultationTitle').value.trim(),
      description: document.getElementById('v11ConsultationDescription').value.trim(),
      template: document.getElementById('v11ConsultationTemplate').value.trim(),
      privacyTip: document.getElementById('v11ConsultationPrivacyTip').value.trim()
    }

    if (!consultation.title || !consultation.description || !consultation.template || !consultation.privacyTip) {
      throw new Error('请填写完整的咨询模板设置')
    }

    portfolioData.configVersion = '1.1.0'
    portfolioData.modules = modules
    portfolioData.theme = theme
    portfolioData.packages = packages
    portfolioData.schedule = schedule
    portfolioData.testimonials = testimonials
    portfolioData.consultButton = consultButton
    portfolioData.consultation = consultation
    portfolioData.serviceFlow = serviceFlow
    portfolioData.faq = faq
    portfolioData.photographers = photographers
    portfolioData.stores = stores

    const success = await saveConfig()
    if (success) {
      closeModal('contentModulesModal')
      showToast('内容模块已更新并同步', 'success')
    }
  } catch (error) {
    showToast(error.message, 'error')
  }
}

// 打开编辑个人资料模态框
function openProfileModal() {
  if (!portfolioData.photographer) {
    // 初始化默认数据 (如果配置文件中还没有)
    portfolioData.photographer = {
      name: '',
      title: '',
      location: '',
      avatar: '',
      bio: '',
      stats: [
        { value: '', label: '经验' },
        { value: '', label: '客片' },
        { value: '', label: '好评' }
      ],
      skills: [],
      contact: { wechat: '', email: '' },
      studio: { name: '', address: '', latitude: null, longitude: null }
    }
  }

  const p = portfolioData.photographer
  if (!p.studio) {
    p.studio = { name: '', address: '', latitude: null, longitude: null }
  }
  document.getElementById('profileName').value = p.name || ''
  document.getElementById('profileTitle').value = p.title || ''
  document.getElementById('profileLocation').value = p.location || ''
  document.getElementById('profileAvatar').value = p.avatar || ''
  renderProfileAvatarPreview(p.avatar)
  document.getElementById('profileBio').value = p.bio || ''
  document.getElementById('profileSkills').value = (p.skills || []).join('，')
  document.getElementById('profileWechat').value = p.contact?.wechat || ''
  document.getElementById('profileEmail').value = p.contact?.email || ''
  document.getElementById('profileStudioName').value = p.studio?.name || ''
  document.getElementById('profileStudioAddress').value = p.studio?.address || ''
  document.getElementById('profileStudioLatitude').value = p.studio?.latitude ?? ''
  document.getElementById('profileStudioLongitude').value = p.studio?.longitude ?? ''

  openModal('profileModal')
}

function renderProfileAvatarPreview(avatarPathOrUrl) {
  const preview = document.getElementById('profileAvatarPreview')
  const empty = document.getElementById('profileAvatarEmpty')
  const value = String(avatarPathOrUrl || '')
  const src = value.startsWith('http') || value.startsWith('data:')
    ? value
    : getCosAssetUrl(value)

  if (!preview || !empty) return

  if (!src) {
    preview.style.display = 'none'
    preview.src = ''
    empty.style.display = 'flex'
    return
  }

  preview.onload = () => {
    preview.style.display = 'block'
    empty.style.display = 'none'
  }
  preview.onerror = () => {
    preview.style.display = 'none'
    empty.style.display = 'flex'
  }
  preview.src = src.startsWith('data:')
    ? src
    : `${src}${src.includes('?') ? '&' : '?'}t=${Date.now()}`
}

// 保存个人资料
async function saveProfile() {
  const p = portfolioData.photographer
  p.name = document.getElementById('profileName').value.trim()
  p.title = document.getElementById('profileTitle').value.trim()
  p.location = document.getElementById('profileLocation').value.trim()
  p.avatar = document.getElementById('profileAvatar').value.trim()
  p.bio = document.getElementById('profileBio').value.trim()

  // 处理技能标签
  const skillsStr = document.getElementById('profileSkills').value.trim()
  if (skillsStr) {
    // 支持中英文逗号
    p.skills = skillsStr.split(/[,，]/).map(s => s.trim()).filter(s => s)
  } else {
    p.skills = []
  }

  if (!p.contact) p.contact = {}
  p.contact.wechat = document.getElementById('profileWechat').value.trim()
  p.contact.email = document.getElementById('profileEmail').value.trim()

  const studioName = document.getElementById('profileStudioName').value.trim()
  const studioAddress = document.getElementById('profileStudioAddress').value.trim()
  const latitudeInput = document.getElementById('profileStudioLatitude').value.trim()
  const longitudeInput = document.getElementById('profileStudioLongitude').value.trim()
  const hasCoordinateInput = latitudeInput || longitudeInput

  let latitude = null
  let longitude = null

  if (hasCoordinateInput) {
    if (!latitudeInput || !longitudeInput) {
      showToast('请同时填写纬度和经度', 'error')
      return
    }

    latitude = Number(latitudeInput)
    longitude = Number(longitudeInput)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      showToast('经纬度必须是有效数字', 'error')
      return
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      showToast('经纬度超出有效范围', 'error')
      return
    }
  }

  p.studio = {
    name: studioName,
    address: studioAddress,
    latitude,
    longitude
  }

  // 简单验证
  if (!p.name) {
    showToast('姓名不能为空', 'error')
    return
  }

  const success = await saveConfig()
  if (success) {
    closeModal('profileModal')
    showToast('个人资料已更新', 'success')
  }
}

// 打开设置模态框
async function openSettingsModal() {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/settings`)
    const result = await response.json()

    if (result.success) {
      document.getElementById('settingSecretId').value = result.config.SecretId
      document.getElementById('settingSecretKey').value = result.config.SecretKey
      document.getElementById('settingBucket').value = result.config.Bucket
      document.getElementById('settingRegion').value = result.config.Region
      document.getElementById('settingAppID').value = result.config.AppID

      // 重置日志区域
      const logDiv = document.getElementById('syncLogs')
      logDiv.style.display = 'none'
      logDiv.innerHTML = ''

      // 重置 Tab
      switchSettingsTab('cos')

      // 初始化 Banner 预览
      const bannerBase = `${CONFIG.cos.BaseUrl}/banner`
      const ts = Date.now() // 添加时间戳防止缓存

      const mainImg = document.getElementById('preview-main-banner')
      mainImg.src = `${bannerBase}/main-banner.jpg?t=${ts}`
      mainImg.style.display = 'block'
      mainImg.onerror = () => {
        mainImg.style.display = 'none'
        document.getElementById('no-main-banner').style.display = 'flex'
      }
      mainImg.onload = () => {
        mainImg.style.display = 'block'
        document.getElementById('no-main-banner').style.display = 'none'
      }

      const bookingImg = document.getElementById('preview-booking-banner')
      bookingImg.src = `${bannerBase}/booking-banner.jpg?t=${ts}`
      bookingImg.style.display = 'block'
      bookingImg.onerror = () => {
        bookingImg.style.display = 'none'
        document.getElementById('no-booking-banner').style.display = 'flex'
      }
      bookingImg.onload = () => {
        bookingImg.style.display = 'block'
        document.getElementById('no-booking-banner').style.display = 'none'
      }

      const aboutImg = document.getElementById('preview-about-banner')
      aboutImg.src = `${bannerBase}/about-banner.jpg?t=${ts}`
      aboutImg.style.display = 'block'
      aboutImg.onerror = () => {
        aboutImg.style.display = 'none'
        document.getElementById('no-about-banner').style.display = 'flex'
      }
      aboutImg.onload = () => {
        aboutImg.style.display = 'block'
        document.getElementById('no-about-banner').style.display = 'none'
      }

      openModal('settingsModal')
    } else {
      showToast('获取设置失败', 'error')
    }
  } catch (error) {
    console.error('获取设置错误:', error)
    showToast('获取设置错误', 'error')
  }
}

// 保存并同步设置
async function saveAndSyncSettings() {
  const btn = document.getElementById('saveSettingsBtn')
  const logDiv = document.getElementById('syncLogs')

  btn.disabled = true
  btn.textContent = '正在同步...'
  logDiv.style.display = 'block'
  logDiv.innerHTML = '<div style="color: #61afef">> 开始提交配置...</div>'

  const settings = {
    SecretId: document.getElementById('settingSecretId').value.trim(),
    SecretKey: document.getElementById('settingSecretKey').value.trim(),
    Bucket: document.getElementById('settingBucket').value.trim(),
    Region: document.getElementById('settingRegion').value.trim(),
    AppID: document.getElementById('settingAppID').value.trim()
  }

  try {
    const response = await fetch(`${CONFIG.apiUrl}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    })

    const result = await response.json()

    // 显示详细日志
    if (result.logs && result.logs.length > 0) {
      logDiv.innerHTML = result.logs.map(log => {
        let color = '#a6accd'
        if (log.includes('[ERROR]')) color = '#e06c75'
        if (log.includes('[WARN]')) color = '#e5c07b'
        if (log.includes('✅')) color = '#98c379'
        return `<div style="color: ${color}; margin-bottom: 4px;">${log}</div>`
      }).join('')
    }

    // 滚动到底部
    logDiv.scrollTop = logDiv.scrollHeight

    if (result.success) {
      showToast('配置已保存并同步', 'success')
      // 延迟关闭，让用户看完日志
      setTimeout(() => {
        // 重新加载配置以更新前端的 COS BaseURL
        // 注意：目前前端 BaseUrl 是硬编码在 app.js 开头的，
        // 理想情况下应该从 API 获取。
        // 这里我们简单刷新一下页面或重新初始化
        if (confirm('配置已更新，是否刷新页面以应用新配置？')) {
          location.reload()
        } else {
           closeModal('settingsModal')
        }
      }, 1500)
    } else {
      showToast('同步失败: ' + result.error, 'error')
    }

  } catch (error) {
    console.error('保存设置失败:', error)
    logDiv.innerHTML += `<div style="color: #e06c75">[ERROR] 网络请求失败: ${error.message}</div>`
    showToast('网络请求失败', 'error')
  } finally {
    btn.disabled = false
    btn.textContent = '💾 保存并同步'
  }
}

// 从 COS 同步照片
async function syncFromCos() {
  if (!confirm('确定要扫描 COS 并同步照片吗？这可能会花费一些时间。')) return

  const btn = document.getElementById('syncCosBtn')
  const logDiv = document.getElementById('syncLogs')

  btn.disabled = true
  btn.textContent = '正在扫描...'
  logDiv.style.display = 'block'
  logDiv.innerHTML = '<div style="color: #61afef">> 开始扫描 COS 文件...</div>'

  try {
    const response = await fetch(`${CONFIG.apiUrl}/sync/cos`, {
      method: 'POST'
    })

    const result = await response.json()

    // 显示日志
    if (result.logs && result.logs.length > 0) {
      logDiv.innerHTML = result.logs.map(log => {
        let color = '#a6accd'
        if (log.includes('[ERROR]')) color = '#e06c75'
        if (log.includes('[WARN]')) color = '#e5c07b'
        if (log.includes('✅')) color = '#98c379'
        return `<div style="color: ${color}; margin-bottom: 4px;">${log}</div>`
      }).join('')
    }

    // 滚动到底部
    logDiv.scrollTop = logDiv.scrollHeight

    if (result.success) {
      if (result.updatedCount > 0) {
        showToast(`同步完成，恢复了 ${result.updatedCount} 张照片`, 'success')
        setTimeout(() => {
          if (confirm(`同步成功！恢复了 ${result.updatedCount} 张照片。是否刷新页面查看？`)) {
            location.reload()
          }
        }, 1000)
      } else {
        showToast('同步完成，未发现新照片', 'info')
      }
    } else {
      showToast('同步失败: ' + result.error, 'error')
    }

  } catch (error) {
    console.error('同步失败:', error)
    logDiv.innerHTML += `<div style="color: #e06c75">[ERROR] 网络请求失败: ${error.message}</div>`
    showToast('网络请求失败', 'error')
  } finally {
    btn.disabled = false
    btn.textContent = '开始扫描并同步'
  }
}

async function cleanupInvalidCosPhotos() {
  if (!confirm('确定要清理 COS 中未被当前配置引用的无效照片吗？此操作不可恢复。')) return

  const btn = document.getElementById('cleanupCosBtn')
  const logDiv = document.getElementById('syncLogs')

  btn.disabled = true
  btn.textContent = '正在清理...'
  logDiv.style.display = 'block'
  logDiv.innerHTML = '<div style="color: #61afef">> 正在扫描无效照片...</div>'

  try {
    const response = await fetch(`${CONFIG.apiUrl}/photos/cleanup-orphans`, {
      method: 'POST'
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || '清理失败')
    }

    if (!result.deletedCount) {
      logDiv.innerHTML = '<div style="color: #98c379">[INFO] 未发现需要清理的无效照片</div>'
      showToast('未发现无效照片', 'info')
      return
    }

    logDiv.innerHTML = [
      `<div style="color: #98c379">[OK] 已删除 ${result.deletedCount} 个无效文件</div>`,
      ...result.files.map(file => `<div style="color: #a6accd">${escapeHtml(file.key || file.name)}</div>`)
    ].join('')
    logDiv.scrollTop = logDiv.scrollHeight
    showToast(`已清理 ${result.deletedCount} 个无效文件`, 'success')
  } catch (error) {
    console.error('清理无效照片失败:', error)
    logDiv.innerHTML += `<div style="color: #e06c75">[ERROR] ${escapeHtml(error.message)}</div>`
    showToast('清理无效照片失败', 'error')
  } finally {
    btn.disabled = false
    btn.textContent = '扫描并清理无效照片'
  }
}

// 切换设置 Tab
function switchSettingsTab(tabName) {
  // 更新 Tab 样式
  document.querySelectorAll('.tab-item').forEach(item => {
    item.classList.remove('active')
    item.style.borderBottomColor = 'transparent'
    item.style.color = '#78716c'
  })

  const activeTab = document.getElementById(`tab-${tabName}`)
  if (activeTab) {
    activeTab.classList.add('active')
    activeTab.style.borderBottomColor = '#7c6a5d'
    activeTab.style.color = '#292524'
  }

  // 切换面板显示
  document.querySelectorAll('.settings-panel').forEach(panel => {
    panel.style.display = 'none'
  })

  const activePanel = document.getElementById(`panel-${tabName}`)
  if (activePanel) {
    activePanel.style.display = 'block'
  }
}

// 处理 Banner 选择
let selectedBanners = {
  'main-banner': null,
  'booking-banner': null,
  'about-banner': null
}
let selectedAvatar = null

function handleBannerSelect(type, event) {
  const file = event.target.files[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件', 'error')
    return
  }

  selectedBanners[type] = file

  // 显示预览
  const reader = new FileReader()
  reader.onload = (e) => {
    const img = document.getElementById(`preview-${type}`)
    img.src = e.target.result
    img.style.display = 'block'
    document.getElementById(`no-${type}`).style.display = 'none'

    // 显示上传按钮
    document.getElementById(`btn-upload-${type}`).style.display = 'inline-block'
  }
  reader.readAsDataURL(file)
}

function handleAvatarSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件', 'error')
    return
  }

  selectedAvatar = file

  const reader = new FileReader()
  reader.onload = (e) => {
    renderProfileAvatarPreview(e.target.result)
    document.getElementById('btn-upload-profile-avatar').style.display = 'inline-block'
  }
  reader.readAsDataURL(file)
  event.target.value = ''
}

async function uploadAvatar() {
  if (!selectedAvatar) return

  const btn = document.getElementById('btn-upload-profile-avatar')
  btn.disabled = true
  btn.textContent = '上传中...'

  try {
    const formData = new FormData()
    formData.append('avatar', selectedAvatar)

    const response = await fetch(`${CONFIG.apiUrl}/upload/avatar`, {
      method: 'POST',
      body: formData
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || '上传失败')
    }

    if (!portfolioData.photographer) {
      portfolioData.photographer = {}
    }

    portfolioData.photographer.avatar = result.avatarPath
    document.getElementById('profileAvatar').value = result.avatarPath
    renderProfileAvatarPreview(result.avatarPath)

    selectedAvatar = null
    btn.style.display = 'none'
    showToast('头像已上传并同步配置', 'success')
  } catch (error) {
    console.error('头像上传失败:', error)
    showToast('头像上传失败: ' + error.message, 'error')
  } finally {
    btn.disabled = false
    btn.textContent = '⬆️ 上传头像'
  }
}

// 上传 Banner
async function uploadBanner(type) {
  const file = selectedBanners[type]
  if (!file) return

  const btn = document.getElementById(`btn-upload-${type}`)
  btn.disabled = true
  btn.textContent = '上传中...'

  try {
    const formData = new FormData()
    formData.append('banner', file)
    formData.append('type', type)

    const response = await fetch(`${CONFIG.apiUrl}/upload/banner`, {
      method: 'POST',
      body: formData
    })

    const result = await response.json()

    if (result.success) {
      showToast('Banner 上传成功', 'success')
      btn.style.display = 'none' // 上传成功后隐藏按钮

      // 刷新预览图 (加上时间戳)
      const img = document.getElementById(`preview-${type}`)
      // 注意：这里我们不需要重新加载，因为刚刚FileReader已经预览了。
      // 但为了确保链接有效性，我们最好更新一下src为远程地址
      // 稍微延迟一下，确保 COS CDN 缓存刷新（虽然我们加了 cache-control）
      setTimeout(() => {
         img.src = `${CONFIG.cos.BaseUrl}/banner/${result.fileName}?t=${Date.now()}`
      }, 1000)

      // 清除选择的文件
      selectedBanners[type] = null
    } else {
      throw new Error(result.error)
    }
  } catch (error) {
    console.error('Banner 上传失败:', error)
    showToast('上传失败: ' + error.message, 'error')
  } finally {
    btn.disabled = false
    btn.textContent = '⬆️ 上传'
  }
}
