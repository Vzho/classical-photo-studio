// 腾讯云 COS 辅助函数
// 需要引入 COS SDK: https://github.com/tencentyun/cos-js-sdk-v5

class COSHelper {
  constructor(config) {
    this.config = config
    this.cos = null
    this.initCOS()
  }

  // 初始化 COS SDK
  initCOS() {
    if (typeof COS === 'undefined') {
      console.error('COS SDK 未加载，请引入 cos-js-sdk-v5')
      return
    }

    this.cos = new COS({
      SecretId: this.config.SecretId,
      SecretKey: this.config.SecretKey
    })
  }

  // 上传文件到 COS
  async uploadFile(file, key) {
    if (!this.cos) {
      throw new Error('COS SDK 未初始化')
    }

    return new Promise((resolve, reject) => {
      this.cos.putObject({
        Bucket: this.config.Bucket,
        Region: this.config.Region,
        Key: key,
        Body: file,
        onProgress: (progressData) => {
          console.log('上传进度:', Math.round(progressData.percent * 100) + '%')
        }
      }, (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
  }

  // 删除 COS 文件
  async deleteFile(key) {
    if (!this.cos) {
      throw new Error('COS SDK 未初始化')
    }

    return new Promise((resolve, reject) => {
      this.cos.deleteObject({
        Bucket: this.config.Bucket,
        Region: this.config.Region,
        Key: key
      }, (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
  }

  // 批量删除文件
  async deleteMultipleFiles(keys) {
    if (!this.cos) {
      throw new Error('COS SDK 未初始化')
    }

    const objects = keys.map(key => ({ Key: key }))

    return new Promise((resolve, reject) => {
      this.cos.deleteMultipleObject({
        Bucket: this.config.Bucket,
        Region: this.config.Region,
        Objects: objects
      }, (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })
  }

  // 列出文件
  async listFiles(prefix = '') {
    if (!this.cos) {
      throw new Error('COS SDK 未初始化')
    }

    return new Promise((resolve, reject) => {
      this.cos.getBucket({
        Bucket: this.config.Bucket,
        Region: this.config.Region,
        Prefix: prefix
      }, (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data.Contents || [])
        }
      })
    })
  }

  // 检查文件是否存在
  async fileExists(key) {
    if (!this.cos) {
      throw new Error('COS SDK 未初始化')
    }

    return new Promise((resolve) => {
      this.cos.headObject({
        Bucket: this.config.Bucket,
        Region: this.config.Region,
        Key: key
      }, (err) => {
        resolve(!err)
      })
    })
  }

  // 获取文件URL
  getFileUrl(key) {
    return `${this.config.BaseUrl}/${key}`
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = COSHelper
}
