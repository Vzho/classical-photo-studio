// Node.js 后端服务器
// 用于处理配置文件的读写和 COS 操作

require('dotenv').config()
const express = require('express')
const fs = require('fs').promises
const path = require('path')
const multer = require('multer')
const COS = require('cos-nodejs-sdk-v5')
const {
  collectReferencedPhotoNames,
  removePhotoFromConfig,
  removeSeriesFromConfig,
  removeThemeFromConfig,
  reconcileMissingPhotoReferences
} = require('./portfolio-delete')

const app = express()
const PORT = process.env.PORT || 8080
const HOST = process.env.HOST || '127.0.0.1'
const UPLOAD_CONCURRENCY = 3
const SLICE_SIZE = 5 * 1024 * 1024
const CHUNK_SIZE = 2 * 1024 * 1024
const MAX_UPLOAD_FILE_SIZE = 30 * 1024 * 1024
const MAX_UPLOAD_TASKS = 50
const UPLOAD_TASK_TTL_MS = 15 * 60 * 1000
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
])
const DEFAULT_SHARE_CONFIG = {
  title: '妆造作品合集',
  imagePath: ''
}

// 配置
const CONFIG = {
  configPath: path.join(__dirname, '../miniprogram/data/portfolio-config.json'),
  configModulePath: path.join(__dirname, '../miniprogram/data/portfolio-config.js'),
  clientConfigPath: path.join(__dirname, '../miniprogram/config/client.config.js'),
  projectConfigPath: path.join(__dirname, '../miniprogram/project.config.json'),
  projectPrivateConfigPath: path.join(__dirname, '../miniprogram/project.private.config.json'),
  envPath: path.join(__dirname, '.env'),
  syncLogPath: path.join(__dirname, 'sync.log'),
  uploadDir: path.join(__dirname, 'uploads'),
  cos: {
    SecretId: process.env.COS_SECRET_ID,
    SecretKey: process.env.COS_SECRET_KEY,
    Bucket: process.env.COS_BUCKET,
    Region: process.env.COS_REGION
  }
}

// 初始化 COS (使用 let 以便后续可以重新初始化)
let cos = new COS({
  SecretId: CONFIG.cos.SecretId,
  SecretKey: CONFIG.cos.SecretKey
})
const uploadTasks = new Map()
let configMutationQueue = Promise.resolve()

// 管理后台仅供本机使用，不向局域网开放高权限 COS 接口。
app.disable('x-powered-by')
app.use(express.json({ limit: '2mb' }))
app.use('/mini-icons', express.static(path.join(__dirname, '../miniprogram/assets/icons')))
app.get(['/', '/index.html'], (req, res) => res.sendFile(path.join(__dirname, 'index.html')))
app.get('/app.js', (req, res) => res.sendFile(path.join(__dirname, 'app.js')))
app.get('/preview.css', (req, res) => res.sendFile(path.join(__dirname, 'preview.css')))
app.get('/workbench.js', (req, res) => res.sendFile(path.join(__dirname, 'workbench.js')))
app.get('/workbench.css', (req, res) => res.sendFile(path.join(__dirname, 'workbench.css')))

// 配置文件上传
const upload = multer({
  dest: CONFIG.uploadDir,
  limits: {
    fileSize: MAX_UPLOAD_FILE_SIZE,
    files: 50,
    fields: 20
  },
  fileFilter: (req, file, callback) => {
    if (ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      callback(null, true)
      return
    }

    const error = new Error('仅支持 JPG、PNG、WebP 或 GIF 图片')
    error.statusCode = 415
    callback(error)
  }
})

// ==================== API 路由 ====================

// 获取配置
app.get('/api/config', async (req, res) => {
  try {
    const { config, source } = await readConfigForAdmin()
    res.set('X-Config-Source', source)
    res.json(config)
  } catch (error) {
    console.error('读取配置失败:', error)
    res.status(500).json({ error: '读取配置失败' })
  }
})

app.get('/api/config-diagnostics', async (req, res) => {
  try {
    const { config, source } = await readConfigForAdmin()
    const firstTheme = (config.themes || [])[0] || null
    const firstSeries = (firstTheme?.series || [])[0] || null
    const photoCount = (config.themes || []).reduce((total, theme) => {
      return total + (theme.series || []).reduce((seriesTotal, series) => {
        return seriesTotal + (series.photos || []).length
      }, 0)
    }, 0)

    res.json({
      success: true,
      source,
      sourceText: source === 'cos' ? '云端 COS 配置' : '本地兜底配置',
      cos: {
        configured: hasCosConfig(),
        bucket: CONFIG.cos.Bucket || '',
        region: CONFIG.cos.Region || '',
        configKey: 'config/portfolio-config.json'
      },
      local: {
        configPath: CONFIG.configPath,
        envPath: CONFIG.envPath
      },
      currentData: {
        themeCount: (config.themes || []).length,
        seriesCount: (config.themes || []).reduce((total, theme) => total + (theme.series || []).length, 0),
        photoCount,
        firstThemeName: firstTheme?.name || '',
        firstSeriesTitle: firstSeries?.title || ''
      },
      process: {
        cwd: process.cwd(),
        adminDir: __dirname
      }
    })
  } catch (error) {
    console.error('获取配置诊断失败:', error)
    res.status(500).json({ success: false, error: '获取配置诊断失败: ' + error.message })
  }
})

async function readConfigForAdmin() {
  const remoteConfig = await readConfigFromCos()

  if (remoteConfig) {
    return {
      config: normalizePortfolioConfig(remoteConfig),
      source: 'cos'
    }
  }

  return {
    config: await readConfig(),
    source: 'local'
  }
}

async function readConfig() {
  const data = await fs.readFile(CONFIG.configPath, 'utf-8')
  return normalizePortfolioConfig(JSON.parse(data))
}

async function readLatestConfigForMutation() {
  const remoteConfig = await readConfigFromCos({ strict: true })
  return remoteConfig ? normalizePortfolioConfig(remoteConfig) : readConfig()
}

