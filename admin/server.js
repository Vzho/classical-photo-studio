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

// 初始化 COS
const cos = new COS({
  SecretId: CONFIG.cos.SecretId,
  SecretKey: CONFIG.cos.SecretKey
})

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
    const data = await fs.readFile(CONFIG.configPath, 'utf-8')
    res.json(JSON.parse(data))
  } catch (error) {
    console.error('读取配置失败:', error)
    res.status(500).json({ error: '读取配置失败' })
  }
})

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
async function uploadFileWithRetry(bucket, region, key, filePath) {
  return new Promise((resolve, reject) => {
    let retries = 3
    
    const doUpload = () => {
      cos.putObject({
        Bucket: bucket,
        Region: region,
        Key: key,
        Body: require('fs').createReadStream(filePath)
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
    const data = JSON.stringify(req.body, null, 2)
    await fs.writeFile(CONFIG.configPath, data, 'utf-8')
    console.log('✅ 配置已保存到本地')
    
    // 同步到 COS
    await uploadConfigToCos(req.body)
    
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
    
    const uploadedFiles = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = path.extname(file.originalname)
      const fileName = `${themeId}-${seriesId}-${Date.now()}-${i}${ext}`
      const key = `portfolio/${fileName}`
      
      // 上传到 COS
      await uploadFileWithRetry(CONFIG.cos.Bucket, CONFIG.cos.Region, key, file.path)
      
      // 删除临时文件
      await fs.unlink(file.path)
      
      uploadedFiles.push(fileName)
      console.log(`✅ 上传成功: ${fileName}`)
    }
    
    res.json({ success: true, files: uploadedFiles })
  } catch (error) {
    console.error('上传失败:', error)
    res.status(500).json({ error: '上传失败: ' + error.message })
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
    await uploadFileWithRetry(CONFIG.cos.Bucket, CONFIG.cos.Region, key, file.path)
    
    // 删除临时文件
    await fs.unlink(file.path)
    
    console.log(`✅ Banner 上传成功: ${fileName}`)
    res.json({ success: true, fileName })
  } catch (error) {
    console.error('Banner 上传失败:', error)
    res.status(500).json({ error: '上传失败: ' + error.message })
  }
})

// 删除 COS 文件
app.delete('/api/photo/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params
    const key = `portfolio/${fileName}`
    
    await new Promise((resolve, reject) => {
      cos.deleteObject({
        Bucket: CONFIG.cos.Bucket,
        Region: CONFIG.cos.Region,
        Key: key
      }, (err, data) => {
        if (err) reject(err)
        else resolve(data)
      })
    })
    
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
    
    const objects = fileNames.map(name => ({ Key: `portfolio/${name}` }))
    
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
    const data = await new Promise((resolve, reject) => {
      cos.getBucket({
        Bucket: CONFIG.cos.Bucket,
        Region: CONFIG.cos.Region,
        Prefix: 'portfolio/'
      }, (err, data) => {
        if (err) reject(err)
        else resolve(data)
      })
    })

    const cosFiles = (data.Contents || []).map(item => item.Key.replace('portfolio/', ''))
    addLog(`🔍 COS 中发现 ${cosFiles.length} 个文件`)

    // 2. 读取当前配置
    const configData = await fs.readFile(CONFIG.configPath, 'utf-8')
    const config = JSON.parse(configData)
    
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
      await fs.writeFile(CONFIG.configPath, JSON.stringify(config, null, 2), 'utf-8')
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
    const data = await new Promise((resolve, reject) => {
      cos.getBucket({
        Bucket: CONFIG.cos.Bucket,
        Region: CONFIG.cos.Region,
        Prefix: 'portfolio/'
      }, (err, data) => {
        if (err) reject(err)
        else resolve(data)
      })
    })
    
    const files = (data.Contents || []).map(item => ({
      name: item.Key.replace('portfolio/', ''),
      size: item.Size,
      lastModified: item.LastModified
    }))
    
    res.json({ success: true, files })
  } catch (error) {
    console.error('列出文件失败:', error)
    res.status(500).json({ error: '列出文件失败: ' + error.message })
  }
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
fs.mkdir(CONFIG.uploadDir, { recursive: true }).catch(console.error)

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 管理后台服务器已启动              ║
║                                        ║
║   📡 API 地址: http://localhost:${PORT}   ║
║   🌐 管理后台: http://localhost:${PORT}   ║
║                                        ║
║   📁 配置文件: ${path.basename(CONFIG.configPath)}     ║
║   ☁️  COS Bucket: ${CONFIG.cos.Bucket.substring(0, 20)}... ║
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
