/// <reference types="miniprogram-api-typings" />

interface IAppOption {
  globalData: {
    cos: {
      bucket: string
      region: string
      baseUrl: string
    }
  }
}

interface BookingData {
  name: string
  phone: string
  style: string
  date: string
  notes: string
}
