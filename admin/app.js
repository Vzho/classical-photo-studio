// 配置
const CONFIG = {
  // API 地址
  apiUrl: 'http://localhost:8080/api',  // 改为 8080
  // 腾讯云 COS 配置
  cos: {
    BaseUrl: 'https://phtoto-test-1302910967.cos.ap-chongqing.myqcloud.com'
  }
}

// 全局状态
let portfolioData = { themes: [] }
let currentTheme = null
let currentSeries = null
let currentEditSeriesIndex = -1
let selectedFiles = []

// 初始化
async function init() {
  console.log('🚀 管理后台启动中...')
  console.log('📁 配置文件路径:', CONFIG.configPath)
  
  await loadConfig()
  renderThemeList()
  updateStats()
  setupDragAndDrop()
  
  console.log('✅ 管理后台启动完成')
  console.log('📊 统计:', {
    主题数: portfolioData.themes.length,
    系列数: portfolioData.themes.reduce((sum, t) => sum + t.series.length, 0),
    照片数: portfolioData.themes.reduce((sum, t) => 
      sum + t.series.reduce((s, series) => s + series.photos.length, 0), 0)
  })
}

// 加载配置文件
async function loadConfig() {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/config`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    portfolioData = await response.json()
    console.log('✅ 配置加载成功:', portfolioData)
  } catch (error) {
    console.error('❌ 加载配置失败:', error)
    showToast('加载配置失败: ' + error.message, 'error')
    portfolioData = { themes: [] }
  }
}

// 保存配置文件
async function saveConfig() {
  try {
    console.log('💾 保存配置中...', portfolioData)
    
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

// 渲染主题列表
function renderThemeList() {
  const themeList = document.getElementById('themeList')
  themeList.innerHTML = ''
  
  portfolioData.themes.forEach(theme => {
    const li = document.createElement('li')
    li.className = 'theme-item'
    if (currentTheme && currentTheme.id === theme.id) {
      li.classList.add('active')
    }
    
    li.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>${theme.name}</span>
        <span class="edit-icon" onclick="openEditThemeModalById(event, '${theme.id}')" title="编辑主题">✏️</span>
      </div>
      <span class="theme-count">${theme.series.length} 系列</span>
    `
    
    li.onclick = (e) => {
      // 如果点击的是编辑图标，不切换主题
      if (e.target.classList.contains('edit-icon')) return
      selectTheme(theme)
    }
    themeList.appendChild(li)
  })
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
  
  container.innerHTML = '<div class="series-grid" id="seriesGrid"></div>'
  const grid = document.getElementById('seriesGrid')
  
  currentTheme.series.forEach((series, index) => {
    const card = document.createElement('div')
    card.className = 'series-card'
    
    const photosHtml = series.photos.map((photo, photoIndex) => `
      <div class="photo-item">
        <img src="${CONFIG.cos.BaseUrl}/portfolio/${photo}" alt="${photo}" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'60\\' height=\\'60\\'%3E%3Crect fill=\\'%23f5f5f4\\' width=\\'60\\' height=\\'60\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\' fill=\\'%23a8a29e\\' font-size=\\'12\\'%3E?%3C/text%3E%3C/svg%3E'">
        <button class="delete-photo" onclick="deletePhoto(${index}, ${photoIndex})">×</button>
      </div>
    `).join('')
    
    card.innerHTML = `
      <div class="series-header">
        <div>
          <div class="series-title">${series.title}</div>
          <div style="font-size: 12px; color: #78716c; margin-top: 4px;">
            ❤️ ${series.likes} · 📷 ${series.photos.length} 张
          </div>
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
    `
    
    grid.appendChild(card)
  })
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
  openModal('editSeriesModal')
}

// 更新系列
async function updateSeries() {
  if (!currentTheme || currentEditSeriesIndex === -1) return
  
  const title = document.getElementById('editSeriesTitle').value.trim()
  const likes = parseInt(document.getElementById('editSeriesLikes').value) || 0
  
  if (!title) {
    showToast('标题不能为空', 'error')
    return
  }
  
  const series = currentTheme.series[currentEditSeriesIndex]
  series.title = title
  series.likes = likes
  
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
  openModal('addSeriesModal')
}