function normalizePortfolioConfig(config) {
  const normalized = config && typeof config === 'object' && !Array.isArray(config)
    ? { ...config }
    : { themes: [] }
  const fallbackTitle = String(
    normalized.theme?.brandName
      || normalized.homeBanner?.logoText
      || DEFAULT_SHARE_CONFIG.title
  ).trim() || DEFAULT_SHARE_CONFIG.title

  normalized.share = {
    ...DEFAULT_SHARE_CONFIG,
    ...(normalized.share || {}),
    title: String(normalized.share?.title || fallbackTitle).trim() || fallbackTitle,
    imagePath: String(normalized.share?.imagePath || '').trim()
  }

  for (const theme of normalized.themes || []) {
    for (const series of theme?.series || []) {
      if (!Array.isArray(series?.homeFeaturedPhotos)) continue

      const photos = new Set((series.photos || []).map(item => String(item || '').trim()).filter(Boolean))
      const hiddenPhotos = new Set((series.hiddenPhotos || []).map(item => String(item || '').trim()).filter(Boolean))
      series.homeFeaturedPhotos = Array.from(new Set(
        series.homeFeaturedPhotos
          .map(item => String(item || '').trim())
          .filter(photoName => photos.has(photoName) && !hiddenPhotos.has(photoName))
      ))
      series.featuredOnHome = series.homeFeaturedPhotos.length > 0
    }
  }

  return normalized
}

async function writeConfig(config) {
  const normalizedConfig = normalizePortfolioConfig(config)

  // COS 已配置时，客户数据只保存在云端，避免回写并污染源码模板。
  if (hasCosConfig()) {
    return normalizedConfig
  }

  const json = JSON.stringify(normalizedConfig, null, 2)
  await fs.writeFile(CONFIG.configPath, json, 'utf-8')
  await fs.writeFile(
    CONFIG.configModulePath,
    `// This file is generated from portfolio-config.json for the mini program runtime fallback.\nmodule.exports = ${json}\n`,
    'utf-8'
  )
  return normalizedConfig
}

function hasCosConfig() {
  return Boolean(CONFIG.cos.SecretId && CONFIG.cos.SecretKey && CONFIG.cos.Bucket && CONFIG.cos.Region)
}

async function readConfigFromCos({ strict = false } = {}) {
  if (!hasCosConfig()) return null

  try {
    const data = await new Promise((resolve, reject) => {
      cos.getObject({
        Bucket: CONFIG.cos.Bucket,
        Region: CONFIG.cos.Region,
        Key: 'config/portfolio-config.json'
      }, (err, result) => {
        if (err) reject(err)
        else resolve(result)
      })
    })

    const body = Buffer.isBuffer(data.Body) ? data.Body.toString('utf-8') : String(data.Body || '')
    if (!body.trim()) return null

    return JSON.parse(body)
  } catch (error) {
    const code = error?.code || error?.name
    if (code === 'NoSuchKey' || code === 'NoSuchResource' || code === 'NotFound') {
      return null
    }

    if (strict) throw error

    console.error('读取 COS 配置失败，已回退本地配置:', error.message || error)
    return null
  }
}

function parseEnvContent(envContent) {
  const envConfig = {}
  String(envContent || '').split('\n').forEach(line => {
    const [key, ...rest] = line.split('=')
    if (!key || !rest.length) return
    envConfig[key.trim()] = rest.join('=').trim()
  })
  return envConfig
}

async function listCosObjects(prefix) {
  const contents = []
  let marker

  do {
    const data = await new Promise((resolve, reject) => {
      cos.getBucket({
        Bucket: CONFIG.cos.Bucket,
        Region: CONFIG.cos.Region,
        Prefix: prefix,
        Marker: marker,
        MaxKeys: 1000
      }, (err, result) => {
        if (err) reject(err)
        else resolve(result)
      })
    })

    contents.push(...(data.Contents || []))
    marker = (data.IsTruncated === 'true' || data.IsTruncated === true) ? data.NextMarker : null
  } while (marker)

  return contents
}

async function listPortfolioObjects() {
  const prefix = 'portfolio/'
  const contents = await listCosObjects(prefix)

  return contents.map(item => ({
    key: item.Key,
    name: item.Key.replace(prefix, ''),
    size: Number(item.Size || 0),
    lastModified: item.LastModified
  }))
}

function parseGeneratedPortfolioFileName(fileName) {
  const marker = '-series-'
  const markerIndex = fileName.indexOf(marker)
  const trailingMatch = fileName.match(/-(\d{10,})-\d+\.[^.]+$/)

  if (markerIndex <= 0 || !trailingMatch) return null

  const themeId = fileName.slice(0, markerIndex)
  const seriesAndSuffix = fileName.slice(markerIndex + 1)
  const seriesId = seriesAndSuffix.slice(0, seriesAndSuffix.length - trailingMatch[0].length)

  if (!themeId || !seriesId) return null

  return { themeId, seriesId }
}

function ensureThemeAndSeries(config, themeId, seriesId) {
  if (!Array.isArray(config.themes)) config.themes = []

  let theme = config.themes.find(item => item.id === themeId)
  if (!theme) {
    theme = {
      id: themeId,
      name: `恢复分类 ${config.themes.length + 1}`,
      enabled: true,
      series: []
    }
    config.themes.push(theme)
  }

  if (!Array.isArray(theme.series)) theme.series = []

  let series = theme.series.find(item => item.id === seriesId)
  if (!series) {
    series = {
      id: seriesId,
      title: `恢复作品集 ${theme.series.length + 1}`,
      likes: 100,
      enabled: true,
      description: '',
      suitableFor: [],
      scenes: [],
      tags: [],
      relatedPackageIds: [],
      relatedPhotographerIds: [],
      photos: []
    }
    theme.series.push(series)
  }

  if (!Array.isArray(series.photos)) series.photos = []

  return { theme, series }
}

function hasVisiblePortfolioContent(config) {
  return (config.themes || []).some(theme => {
    return (theme.series || []).some(series => (series.photos || []).length > 0)
  })
}

async function findOrphanPortfolioPhotos() {
  const config = await readLatestConfigForMutation()
  const referenced = collectReferencedPhotoNames(config)
  const files = await listPortfolioObjects()

  return files.filter(file => !file.name || !referenced.has(file.name))
}

async function deleteCosObjects(keys) {
  if (!keys || keys.length === 0) return

  const chunkSize = 1000
  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize)
    const objects = chunk.map(Key => ({ Key }))

    await new Promise((resolve, reject) => {
      cos.deleteMultipleObject({
        Bucket: CONFIG.cos.Bucket,
        Region: CONFIG.cos.Region,
        Objects: objects
      }, (err, data) => {
        if (err) reject(err)
        else if (Array.isArray(data?.Error) && data.Error.length > 0) {
          const failedKeys = data.Error.map(item => item.Key).filter(Boolean).join(', ')
          reject(new Error(`部分 COS 文件删除失败: ${failedKeys || '未知文件'}`))
        } else resolve(data)
      })
    })
  }
}

