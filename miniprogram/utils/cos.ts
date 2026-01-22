// 腾讯云COS工具类

export interface CosConfig {
  bucket: string
  region: string
  baseUrl: string
}

export interface PortfolioItem {
  id: string
  title: string
  category: string
  imageUrl: string
  originalUrl?: string // 新增原图字段
  likes: number
  seriesId?: string
  isSeriesCover?: boolean
  photoCount?: number
}

// 获取COS图片完整URL
// options: { width?: number, quality?: number, format?: 'webp' | 'jpg' }
export function getCosUrl(path: string, options?: { width?: number, quality?: number, format?: string }): string {
  const app = getApp<IAppOption>()
  const { baseUrl } = app.globalData.cos
  
  let url = path.startsWith('http') ? path : `${baseUrl}/${path}`
  
  // 添加图片处理参数 (腾讯云数据万象)
  if (options) {
    const params: string[] = ['imageMogr2']
    if (options.format) params.push(`format/${options.format}`)
    if (options.width) params.push(`thumbnail/${options.width}x`)
    if (options.quality) params.push(`quality/${options.quality}`)
    
    if (params.length > 1) {
      url += (url.includes('?') ? '&' : '?') + params.join('/')
    }
  }
  
  return url
}

// 获取作品集列表（优先从COS获取动态配置）
export async function getPortfolioImages(): Promise<PortfolioItem[]> {
  try {
    const config = await loadConfig()
    const allImages = generateImagesFromConfig(config)
    return allImages.filter(item => item.isSeriesCover)
  } catch (error) {
    console.error('加载配置失败:', error)
    return []
  }
}

// 获取系列的所有照片
export async function getSeriesImages(seriesId: string): Promise<PortfolioItem[]> {
  try {
    const config = await loadConfig()
    const allImages = generateImagesFromConfig(config)
    return allImages.filter(item => item.seriesId === seriesId)
  } catch (error) {
    console.error('加载配置失败:', error)
    return []
  }
}

// 获取摄影师个人资料
export async function getPhotographerProfile(): Promise<any> {
  try {
    const config = await loadConfig()
    // 如果配置中有 photographer 字段则使用，否则尝试从 constants (为了兼容，或者直接返回空)
    // 既然我们已经迁移了数据，这里应该优先使用 config
    if (config && config.photographer) {
      return config.photographer
    }
    // Fallback logic if needed, or return null
    return null
  } catch (error) {
    console.error('加载摄影师配置失败:', error)
    return null
  }
}

// 加载配置（优先网络，失败则本地）
async function loadConfig(): Promise<any> {
  // 1. 尝试从 COS 获取
  const configUrl = getCosUrl('config/portfolio-config.json?t=' + Date.now()) // 添加时间戳避免缓存
  
  try {
    return await new Promise((resolve, reject) => {
      wx.request({
        url: configUrl,
        success: (res) => {
          if (res.statusCode === 200) {
            console.log('✅ 成功加载远程配置')
            resolve(res.data)
          } else {
            console.warn('远程配置加载失败，状态码:', res.statusCode)
            reject(new Error('Fetch failed'))
          }
        },
        fail: (err) => {
          console.warn('远程配置请求失败:', err)
          reject(err)
        }
      })
    })
  } catch (e) {
    console.log('⚠️ 降级使用本地配置')
    // 2. 失败则使用本地配置
    return require('../data/portfolio-config.json')
  }
}

// 从配置生成图片列表
function generateImagesFromConfig(config: any): PortfolioItem[] {
  const items: PortfolioItem[] = []
  
  if (!config || !config.themes) {
    return items
  }
  
  config.themes.forEach((theme: any) => {
    if (!theme.series) return
    
    theme.series.forEach((series: any) => {
      if (!series.photos) return
      
      series.photos.forEach((photoFileName: string, index: number) => {
        const isFirstPhoto = index === 0
        const photoId = `${theme.id}-${series.id}-${index + 1}`
        const seriesId = `series-${theme.id}-${series.id}`
        
        items.push({
          id: photoId,
          title: series.title,
          category: theme.name,
          // 列表页使用 WebP 格式 + 400宽缩略图
          imageUrl: getCosUrl(`portfolio/${photoFileName}`, { width: 400, format: 'webp' }),
          // 原图 URL (用于预览)
          originalUrl: getCosUrl(`portfolio/${photoFileName}`),
          likes: series.likes,
          seriesId: seriesId,
          isSeriesCover: isFirstPhoto,
          photoCount: isFirstPhoto ? series.photos.length : undefined
        })
      })
    })
  })
  
  return items
}
