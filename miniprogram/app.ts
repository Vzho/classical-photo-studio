interface ClientCosConfig {
  bucket: string
  region: string
  baseUrl: string
}

interface ClientRuntimeConfig {
  cos?: Partial<ClientCosConfig>
}

const DEFAULT_COS_CONFIG: ClientCosConfig = {
  bucket: '',
  region: '',
  baseUrl: ''
}

function loadClientConfig(): { cos: ClientCosConfig } {
  let clientConfig: ClientRuntimeConfig = {}

  try {
    const loaded = require('./config/client.config')
    clientConfig = loaded?.default || loaded?.CLIENT_CONFIG || loaded || {}
  } catch {
    try {
      const loaded = require('./client.config')
      clientConfig = loaded?.default || loaded?.CLIENT_CONFIG || loaded || {}
    } catch {
      clientConfig = {}
    }
  }

  const cos = clientConfig.cos || {}
  const bucket = String(cos.bucket || '').trim()
  const region = String(cos.region || '').trim()
  const baseUrl = String(
    cos.baseUrl || (bucket && region ? `https://${bucket}.cos.${region}.myqcloud.com` : '')
  ).trim().replace(/\/+$/, '')

  return {
    cos: {
      bucket,
      region,
      baseUrl
    }
  }
}

App<IAppOption>({
  globalData: loadClientConfig()
})