async function persistConfigMutation(originalConfig, nextConfig) {
  const normalizedConfig = await writeConfig(nextConfig)
  const syncSuccess = await uploadConfigToCos(normalizedConfig)

  if (!syncSuccess) {
    await writeConfig(originalConfig)
    throw new Error('配置同步到 COS 失败，删除操作已取消')
  }

  return normalizedConfig
}

async function deletePortfolioCosFiles(fileNames) {
  if (!fileNames.length) return ''

  try {
    await deleteCosObjects(fileNames.map(fileName => `portfolio/${fileName}`))
    return ''
  } catch (error) {
    console.error('配置已删除，但清理 COS 文件失败:', error)
    return '后台记录已删除，但 COS 文件清理失败；可稍后在“云端设置”中扫描未引用照片。'
  }
}

function sendPortfolioMutationError(res, error, fallbackMessage) {
  const statusCode = Number(error?.statusCode) || 500
  if (statusCode >= 500) {
    console.error(fallbackMessage, error)
  } else {
    console.warn(`${fallbackMessage}: ${error.message}`)
  }
  res.status(statusCode).json({
    success: false,
    error: statusCode >= 500 ? `${fallbackMessage}: ${error.message}` : error.message
  })
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length)
  let index = 0

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const currentIndex = index++
      if (currentIndex >= items.length) break
      results[currentIndex] = await mapper(items[currentIndex], currentIndex)
    }
  })

  await Promise.all(workers)
  return results
}

function withConfigLock(task) {
  const run = configMutationQueue.then(task, task)
  configMutationQueue = run.catch(() => {})
  return run
}

function createUploadTask({ themeId, themeName, seriesId, seriesTitle, files }) {
  const taskId = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const normalizedFiles = files.map((file, index) => ({
    id: `${taskId}_${index}`,
    index,
    originalName: file.originalname,
    size: file.size || 0,
    mimetype: file.mimetype,
    tempPath: file.path,
    status: 'queued',
    uploadedBytes: 0,
    cosFileName: null,
    error: ''
  }))

  const task = {
    id: taskId,
    themeId,
    themeName: themeName || themeId,
    seriesId,
    seriesTitle: seriesTitle || seriesId,
    status: 'queued',
    message: '等待上传',
    error: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    totalFiles: normalizedFiles.length,
    completedFiles: 0,
    failedFiles: 0,
    totalBytes: normalizedFiles.reduce((sum, file) => sum + file.size, 0),
    uploadedBytes: 0,
    progress: 0,
    resultFiles: [],
    files: normalizedFiles
  }

  uploadTasks.set(taskId, task)
  pruneUploadTasks()
  return task
}

function pruneUploadTasks() {
  const now = Date.now()
  const entries = Array.from(uploadTasks.values()).sort((a, b) => b.createdAt - a.createdAt)

  for (const task of entries) {
    const isFinal = task.status === 'completed' || task.status === 'failed'
    if (uploadTasks.size > MAX_UPLOAD_TASKS || (isFinal && now - task.updatedAt > UPLOAD_TASK_TTL_MS)) {
      uploadTasks.delete(task.id)
    }
  }
}

function clearFinishedUploadTasks() {
  let clearedCount = 0

  for (const [taskId, task] of uploadTasks.entries()) {
    const isFinal = task.status === 'completed' || task.status === 'failed'
    if (isFinal) {
      uploadTasks.delete(taskId)
      clearedCount++
    }
  }

  return clearedCount
}

function updateUploadTaskStats(task) {
  task.completedFiles = task.files.filter(file => file.status === 'completed').length
  task.failedFiles = task.files.filter(file => file.status === 'failed').length
  task.uploadedBytes = task.files.reduce((sum, file) => sum + Math.min(file.uploadedBytes || 0, file.size || 0), 0)
  task.progress = task.totalBytes > 0
    ? Math.min(100, Math.round((task.uploadedBytes / task.totalBytes) * 100))
    : 0
  task.updatedAt = Date.now()
}

function serializeUploadTask(task) {
  return {
    id: task.id,
    themeId: task.themeId,
    themeName: task.themeName,
    seriesId: task.seriesId,
    seriesTitle: task.seriesTitle,
    status: task.status,
    message: task.message,
    error: task.error,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    totalFiles: task.totalFiles,
    completedFiles: task.completedFiles,
    failedFiles: task.failedFiles,
    totalBytes: task.totalBytes,
    uploadedBytes: task.uploadedBytes,
    progress: task.progress,
    resultFiles: task.resultFiles,
    files: task.files.map(file => ({
      id: file.id,
      originalName: file.originalName,
      size: file.size,
      status: file.status,
      uploadedBytes: file.uploadedBytes,
      cosFileName: file.cosFileName,
      error: file.error
    }))
  }
}

async function cleanupTaskTempFiles(task) {
  await Promise.all(task.files.map(file => fs.unlink(file.tempPath).catch(() => {})))
}

async function processUploadTask(taskId) {
  const task = uploadTasks.get(taskId)
  if (!task) return

  let uploadedFiles = []
  let configApplied = false

  task.status = 'running'
  task.message = '正在上传到 COS'
  updateUploadTaskStats(task)

  try {
    const config = await readLatestConfigForMutation()
    const theme = (config.themes || []).find(item => item.id === task.themeId)
    const series = theme?.series?.find(item => item.id === task.seriesId)

    if (!theme || !series) {
      throw new Error('主题或系列不存在，请刷新页面后重试')
    }

    task.themeName = theme.name || task.themeName
    task.seriesTitle = series.title || task.seriesTitle

    uploadedFiles = await mapWithConcurrency(task.files, UPLOAD_CONCURRENCY, async (taskFile, i) => {
      const ext = path.extname(taskFile.originalName)
      const fileName = `${task.themeId}-${task.seriesId}-${Date.now()}-${i}${ext}`
      const key = `portfolio/${fileName}`

      taskFile.status = 'uploading'
      taskFile.cosFileName = fileName
      taskFile.error = ''
      updateUploadTaskStats(task)

      try {
        await uploadFileWithRetry(CONFIG.cos.Bucket, CONFIG.cos.Region, key, taskFile.tempPath, {
          contentType: taskFile.mimetype,
          onProgress: (progressData = {}) => {
            const loaded = typeof progressData.loaded === 'number'
              ? progressData.loaded
              : Math.round((progressData.percent || 0) * taskFile.size)
            taskFile.uploadedBytes = Math.min(loaded, taskFile.size)
            updateUploadTaskStats(task)
          }
        })

        taskFile.uploadedBytes = taskFile.size
        taskFile.status = 'completed'
        updateUploadTaskStats(task)
        return fileName
      } catch (error) {
        taskFile.status = 'failed'
        taskFile.error = error.message
        updateUploadTaskStats(task)
        throw error
      } finally {
        await fs.unlink(taskFile.tempPath).catch(() => {})
      }
    })

    await withConfigLock(async () => {
      const latestConfig = await readLatestConfigForMutation()
      const latestTheme = (latestConfig.themes || []).find(item => item.id === task.themeId)
      const latestSeries = latestTheme?.series?.find(item => item.id === task.seriesId)

      if (!latestTheme || !latestSeries) {
        throw new Error('上传完成，但目标系列已不存在，无法写入配置')
      }

      const existingFiles = new Set(latestSeries.photos || [])
      for (const fileName of uploadedFiles) {
        if (!existingFiles.has(fileName)) {
          latestSeries.photos.push(fileName)
        }
      }

      await writeConfig(latestConfig)

      task.message = '正在同步配置到 COS'
      updateUploadTaskStats(task)

      const configSynced = await uploadConfigToCos(latestConfig)
      if (!configSynced) {
        latestSeries.photos = latestSeries.photos.filter(name => !uploadedFiles.includes(name))
        await writeConfig(latestConfig)
        throw new Error('照片已上传，但配置同步到 COS 失败')
      }

      configApplied = true
    })

    task.status = 'completed'
    task.message = `已完成，成功上传 ${uploadedFiles.length} 张照片`
    task.resultFiles = uploadedFiles
    updateUploadTaskStats(task)
  } catch (error) {
    if (!configApplied && uploadedFiles.length > 0) {
      await deleteCosObjects(uploadedFiles.map(fileName => `portfolio/${fileName}`)).catch(cleanupError => {
        console.error('回滚已上传照片失败:', cleanupError)
      })
    }

    await cleanupTaskTempFiles(task)
    task.status = 'failed'
    task.error = error.message
    task.message = `上传失败: ${error.message}`
    updateUploadTaskStats(task)
    console.error('后台上传任务失败:', error)
  }
}

