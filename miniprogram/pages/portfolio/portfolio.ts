import { CATEGORIES, Category } from '../../utils/constants'
import { getPortfolioPageData, getCosUrl, HomeBannerContent, PortfolioItem } from '../../utils/cos'

const DEFAULT_HOME_BANNER: HomeBannerContent = {
  logoText: '摄影作品合集',
  tagText: '精选作品',
  description: '展示摄影作品、服务风格和预约入口。'
}

function getNextRenderableCoverItem(item: PortfolioItem, width: number): PortfolioItem {
  if (item.originalUrl && item.imageUrl !== item.originalUrl) {
    return {
      ...item,
      imageUrl: item.originalUrl
    }
  }

  const candidatePhotoNames = item.candidatePhotoNames || []
  const candidateIndex = item.candidateIndex || 0
  const nextPhotoName = candidatePhotoNames[candidateIndex + 1]

  if (!nextPhotoName) {
    return item
  }

  return {
    ...item,
    candidateIndex: candidateIndex + 1,
    imageUrl: getCosUrl(`portfolio/${nextPhotoName}`, { width, format: 'webp' }),
    originalUrl: getCosUrl(`portfolio/${nextPhotoName}`)
  }
}

Page({
  data: {
    categories: CATEGORIES,
    activeCategory: '全部' as Category,
    portfolioItems: [] as PortfolioItem[],
    filteredItems: [] as PortfolioItem[],
    bannerItems: [] as PortfolioItem[], // 轮播图数据
    homeBanner: DEFAULT_HOME_BANNER,
    bannerUrl: '',
    showFloatingBtn: false // 控制悬浮按钮显示
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
  },
  
  // 监听页面滚动
  onPageScroll() {
    // 获取页面高度信息，判断是否接近底部
    const query = wx.createSelectorQuery()
    query.select('.portfolio-page').boundingClientRect()
    query.selectViewport().scrollOffset()
    query.exec((res) => {
      if (res[0] && res[1]) {
        const pageHeight = res[0].height
        const scrollTop = res[1].scrollTop
        const windowHeight = wx.getSystemInfoSync().windowHeight
        
        // 距离底部 300px 时显示 (比 100px 稍微提前一点，体验更好)
        const isNearBottom = scrollTop + windowHeight > pageHeight - 300
        
        if (this.data.showFloatingBtn !== isNearBottom) {
          this.setData({ showFloatingBtn: isNearBottom })
        }
      }
    })
  },
  
  // 跳转到预约页面
  goBooking() {
    wx.switchTab({
      url: '/pages/booking/booking'
    })
  },

  async loadData() {
    const bannerUrl = getCosUrl('banner/main-banner.jpg')
    const { portfolioItems, homeBanner } = await getPortfolioPageData()
    const categories = ['全部', ...Array.from(new Set(portfolioItems.map(item => item.category)))]
    const activeCategory = categories.includes(this.data.activeCategory) ? this.data.activeCategory : '全部'
    
    // 筛选出系列作品作为轮播图候选（只要是系列封面的）
    const seriesItems = portfolioItems.filter(item => item.isSeriesCover && item.seriesId)
    
    // 按点赞数排序，取前6个
    const bannerItems = seriesItems
      .sort((a, b) => b.likes - a.likes)
      .slice(0, 6)
      // 为轮播图加载更高质量的图片
      .map(item => {
        // 修复: 确保替换后的路径正确保留斜杠
        // 原始 item.imageUrl 可能是 .../portfolio/xxx.jpg?imageMogr2...
        // 或者 item.originalUrl 是 .../portfolio/xxx.jpg
        // 我们需要提取文件名
        
        let path = ''
        if (item.originalUrl) {
          // 如果有 originalUrl，提取其中的路径部分
          // 假设 originalUrl 是完整的 URL，如 https://.../portfolio/xxx.jpg
          const parts = item.originalUrl.split('/portfolio/')
          if (parts.length > 1) {
            path = 'portfolio/' + parts[1]
          }
        }
        
        // 如果上面没提取到，尝试从 imageUrl 提取
        if (!path) {
           const urlPart = item.imageUrl.split('?')[0]
           const parts = urlPart.split('/portfolio/')
           if (parts.length > 1) {
             path = 'portfolio/' + parts[1]
           }
        }
        
        // 如果还是没提取到（极少情况），就保持原样或报错
        // 这里为了稳健，直接用 originalUrl 作为 fallback
        
        return {
          ...item,
          // 轮播图使用稍大一点的缩略图 (800px)
          imageUrl: path ? getCosUrl(path, { width: 800, format: 'webp' }) : item.imageUrl
        }
      })

    this.setData({
      categories,
      activeCategory,
      bannerUrl,
      portfolioItems,
      homeBanner: {
        ...DEFAULT_HOME_BANNER,
        ...(homeBanner || {})
      },
      filteredItems: activeCategory === '全部'
        ? portfolioItems
        : portfolioItems.filter(item => item.category === activeCategory),
      bannerItems
    })
  },
  
  // 轮播图点击跳转
  onBannerTap(e: WechatMiniprogram.TouchEvent) {
    const item = e.currentTarget.dataset.item as PortfolioItem
    if (item && item.seriesId) {
      wx.navigateTo({
        url: `/pages/series/series?seriesId=${item.seriesId}&title=${item.title}&category=${item.category}`
      })
    }
  },
  
  onBannerError() {
    // Banner 加载失败时的兜底图 (可以使用本地图片或纯色背景)
    console.warn('Banner 加载失败，使用默认图')
    // 这里我们不做处理，让它显示空白或者默认背景色
    // 或者可以 setData 设置一个本地路径
  },

  onBannerImageError(e: WechatMiniprogram.CustomEvent) {
    const id = e.currentTarget.dataset.id as string
    const bannerItems = this.data.bannerItems.map(item => {
      if (item.id === id) {
        return getNextRenderableCoverItem(item, 800)
      }
      return item
    })

    this.setData({ bannerItems })
  },

  onCategoryTap(e: WechatMiniprogram.TouchEvent) {
    const category = e.currentTarget.dataset.category as Category
    const { portfolioItems } = this.data
    
    const filteredItems = category === '全部' 
      ? portfolioItems 
      : portfolioItems.filter(item => item.category === category)
    
    this.setData({
      activeCategory: category,
      filteredItems
    })
  },

  onItemTap(e: WechatMiniprogram.TouchEvent) {
    const item = e.currentTarget.dataset.item as PortfolioItem
    
    // 如果是系列作品，跳转到系列详情页
    if (item.seriesId) {
      wx.navigateTo({
        url: `/pages/series/series?seriesId=${item.seriesId}&title=${item.title}&category=${item.category}`
      })
    } else {
      // 单张作品，直接预览
      wx.previewImage({
        current: item.originalUrl || item.imageUrl,
        urls: this.data.filteredItems.map(i => i.originalUrl || i.imageUrl)
      })
    }
  },

  onImageLoad(e: WechatMiniprogram.ImageLoad) {
    // 图片加载完成后，根据图片尺寸动态调整容器高度
    const { width, height } = e.detail
    const id = e.currentTarget.dataset.id
    
    // 计算图片比例，设置合适的高度
    const ratio = height / width
    const containerWidth = 339 // rpx，约为 (750 - 48 - 24) / 2
    let containerHeight = containerWidth * ratio
    
    // 限制高度范围
    if (containerHeight < 400) containerHeight = 400
    if (containerHeight > 600) containerHeight = 600
    
    // 可以在这里动态设置每个图片容器的高度
    // 但小程序不支持动态设置单个元素样式，所以使用固定范围
  },

  onItemImageError(e: WechatMiniprogram.CustomEvent) {
    const id = e.currentTarget.dataset.id as string
    const updateItem = (item: PortfolioItem) => {
      if (item.id === id) {
        return getNextRenderableCoverItem(item, 400)
      }
      return item
    }

    this.setData({
      portfolioItems: this.data.portfolioItems.map(updateItem),
      filteredItems: this.data.filteredItems.map(updateItem)
    })
  },

  onShareAppMessage() {
    return {
      title: '摄影作品合集',
      path: '/pages/portfolio/portfolio',
      imageUrl: this.data.bannerUrl
    }
  }
})
