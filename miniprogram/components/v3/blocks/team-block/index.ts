// team-block（Registry: team）：团队展示。
// 变体：horizontal-cards / portrait-grid；头像比例为受控档位。
import { getCosUrl } from '../../../../utils/cos'

Component({
  options: {
    addGlobalClass: true,
    styleIsolation: 'apply-shared'
  },

  properties: {
    block: { type: Object, value: {} },
    content: { type: null, value: [] }
  },

  data: {
    members: [] as any[]
  },

  observers: {
    content(content: any) {
      const raw = Array.isArray(content) ? content : []
      this.setData({
        members: raw.map((item: any) => ({
          id: item.id || item.name || '',
          name: item.name || '',
          role: item.title || '',
          bio: item.bio || '',
          avatarUrl: item.avatar ? getCosUrl(item.avatar) : ''
        }))
      })
    }
  }
})