// 辅助函数：上传配置文件到 COS
async function uploadConfigToCos(configData) {
  try {
    const key = 'config/portfolio-config.json'

    // 如果 configData 是对象，转换为 JSON 字符串
    const body = typeof configData === 'string' ? configData : JSON.stringify(configData, null, 2)

    await new Promise((resolve, reject) => {
      // 增加重试逻辑
      let retries = 3

      const doUpload = () => {
        cos.putObject({
          Bucket: CONFIG.cos.Bucket,
          Region: CONFIG.cos.Region,
          Key: key,
          Body: body,
          ContentType: 'application/json',
          CacheControl: 'no-cache' // 禁用缓存
        }, (err, data) => {
          if (err) {
            if (retries > 0) {
              retries--
              console.log(`上传重试中 (剩余 ${retries} 次)...`)
              setTimeout(doUpload, 1000)
            } else {
              reject(err)
            }
          } else {
            resolve(data)
          }
        })
      }

      doUpload()
    })
    console.log('✅ 配置文件已同步到 COS')
    return true
  } catch (error) {
    console.error('同步配置文件到 COS 失败:', error)
    return false
  }
}

// 辅助函数：带重试的文件上传
async function uploadFileWithRetry(bucket, region, key, filePath, options = {}) {
  const { contentType, onProgress } = options

  return new Promise((resolve, reject) => {
    let retries = 3

    const doUpload = () => {
      cos.uploadFile({
        Bucket: bucket,
        Region: region,
        Key: key,
        FilePath: filePath,
        SliceSize: SLICE_SIZE,
        ChunkSize: CHUNK_SIZE,
        ContentType: contentType,
        onProgress
      }, (err, data) => {
        if (err) {
          console.error(`上传失败: ${err.message}`)
          if (retries > 0 && (err.code === 'UserNetworkTooSlow' || err.code === 'NetworkingError')) {
            retries--
            console.log(`上传重试中 (剩余 ${retries} 次) - ${key}...`)
            setTimeout(doUpload, 2000)
          } else {
            reject(err)
          }
        } else {
          resolve(data)
        }
      })
    }

    doUpload()
  })
}

// 保存配置
app.post('/api/config', async (req, res) => {
  try {
    await withConfigLock(async () => {
      const normalizedConfig = await writeConfig(req.body)
      console.log(`✅ 配置已准备完成 (${hasCosConfig() ? '云端模式' : '本地模式'})`)

      const syncSuccess = await uploadConfigToCos(normalizedConfig)
      if (!syncSuccess) {
        throw new Error('配置同步到 COS 失败')
      }
    })

    res.json({ success: true, message: '配置已保存并同步到 COS' })
  } catch (error) {
    console.error('保存配置失败:', error)
    res.status(500).json({ error: '保存配置失败' })
  }
})

// 上传照片到 COS
app.post('/api/upload', upload.array('photos'), async (req, res) => {
  try {
    const { themeId, seriesId } = req.body
    const files = req.files

    if (!files || files.length === 0) {
      return res.status(400).json({ error: '没有文件上传' })
    }

    const config = await readLatestConfigForMutation()
    const theme = (config.themes || []).find(item => item.id === themeId)
    const series = theme?.series?.find(item => item.id === seriesId)

    if (!theme || !series) {
      await Promise.all((files || []).map(file => fs.unlink(file.path).catch(() => {})))
      return res.status(400).json({ error: '主题或系列不存在，请刷新后重试' })
    }

    const task = createUploadTask({
      themeId,
      themeName: theme.name,
      seriesId,
      seriesTitle: series.title,
      files
    })

    setImmediate(() => {
      processUploadTask(task.id).catch(error => {
        console.error('处理后台上传任务失败:', error)
      })
    })

    res.status(202).json({
      success: true,
      task: serializeUploadTask(task)
    })
  } catch (error) {
    await Promise.all((req.files || []).map(file => fs.unlink(file.path).catch(() => {})))
    console.error('上传失败:', error)
    res.status(500).json({ error: '上传失败: ' + error.message })
  }
})