// 添加系列
function addSeries() {
  if (!currentTheme) return
  
  const id = document.getElementById('seriesId').value.trim()
  const title = document.getElementById('seriesTitle').value.trim()
  const likes = parseInt(document.getElementById('seriesLikes').value) || 100
  
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
    photos: []
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
  selectedFiles = []
  document.getElementById('previewList').innerHTML = ''
  document.getElementById('uploadBtn').disabled = true
  openModal('uploadPhotoModal')
}

// 处理文件选择
function handleFileSelect(event) {
  const files = Array.from(event.target.files)
  addFilesToPreview(files)
}

// 添加文件到预览
function addFilesToPreview(files) {
  files.forEach(file => {
    if (!file.type.startsWith('image/')) {
      showToast('只能上传图片文件', 'error')
      return
    }
    
    selectedFiles.push(file)
    
    const reader = new FileReader()
    reader.onload = (e) => {
      const preview = document.createElement('div')
      preview.className = 'preview-item'
      preview.innerHTML = `
        <img src="${e.target.result}" alt="${file.name}">
        <button class="remove-preview" onclick="removeFile(${selectedFiles.length - 1})">×</button>
      `
      document.getElementById('previewList').appendChild(preview)
    }
    reader.readAsDataURL(file)
  })
  
  document.getElementById('uploadBtn').disabled = selectedFiles.length === 0
}

// 移除文件
function removeFile(index) {
  selectedFiles.splice(index, 1)
  const previewList = document.getElementById('previewList')
  previewList.children[index].remove()
  document.getElementById('uploadBtn').disabled = selectedFiles.length === 0
}

// 上传照片
async function uploadPhotos() {
  if (!currentSeries || selectedFiles.length === 0) return
  
  const uploadBtn = document.getElementById('uploadBtn')
  uploadBtn.disabled = true
  uploadBtn.textContent = '上传中...'
  
  try {
    const formData = new FormData()
    formData.append('themeId', currentTheme.id)
    formData.append('seriesId', currentSeries.id)
    
    selectedFiles.forEach(file => {
      formData.append('photos', file)
    })
    
    const response = await fetch(`${CONFIG.apiUrl}/upload`, {
      method: 'POST',
      body: formData
    })
    
    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error)
    }
    
    console.log('✅ 上传成功，返回的文件:', result.files)
    
    // 更新配置
    currentSeries.photos.push(...result.files)
    
    // 保存配置到文件
    await saveConfig()
    
    // 重新加载配置，确保数据同步
    await loadConfig()
    
    // 重新选择当前主题（因为数据已重新加载）
    const themeIndex = portfolioData.themes.findIndex(t => t.id === currentTheme.id)
    if (themeIndex !== -1) {
      currentTheme = portfolioData.themes[themeIndex]
      renderThemeList()
      renderSeriesList()
    }
    
    updateStats()
    closeModal('uploadPhotoModal')
    showToast(`成功上传 ${result.files.length} 张照片`, 'success')
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
  showToast('刷新中...', 'info')
  
  await loadConfig()
  
  // 如果有选中的主题，重新选择
  if (currentTheme) {
    const theme = portfolioData.themes.find(t => t.id === currentTheme.id)
    if (theme) {
      currentTheme = theme
      renderSeriesList()
    }
  }
  
  renderThemeList()
  updateStats()
  showToast('刷新完成', 'success')
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
      contact: { wechat: '', email: '' }
    }
  }

  const p = portfolioData.photographer
  document.getElementById('profileName').value = p.name || ''
  document.getElementById('profileTitle').value = p.title || ''
  document.getElementById('profileLocation').value = p.location || ''
  document.getElementById('profileAvatar').value = p.avatar || ''
  document.getElementById('profileBio').value = p.bio || ''
  document.getElementById('profileSkills').value = (p.skills || []).join('，')
  document.getElementById('profileWechat').value = p.contact?.wechat || ''
  document.getElementById('profileEmail').value = p.contact?.email || ''
  
  openModal('profileModal')
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
