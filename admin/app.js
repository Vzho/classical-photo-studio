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
  openModal('editSeriesModal')
}

// 更新系列
async function updateSeries() {
  if (!currentTheme || currentEditSeriesIndex === -1) return

  const title = document.getElementById('editSeriesTitle').value.trim()
  const likes = parseInt(document.getElementById('editSeriesLikes').value) || 0
  const bannerDescription = document.getElementById('editSeriesBannerDescription').value.trim()

  if (!title) {
    showToast('标题不能为空', 'error')
    return
  }

  const series = currentTheme.series[currentEditSeriesIndex]
  series.title = title
  series.likes = likes
  if (bannerDescription) {
    series.bannerDescription = bannerDescription
  } else {
    delete series.bannerDescription
  }

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
  openModal('addSeriesModal')
}

// 添加系列
function addSeries() {
  if (!currentTheme) return

  const id = document.getElementById('seriesId').value.trim()
  const title = document.getElementById('seriesTitle').value.trim()
  const likes = parseInt(document.getElementById('seriesLikes').value) || 100
  const bannerDescription = document.getElementById('seriesBannerDescription').value.trim()

  if (!id || !title) {
    showToast('请填写完整信息', 'error')
    return
  }

  // 检查ID是否重复
  if (currentTheme.series.find(s => s.id === id)) {
    showToast('系列ID已存在', 'error')
    return
  }

  currentTheme.series.push({
    id,
    title,
    likes,
    photos: [],
    ...(bannerDescription ? { bannerDescription } : {})
  })

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