app.get('/api/uploads', async (req, res) => {
  try {
    pruneUploadTasks()
    const tasks = Array.from(uploadTasks.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(serializeUploadTask)

    res.json({ success: true, tasks })
  } catch (error) {
    console.error('获取上传任务失败:', error)
    res.status(500).json({ error: '获取上传任务失败: ' + error.message })
  }
})

app.delete('/api/uploads/finished', async (req, res) => {
  try {
    const clearedCount = clearFinishedUploadTasks()
    res.json({ success: true, clearedCount })
  } catch (error) {
    console.error('清理上传任务失败:', error)
    res.status(500).json({ error: '清理上传任务失败: ' + error.message })
  }
})

app.get('/api/uploads/:taskId', async (req, res) => {
  try {
    const task = uploadTasks.get(req.params.taskId)
    if (!task) {
      return res.status(404).json({ error: '上传任务不存在' })
    }

    res.json({ success: true, task: serializeUploadTask(task) })
  } catch (error) {
    console.error('获取上传任务详情失败:', error)
    res.status(500).json({ error: '获取上传任务详情失败: ' + error.message })
  }
})

// 上传 Banner 接口
app.post('/api/upload/banner', upload.single('banner'), async (req, res) => {
  try {
    const file = req.file
    const { type } = req.body // main-banner 或 booking-banner

    if (!file) {
      return res.status(400).json({ error: '没有文件上传' })
    }

    const fileName = `${type}.jpg` // 固定文件名，覆盖旧图
    const key = `banner/${fileName}`

    // 上传到 COS
    await uploadFileWithRetry(CONFIG.cos.Bucket, CONFIG.cos.Region, key, file.path, {
      contentType: file.mimetype
    })

    // 删除临时文件
    await fs.unlink(file.path)

    console.log(`✅ Banner 上传成功: ${fileName}`)
    res.json({ success: true, fileName })
  } catch (error) {
    console.error('Banner 上传失败:', error)
    res.status(500).json({ error: '上传失败: ' + error.message })
  }
})

// 上传摄影师头像并自动写入配置
app.post('/api/upload/avatar', upload.single('avatar'), async (req, res) => {
  const file = req.file

  try {
    if (!file) {
      return res.status(400).json({ error: '没有文件上传' })
    }

    if (!file.mimetype || !file.mimetype.startsWith('image/')) {
      await fs.unlink(file.path).catch(() => {})
      return res.status(400).json({ error: '请上传图片文件' })
    }

    const extensionMap = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif'
    }
    const ext = extensionMap[file.mimetype] || path.extname(file.originalname) || '.jpg'
    const fileName = `photographer${ext.toLowerCase()}`
    const avatarPath = `avatar/${fileName}`

    await uploadFileWithRetry(CONFIG.cos.Bucket, CONFIG.cos.Region, avatarPath, file.path, {
      contentType: file.mimetype
    })

    await fs.unlink(file.path).catch(() => {})

    await withConfigLock(async () => {
      const config = await readLatestConfigForMutation()
      if (!config.photographer) config.photographer = {}
      config.photographer.avatar = avatarPath

      await writeConfig(config)

      const configSynced = await uploadConfigToCos(config)
      if (!configSynced) {
        throw new Error('头像已上传，但配置同步到 COS 失败')
      }
    })

    console.log(`✅ 头像上传成功: ${avatarPath}`)
    res.json({ success: true, avatarPath, fileName })
  } catch (error) {
    if (file?.path) {
      await fs.unlink(file.path).catch(() => {})
    }

    console.error('头像上传失败:', error)
    res.status(500).json({ error: '上传失败: ' + error.message })
  }
})

