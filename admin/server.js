// Node.js 后端服务器
// 用于处理配置文件的读写和 COS 操作

require('dotenv').config()
const express = require('express')
const cors = require('cors')
const fs = require('fs').promises
const path = require('path')
const multer = require('multer')
const COS = require('cos-nodejs-sdk-v5')

const app = express()
const PORT = process.env.PORT || 8080
const UPLOAD_CONCURRENCY = 3
const SLICE_SIZE = 5 * 1024 * 1024
const CHUNK_SIZE = 2 * 1024 * 1024
const MAX_UPLOAD_TASKS = 50
const UPLOAD_TASK_TTL_MS = 15 * 60 * 1000

// 配置
const CONFIG = {
  configPath: path.join(__dirname, '../miniprogram/data/portfolio-config.json'),
  appTsPath: path.join(__dirname, '../miniprogram/app.ts'),
  projectConfigPath: path.join(__dirname, '../miniprogram/project.config.json'),
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

// 中间件
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname)))

// 配置文件上传
const upload = multer({ dest: CONFIG.uploadDir })

// ==================== API 路由 ====================

// 获取配置
app.get('/api/config', async (req, res) => {
  try {
    res.json(await readConfig())
  } catch (error) {
    console.error('读取配置失败:', error)
    res.status(500).json({ error: '读取配置失败' })
  }
})

async function readConfig() {
  const data = await fs.readFile(CONFIG.configPath, 'utf-8')
  return JSON.parse(data)
}

async function writeConfig(config) {
  await fs.writeFile(CONFIG.configPath, JSON.stringify(config, null, 2), 'utf-8')
}

function collectReferencedPhotoNames(config) {
  const referenced = new Set()

  for (const theme of config.themes || []) {
    for (const series of theme.series || []) {
      for (const photo of series.photos || []) {
        referenced.add(photo)
      }
    }
  }

  return referenced
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

async function findOrphanPortfolioPhotos() {
  const config = await readConfig()
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
        else resolve(data)
      })
    })
  }
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
    const config = await readConfig()
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
      const latestConfig = await readConfig()
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
      await writeConfig(req.body)
      console.log('✅ 配置已保存到本地')

      const syncSuccess = await uploadConfigToCos(req.body)
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

    const config = await readConfig()
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
      const config = await readConfig()
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

// 删除 COS 文件
app.delete('/api/photo/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params
    await deleteCosObjects([`portfolio/${fileName}`])

    console.log(`✅ 删除成功: ${fileName}`)
    res.json({ success: true, message: '删除成功' })
  } catch (error) {
    console.error('删除失败:', error)
    res.status(500).json({ error: '删除失败: ' + error.message })
  }
})

// 批量删除 COS 文件
app.post('/api/photos/delete', async (req, res) => {
  try {
    const { fileNames } = req.body

    if (!fileNames || fileNames.length === 0) {
      return res.status(400).json({ error: '没有指定文件' })
    }

    await deleteCosObjects(fileNames.map(name => `portfolio/${name}`))

    console.log(`✅ 批量删除成功: ${fileNames.length} 个文件`)
    res.json({ success: true, message: `删除了 ${fileNames.length} 个文件` })
  } catch (error) {
    console.error('批量删除失败:', error)
    res.status(500).json({ error: '批量删除失败: ' + error.message })
  }
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

    // 2. 读取当前配置
    const config = await readConfig()

    let updatedCount = 0

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

        for (const theme of config.themes) {
          for (const series of theme.series) {
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
          addLog(`⚠️ 无法匹配照片: ${fileName} (跳过)`, 'warn')
        }
      }
    })

    if (updatedCount > 0) {
      // 保存配置
      await withConfigLock(() => writeConfig(config))
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
      // 即使没有发现新照片，也尝试同步一次配置，确保 COS 上有文件
      addLog('正在检查 COS 配置...')
      const uploadSuccess = await uploadConfigToCos(config)
      if (uploadSuccess) {
        addLog('✅ 配置文件已同步到 COS')
      } else {
        addLog('❌ 配置文件同步到 COS 失败', 'error')
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

app.post('/api/photos/cleanup-orphans', async (req, res) => {
  try {
    const files = await findOrphanPortfolioPhotos()

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
    const envConfig = {}
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=')
      if (key && value) envConfig[key.trim()] = value.trim()
    })

    // 读取 project.config.json 中的 appid
    let appid = ''
    try {
      const projectConfig = JSON.parse(await fs.readFile(CONFIG.projectConfigPath, 'utf-8'))
      appid = projectConfig.appid
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

    // 1. 更新 .env 文件 (Admin 配置)
    let envContent = await fs.readFile(CONFIG.envPath, 'utf-8').catch(() => '')
    const newEnv = {
      COS_SECRET_ID: SecretId,
      COS_SECRET_KEY: SecretKey === '******' ? process.env.COS_SECRET_KEY : SecretKey, // 如果是掩码则保持原值
      COS_BUCKET: Bucket,
      COS_REGION: Region,
      PORT: process.env.PORT || 8080
    }

    // 如果没有传 Key 且原值也不存在，报错
    if (!newEnv.COS_SECRET_KEY) {
      throw new Error('SecretKey 不能为空')
    }

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

    // 重新初始化全局 cos 实例
    // 注意：server.js 开头的 cos 实例是 const 定义的，无法重新赋值。
    // 但我们可以修改它的 options (如果 SDK 支持) 或者后续都使用临时实例。
    // 简单起见，我们在验证时使用新实例。

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

    // 重新初始化全局 cos 实例（修复 bug：使用新密钥）
    cos = new COS({
      SecretId: newEnv.COS_SECRET_ID,
      SecretKey: newEnv.COS_SECRET_KEY
    })
    addLog('✅ 全局 COS 实例已重新初始化')

    // 3. 同步到小程序配置 (miniprogram/app.ts)
    let appTsContent = await fs.readFile(CONFIG.appTsPath, 'utf-8')
    // 使用正则替换 globalData 中的 cos 配置
    // 匹配 pattern: cos: { ... }
    const cosConfigRegex = /cos:\s*\{[\s\S]*?\}/
    const newCosConfigStr = `cos: {
      bucket: '${newEnv.COS_BUCKET}',
      region: '${newEnv.COS_REGION}',
      baseUrl: 'https://${newEnv.COS_BUCKET}.cos.${newEnv.COS_REGION}.myqcloud.com'
    }`

    if (cosConfigRegex.test(appTsContent)) {
      appTsContent = appTsContent.replace(cosConfigRegex, newCosConfigStr)
      await fs.writeFile(CONFIG.appTsPath, appTsContent)
      addLog('✅ 小程序配置 (app.ts) 已同步更新')
    } else {
      addLog('⚠️ 未能在 app.ts 中找到 cos 配置块，跳过更新', 'warn')
    }

    // 4. 同步 AppID (project.config.json)
    if (AppID) {
      const projectConfig = JSON.parse(await fs.readFile(CONFIG.projectConfigPath, 'utf-8'))
      if (projectConfig.appid !== AppID) {
        projectConfig.appid = AppID
        await fs.writeFile(CONFIG.projectConfigPath, JSON.stringify(projectConfig, null, 2))
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

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 管理后台服务器已启动              ║
║                                        ║
║   📡 API 地址: http://localhost:${PORT}   ║
║   🌐 管理后台: http://localhost:${PORT}   ║
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
