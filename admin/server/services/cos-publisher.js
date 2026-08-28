// COS Publisher：只负责把 JSON 上传到指定 COS Key（方案 §9.4）。
// 通过依赖注入支持测试用的假 Publisher（方案 §13.3）。
// provider 惰性返回 { cos, bucket, region }，以便后台更新 COS 密钥重建实例后仍然生效。
function createCosPublisher({ provider } = {}) {
  function resolve() {
    const context = typeof provider === 'function' ? provider() : provider
    return context || {}
  }

  function available() {
    const { cos, bucket, region } = resolve()
    return Boolean(cos && bucket && region)
  }

  async function putJson(key, data) {
    const { cos, bucket, region } = resolve()
    if (!(cos && bucket && region)) {
      throw new Error('COS 未配置（缺少 SecretId/SecretKey/Bucket/Region），无法上传')
    }
    const body = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    const retries = 3
    let attempts = retries
    while (true) {
      try {
        await new Promise((resolve, reject) => {
          cos.putObject({
            Bucket: bucket,
            Region: region,
            Key: key,
            Body: body,
            ContentType: 'application/json',
            CacheControl: 'no-cache'
          }, (err, result) => (err ? reject(err) : resolve(result)))
        })
        return true
      } catch (error) {
        if (attempts <= 1) throw error
        attempts -= 1
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }

  return { available, putJson }
}

// 内存假 Publisher：集成测试使用，记录上传顺序与内容（方案 §13.3）。
function createFakePublisher({ failKeys = [] } = {}) {
  const uploads = []
  return {
    uploads,
    available: () => true,
    async putJson(key, data) {
      if (failKeys.includes(key)) {
        throw new Error(`模拟上传失败: ${key}`)
      }
      uploads.push({ key, data, at: Date.now() })
      return true
    }
  }
}

module.exports = { createCosPublisher, createFakePublisher }