app.post('/api/upload/asset', upload.single('asset'), async (req, res) => {
  try {
    const file = req.file
    const folder = String(req.body.folder || '').replace(/[^a-zA-Z0-9_-]/g, '')
    const allowedFolders = new Set(['avatar', 'testimonial', 'share', 'icon'])

    if (!file || !folder || !allowedFolders.has(folder)) {
      if (file?.path) await fs.unlink(file.path).catch(() => {})
      return res.status(400).json({ success: false, error: '缺少文件或目录不合法' })
    }

    if (folder === 'share' && !['image/jpeg', 'image/png'].includes(file.mimetype)) {
      await fs.unlink(file.path).catch(() => {})
      return res.status(400).json({ success: false, error: '分享封面只支持 JPG 或 PNG' })
    }

    if (folder === 'icon' && file.mimetype !== 'image/png') {
      await fs.unlink(file.path).catch(() => {})
      return res.status(400).json({ success: false, error: '自定义图标只支持 PNG' })
    }

    if (folder === 'icon' && file.size > 512 * 1024) {
      await fs.unlink(file.path).catch(() => {})
      return res.status(400).json({ success: false, error: '自定义图标不能超过 512KB' })
    }

    const ext = folder === 'share'
      ? (file.mimetype === 'image/png' ? '.png' : '.jpg')
      : (folder === 'icon' ? '.png' : (path.extname(file.originalname || '').toLowerCase() || '.jpg'))
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`
    const assetPath = `${folder}/${fileName}`

    await uploadFileWithRetry(CONFIG.cos.Bucket, CONFIG.cos.Region, assetPath, file.path, {
      SliceSize: SLICE_SIZE,
      ContentType: file.mimetype
    })

    await fs.unlink(file.path).catch(() => {})
    res.json({ success: true, assetPath, fileName })
  } catch (error) {
    console.error('上传内容图片失败:', error)
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {})
    res.status(500).json({ success: false, error: error.message })
  }
})

// 永久删除作品分类：清理分类内全部作品集及关联，仅删除不再被其他分类使用的 COS 文件。
app.delete('/api/portfolio/theme', async (req, res) => {
  try {
    let responseData
    await withConfigLock(async () => {
      const originalConfig = await readLatestConfigForMutation()
      const result = removeThemeFromConfig(originalConfig, req.body || {})
      await persistConfigMutation(originalConfig, result.config)
      const warning = await deletePortfolioCosFiles(result.cosDeleteCandidates)

      responseData = {
        success: true,
        message: `作品分类“${result.removedThemeName || result.removedThemeId}”已永久删除`,
        deletedThemeId: result.removedThemeId,
        removedSeriesCount: result.removedSeriesCount,
        removedPhotoCount: result.removedPhotoNames.length,
        cosDeletedPhotoCount: warning ? 0 : result.cosDeleteCandidates.length,
        retainedSharedPhotoCount: result.removedPhotoNames.length - result.cosDeleteCandidates.length,
        warning
      }
    })

    console.log(`✅ 永久删除作品分类: ${responseData.deletedThemeId}`)
    res.json(responseData)
  } catch (error) {
    sendPortfolioMutationError(res, error, '永久删除作品分类失败')
  }
})

// 永久删除单张照片：先删除配置引用并同步，再清理未被其他作品集使用的 COS 文件。
app.delete('/api/portfolio/photo', async (req, res) => {
  try {
    let responseData
    await withConfigLock(async () => {
      const originalConfig = await readLatestConfigForMutation()
      const result = removePhotoFromConfig(originalConfig, req.body || {})
      await persistConfigMutation(originalConfig, result.config)
      const warning = await deletePortfolioCosFiles(result.cosDeleteCandidates)

      responseData = {
        success: true,
        message: result.cosDeleteCandidates.length > 0
          ? '照片已从后台和 COS 永久删除'
          : '照片已从当前作品集删除；原文件仍被其他作品集使用',
        deletedPhotoName: result.removedPhotoName,
        cosDeleted: result.cosDeleteCandidates.length > 0 && !warning,
        retainedSharedFile: result.cosDeleteCandidates.length === 0,
        warning
      }
    })

    console.log(`✅ 永久删除照片: ${responseData.deletedPhotoName}`)
    res.json(responseData)
  } catch (error) {
    sendPortfolioMutationError(res, error, '永久删除照片失败')
  }
})

// 永久删除作品集：同步清理关联配置，并仅删除不再被其他作品集使用的 COS 文件。
app.delete('/api/portfolio/series', async (req, res) => {
  try {
    let responseData
    await withConfigLock(async () => {
      const originalConfig = await readLatestConfigForMutation()
      const result = removeSeriesFromConfig(originalConfig, req.body || {})
      await persistConfigMutation(originalConfig, result.config)
      const warning = await deletePortfolioCosFiles(result.cosDeleteCandidates)

      responseData = {
        success: true,
        message: `作品集“${result.removedSeriesTitle || result.removedSeriesId}”已永久删除`,
        deletedSeriesId: result.removedSeriesId,
        removedPhotoCount: result.removedPhotoNames.length,
        cosDeletedPhotoCount: warning ? 0 : result.cosDeleteCandidates.length,
        retainedSharedPhotoCount: result.removedPhotoNames.length - result.cosDeleteCandidates.length,
        warning
      }
    })

    console.log(`✅ 永久删除作品集: ${responseData.deletedSeriesId}`)
    res.json(responseData)
  } catch (error) {
    sendPortfolioMutationError(res, error, '永久删除作品集失败')
  }
})

// 旧接口仅删除 COS 文件，不清理配置；保留兼容但禁止继续使用，避免制造失效引用。
app.delete('/api/photo/:fileName', async (req, res) => {
  res.status(410).json({
    success: false,
    error: '旧删除接口已停用，请在管理后台使用照片上的永久删除按钮。'
  })
})

// 旧批量接口同样禁止绕过配置直接删除 COS 文件。
app.post('/api/photos/delete', async (req, res) => {
  res.status(410).json({
    success: false,
    error: '旧批量删除接口已停用，请使用配置一致性删除功能。'
  })
})

// 从 COS 同步照片到配置
app.post('/api/sync/cos', async (req, res) => {
  const logs = []
  const addLog = (msg, type = 'info') => {
    const log = `[${new Date().toISOString()}] [${type.toUpperCase()}] ${msg}`
    logs.push(log)
    console.log(log)
  }

  try {
    addLog('开始从 COS 同步...')

    // 1. 获取 COS 所有文件
    const cosFiles = (await listPortfolioObjects())
      .map(item => item.name)
      .filter(Boolean)
    addLog(`🔍 COS 中发现 ${cosFiles.length} 个文件`)

    // 2. 读取当前后台配置。优先读取 COS 配置，避免用空本地配置覆盖云端。
    const { config, source } = await readConfigForAdmin()
    addLog(`当前配置来源: ${source === 'cos' ? 'COS config/portfolio-config.json' : '本地兜底 portfolio-config.json'}`)

    let updatedCount = 0
    let createdThemeCount = 0
    let createdSeriesCount = 0

    // 3. 遍历 COS 文件并尝试匹配系列
    cosFiles.forEach(fileName => {
      // 假设命名规则: themeId-seriesId-timestamp-index.ext
      // 或者简单规则: themeId-seriesId-xxx.ext

      // 尝试解析文件名
      // 我们需要一种策略来匹配。如果文件名不规范，可能很难匹配。
      // 但我们可以尝试遍历所有主题和系列，看文件名是否以它们开头。

      let matched = false

      // 检查文件是否已经在配置中
      for (const theme of config.themes) {
        for (const series of theme.series) {
          if (series.photos.includes(fileName)) {
            matched = true
            break
          }
        }
        if (matched) break
      }

      if (!matched) {
        // 如果文件不在配置中，尝试找到它所属的系列
        // 策略：检查文件名是否包含 themeId 和 seriesId
        // 格式通常是: themeId-seriesId-...

        for (const theme of config.themes || []) {
          for (const series of theme.series || []) {
            // 构造前缀
            const prefix = `${theme.id}-${series.id}`
            if (fileName.startsWith(prefix)) {
              series.photos.push(fileName)
              updatedCount++
              addLog(`➕ 恢复照片: ${fileName} -> ${theme.name}/${series.title}`)
              matched = true
              break
            }
          }
          if (matched) break
        }

        if (!matched) {
          const parsed = parseGeneratedPortfolioFileName(fileName)

          if (parsed) {
            const themeExists = (config.themes || []).some(item => item.id === parsed.themeId)
            const seriesExists = (config.themes || []).some(theme => {
              return theme.id === parsed.themeId && (theme.series || []).some(series => series.id === parsed.seriesId)
            })
            const { theme, series } = ensureThemeAndSeries(config, parsed.themeId, parsed.seriesId)

            if (!themeExists) createdThemeCount++
            if (!seriesExists) createdSeriesCount++

            if (!series.photos.includes(fileName)) {
              series.photos.push(fileName)
              updatedCount++
              addLog(`➕ 恢复照片: ${fileName} -> ${theme.name}/${series.title}`)
            }
          } else {
            addLog(`⚠️ 无法匹配照片: ${fileName} (跳过)`, 'warn')
          }
        }
      }
    })

    if (updatedCount > 0) {
      // 保存配置
      await withConfigLock(() => writeConfig(config))
      if (createdThemeCount > 0 || createdSeriesCount > 0) {
        addLog(`✅ 已自动创建 ${createdThemeCount} 个分类、${createdSeriesCount} 个作品集，可在后台重命名`)
      }
      addLog(`✅ 同步完成，恢复了 ${updatedCount} 张照片`)

      // 同步到 COS
      addLog('正在上传最新配置到 COS...')
      const uploadSuccess = await uploadConfigToCos(config)
      if (uploadSuccess) {
        addLog('✅ 配置文件已同步到 COS')
      } else {
        addLog('❌ 配置文件同步到 COS 失败', 'error')
      }
    } else {
      addLog('ℹ️ 没有发现需要恢复的照片')

      if (source === 'local' && hasVisiblePortfolioContent(config)) {
        addLog('当前使用本地配置且包含作品，正在同步到 COS...')
        const uploadSuccess = await uploadConfigToCos(config)
        if (uploadSuccess) {
          addLog('✅ 配置文件已同步到 COS')
        } else {
          addLog('❌ 配置文件同步到 COS 失败', 'error')
        }
      } else {
        addLog('未上传配置，避免用空配置覆盖云端')
      }
    }

    res.json({ success: true, logs, updatedCount })

  } catch (error) {
    addLog(`❌ 同步失败: ${error.message}`, 'error')
    console.error('同步失败:', error)
    res.status(500).json({ error: '同步失败: ' + error.message, logs })
  }
})

// 列出 COS 文件
app.get('/api/photos', async (req, res) => {
  try {
    const files = (await listPortfolioObjects()).filter(item => item.name)

    res.json({ success: true, files })
  } catch (error) {
    console.error('列出文件失败:', error)
    res.status(500).json({ error: '列出文件失败: ' + error.message })
  }
})

app.get('/api/photos/orphans', async (req, res) => {
  try {
    const files = await findOrphanPortfolioPhotos()
    res.json({ success: true, count: files.length, files })
  } catch (error) {
    console.error('扫描无效照片失败:', error)
    res.status(500).json({ error: '扫描无效照片失败: ' + error.message })
  }
})

app.get('/api/photos/missing-references', async (req, res) => {
  try {
    const config = await readLatestConfigForMutation()
    const existingPhotoNames = new Set(
      (await listPortfolioObjects()).map(file => file.name).filter(Boolean)
    )
    const result = reconcileMissingPhotoReferences(config, existingPhotoNames)

    res.json({
      success: true,
      count: result.removedReferenceCount,
      photoNames: result.removedPhotoNames,
      references: result.removedReferences
    })
  } catch (error) {
    sendPortfolioMutationError(res, error, '扫描已删除照片失败')
  }
})

app.post('/api/photos/reconcile-missing', async (req, res) => {
  try {
    if (req.body?.confirmClean !== 'CLEAN_MISSING_REFERENCES') {
      return res.status(409).json({
        success: false,
        error: '请先扫描并确认需要清理的失效照片记录。'
      })
    }

    let responseData
    await withConfigLock(async () => {
      const originalConfig = await readLatestConfigForMutation()
      const existingPhotoNames = new Set(
        (await listPortfolioObjects()).map(file => file.name).filter(Boolean)
      )
      const result = reconcileMissingPhotoReferences(originalConfig, existingPhotoNames)

      if (result.removedReferenceCount > 0) {
        await persistConfigMutation(originalConfig, result.config)
      }

      responseData = {
        success: true,
        removedReferenceCount: result.removedReferenceCount,
        removedPhotoNames: result.removedPhotoNames
      }
    })

    console.log(`✅ 已同步 COS 删除状态，清理 ${responseData.removedReferenceCount} 条失效照片记录`)
    res.json(responseData)
  } catch (error) {
    sendPortfolioMutationError(res, error, '同步 COS 删除状态失败')
  }
})

app.post('/api/photos/cleanup-orphans', async (req, res) => {
  try {
    const files = await findOrphanPortfolioPhotos()

    if (req.body?.confirmDelete !== 'DELETE_ORPHAN_PHOTOS') {
      return res.status(409).json({
        success: false,
        error: '为避免误删线上作品，清理接口默认禁用。请先使用 /api/photos/orphans 扫描，再到 COS 控制台人工确认处理。',
        count: files.length,
        files
      })
    }

    if (files.length === 0) {
      return res.json({ success: true, deletedCount: 0, files: [] })
    }

    await deleteCosObjects(files.map(file => file.key))
    console.log(`✅ 已清理无效照片: ${files.length} 个文件`)

    res.json({
      success: true,
      deletedCount: files.length,
      files
    })
  } catch (error) {
    console.error('清理无效照片失败:', error)
    res.status(500).json({ error: '清理无效照片失败: ' + error.message })
  }
})

// ==================== 咨询说明 API ====================
// v1.1 定位为“生成咨询内容”，不保存客户咨询数据。
app.post('/api/booking', async (req, res) => {
  res.status(410).json({
    success: false,
    error: '当前版本不支持真实预约提交。请在小程序前端生成咨询内容并由用户自行发送给摄影师。'
  })
})

app.get('/api/bookings', async (req, res) => {
  res.json({
    success: true,
    data: [],
    message: '当前版本不保存客户咨询记录。'
  })
})

// ==================== 系统设置与同步 API ====================

// 获取当前系统设置
app.get('/api/settings', async (req, res) => {
  try {
    // 读取 .env 中的配置
    const envContent = await fs.readFile(CONFIG.envPath, 'utf-8').catch(() => '')
    const envConfig = parseEnvContent(envContent)

    // 优先读取本机私有配置，仓库模板始终保留 touristappid。
    let appid = ''
    try {
      const privateProjectConfig = JSON.parse(await fs.readFile(CONFIG.projectPrivateConfigPath, 'utf-8'))
      appid = privateProjectConfig.appid || ''
    } catch (e) {}
    try {
      const projectConfig = JSON.parse(await fs.readFile(CONFIG.projectConfigPath, 'utf-8'))
      appid = appid || projectConfig.appid
    } catch (e) {}

    res.json({
      success: true,
      config: {
        SecretId: envConfig.COS_SECRET_ID || '',
        SecretKey: envConfig.COS_SECRET_KEY ? '******' : '', // 掩码
        Bucket: envConfig.COS_BUCKET || '',
        Region: envConfig.COS_REGION || '',
        AppID: appid
      }
    })
  } catch (error) {
    console.error('获取设置失败:', error)
    res.status(500).json({ error: '获取设置失败' })
  }
})

// 更新系统设置并同步
app.post('/api/settings', async (req, res) => {
  const logs = []
  const addLog = (msg, type = 'info') => {
    const log = `[${new Date().toISOString()}] [${type.toUpperCase()}] ${msg}`
    logs.push(log)
    console.log(log)
    // 异步写入日志文件
    fs.appendFile(CONFIG.syncLogPath, log + '\n').catch(console.error)
  }

  try {
    const { SecretId, SecretKey, Bucket, Region, AppID } = req.body

    addLog('开始配置同步流程...')

    // 1. 读取并校验配置。先验证，成功后再写 .env，避免失败时把已有配置写空。
    let envContent = await fs.readFile(CONFIG.envPath, 'utf-8').catch(() => '')
    const envConfig = parseEnvContent(envContent)
    const nextSecretId = String(SecretId || '').trim()
    const nextSecretKeyInput = String(SecretKey || '').trim()
    const nextBucket = String(Bucket || '').trim()
    const nextRegion = String(Region || '').trim()
    const existingSecretId = envConfig.COS_SECRET_ID || process.env.COS_SECRET_ID || ''
    const existingSecretKey = envConfig.COS_SECRET_KEY || process.env.COS_SECRET_KEY || ''
    const canReuseSecretKey = Boolean(existingSecretId && existingSecretKey && nextSecretId === existingSecretId)
    let nextSecretKey = nextSecretKeyInput

    if (!nextSecretId) {
      throw new Error('请填写腾讯云 SecretId')
    }

    if (!nextBucket) {
      throw new Error('请填写存储桶 Bucket')
    }

    if (!nextRegion) {
      throw new Error('请填写地域 Region，例如 ap-guangzhou')
    }

    if (!nextSecretKeyInput || nextSecretKeyInput === '******') {
      if (!canReuseSecretKey) {
        throw new Error('请填写腾讯云 SecretKey；如果更换 SecretId，必须填写对应的新 SecretKey')
      }
      nextSecretKey = existingSecretKey
    }

    const newEnv = {
      COS_SECRET_ID: nextSecretId,
      COS_SECRET_KEY: nextSecretKey,
      COS_BUCKET: nextBucket,
      COS_REGION: nextRegion,
      PORT: process.env.PORT || 8080
    }

    // 2. 验证 COS 连接 (双向验证之一)
    addLog('正在验证 COS 连接...')
    const tempCos = new COS({
      SecretId: newEnv.COS_SECRET_ID,
      SecretKey: newEnv.COS_SECRET_KEY
    })

    await new Promise((resolve, reject) => {
      tempCos.headBucket({
        Bucket: newEnv.COS_BUCKET,
        Region: newEnv.COS_REGION
      }, (err, data) => {
        if (err) reject(err)
        else resolve(data)
      })
    })
    addLog('✅ COS API 调用验证通过 (headBucket)')

    let newEnvContent = ''
    for (const [key, value] of Object.entries(newEnv)) {
      newEnvContent += `${key}=${value}\n`
    }

    await fs.writeFile(CONFIG.envPath, newEnvContent)
    addLog('✅ Admin环境配置(.env) 已更新')

    // 更新内存中的 process.env，以便后续操作立即生效
    process.env.COS_SECRET_ID = newEnv.COS_SECRET_ID
    process.env.COS_SECRET_KEY = newEnv.COS_SECRET_KEY
    process.env.COS_BUCKET = newEnv.COS_BUCKET
    process.env.COS_REGION = newEnv.COS_REGION

    // 更新全局 CONFIG 对象
    CONFIG.cos.SecretId = newEnv.COS_SECRET_ID
    CONFIG.cos.SecretKey = newEnv.COS_SECRET_KEY
    CONFIG.cos.Bucket = newEnv.COS_BUCKET
    CONFIG.cos.Region = newEnv.COS_REGION

    // 重新初始化全局 cos 实例（修复 bug：使用新密钥）
    cos = new COS({
      SecretId: newEnv.COS_SECRET_ID,
      SecretKey: newEnv.COS_SECRET_KEY
    })
    addLog('✅ 全局 COS 实例已重新初始化')

    // 3. 同步到小程序客户配置。真实客户 COS 信息只写入本地生成文件，不写进 app.ts。
    await fs.mkdir(path.dirname(CONFIG.clientConfigPath), { recursive: true })
    const clientConfigContent = `// This file is generated by the CMS "云端设置" page.
// It is customer-specific and should not be committed.
module.exports = {
  cos: {
    bucket: '${newEnv.COS_BUCKET}',
    region: '${newEnv.COS_REGION}',
    baseUrl: 'https://${newEnv.COS_BUCKET}.cos.${newEnv.COS_REGION}.myqcloud.com'
  }
}
`
    await fs.writeFile(CONFIG.clientConfigPath, clientConfigContent, 'utf-8')
    addLog('✅ 小程序客户配置 (config/client.config.js) 已生成')

    // 4. 同步 AppID 到本机私有配置，避免把客户 AppID 写入 Git 模板。
    if (AppID) {
      const privateProjectConfig = JSON.parse(
        await fs.readFile(CONFIG.projectPrivateConfigPath, 'utf-8').catch(() => '{}')
      )
      if (privateProjectConfig.appid !== AppID) {
        privateProjectConfig.appid = AppID
        await fs.writeFile(CONFIG.projectPrivateConfigPath, `${JSON.stringify(privateProjectConfig, null, 2)}\n`)
        addLog(`✅ 小程序 AppID 已更新为: ${AppID}`)
      } else {
        addLog('ℹ️ 小程序 AppID 无需更新')
      }
    }

    addLog('🎉 所有配置同步完成！')

    res.json({
      success: true,
      logs,
      message: '配置已保存并同步'
    })

  } catch (error) {
    addLog(`❌ 同步失败: ${error.message}`, 'error')
    console.error('配置同步失败:', error)
    res.status(500).json({
      success: false,
      error: error.message,
      logs
    })
  }
})

// ==================== 启动服务器 ====================

// 确保上传目录存在
fs.mkdir(CONFIG.uploadDir, { recursive: true })
  .then(async () => {
    const tempFiles = await fs.readdir(CONFIG.uploadDir).catch(() => [])
    if (tempFiles.length > 0) {
      await Promise.all(tempFiles.map(file => fs.unlink(path.join(CONFIG.uploadDir, file)).catch(() => {})))
      console.log(`🧹 已清理 ${tempFiles.length} 个残留临时文件`)
    }
  })
  .catch(console.error)

app.use((error, req, res, next) => {
  if (res.headersSent) {
    next(error)
    return
  }

  const statusCode = error instanceof multer.MulterError
    ? (error.code === 'LIMIT_FILE_SIZE' ? 413 : 400)
    : (Number(error?.statusCode) || 500)
  const message = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
    ? '单张图片不能超过 30MB'
    : (error.message || '请求处理失败')

  if (statusCode >= 500) {
    console.error('请求处理失败:', error)
  }

  res.status(statusCode).json({ success: false, error: message })
})

app.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 管理后台服务器已启动              ║
║                                        ║
║   📡 API 地址: http://${HOST}:${PORT}   ║
║   🌐 管理后台: http://${HOST}:${PORT}   ║
║                                        ║
║   📁 配置文件: ${path.basename(CONFIG.configPath)}     ║
║   ☁️  COS Bucket: ${String(CONFIG.cos.Bucket || '未配置').substring(0, 20)}... ║
╚════════════════════════════════════════╝
  `)
})

// 错误处理
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error)
})

process.on('unhandledRejection', (error) => {
  console.error('❌ 未处理的 Promise 拒绝:', error)
})
