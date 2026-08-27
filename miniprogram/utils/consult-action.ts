import { ConsultButtonContent, getAboutPageData } from './cos'
import { PHOTOGRAPHER } from './constants'

type ConsultationPrefill = Partial<{
  style: string
  packageId: string
}>

interface ContactData {
  wechat: string
  email: string
  phone: string
}

export function shouldShowConsultButton(
  consultButton: Partial<ConsultButtonContent> | null | undefined,
  pageKey: string
): boolean {
  if (consultButton?.enabled === false) return false

  const showOnPages: string[] = Array.isArray(consultButton?.showOnPages)
    ? (consultButton?.showOnPages || [])
    : []

  return !showOnPages.length || showOnPages.includes(pageKey)
}

export async function handleConsultButtonAction(
  consultButton: Partial<ConsultButtonContent> | null | undefined,
  prefill?: ConsultationPrefill
): Promise<void> {
  if (prefill && Object.keys(prefill).length) {
    wx.setStorageSync('prefillConsultation', prefill)
  }

  const action = consultButton?.action || 'booking'

  if (action === 'copyWechat') {
    const { wechat } = await getContactData()
    copyText(wechat, '微信号已复制', '暂未配置微信号')
    return
  }

  if (action === 'phone') {
    const { phone } = await getContactData()
    callOrCopyPhone(phone)
    return
  }

  if (action === 'contact') {
    const contact = await getContactData()
    showContactActions(contact)
    return
  }

  wx.switchTab({ url: '/pages/booking/booking' })
}

async function getContactData(): Promise<ContactData> {
  try {
    const { photographer, stores } = await getAboutPageData()
    const profile = {
      ...PHOTOGRAPHER,
      ...(photographer || {}),
      contact: {
        ...PHOTOGRAPHER.contact,
        ...(photographer?.contact || {})
      }
    }
    const primaryStore = (stores || []).find(item => String(item?.phone || '').trim())

    return {
      wechat: String(profile.contact?.wechat || '').trim(),
      email: String(profile.contact?.email || '').trim(),
      phone: String(profile.contact?.phone || profile.phone || primaryStore?.phone || '').trim()
    }
  } catch {
    return {
      wechat: String(PHOTOGRAPHER.contact?.wechat || '').trim(),
      email: String(PHOTOGRAPHER.contact?.email || '').trim(),
      phone: ''
    }
  }
}

function copyText(value: string, successTitle: string, emptyTitle: string) {
  if (!value) {
    wx.showToast({ title: emptyTitle, icon: 'none' })
    return
  }

  wx.setClipboardData({
    data: value,
    success: () => {
      wx.showToast({ title: successTitle, icon: 'success' })
    }
  })
}

function callOrCopyPhone(phone: string) {
  if (!phone) {
    wx.showToast({ title: '暂未配置联系电话', icon: 'none' })
    return
  }

  wx.makePhoneCall({
    phoneNumber: phone,
    fail: () => {
      copyText(phone, '电话已复制', '暂未配置联系电话')
    }
  })
}

function showContactActions(contact: ContactData) {
  const actions = [
    contact.wechat ? { label: '复制微信', run: () => copyText(contact.wechat, '微信号已复制', '暂未配置微信号') } : null,
    contact.phone ? { label: '拨打电话', run: () => callOrCopyPhone(contact.phone) } : null,
    contact.email ? { label: '复制邮箱', run: () => copyText(contact.email, '邮箱已复制', '暂未配置邮箱') } : null
  ].filter(Boolean) as Array<{ label: string; run: () => void }>

  if (!actions.length) {
    wx.showToast({ title: '暂未配置联系方式', icon: 'none' })
    return
  }

  if (actions.length === 1) {
    actions[0].run()
    return
  }

  wx.showActionSheet({
    itemList: actions.map(item => item.label),
    success: (res) => {
      actions[res.tapIndex]?.run()
    }
  })
}
