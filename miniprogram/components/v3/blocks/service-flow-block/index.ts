// service-flow-block（Registry: service-flow）：服务流程。
// 变体：numbered / timeline；说明显示与紧凑模式为受控开关。
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
    steps: [] as any[]
  },

  observers: {
    content(content: any) {
      const raw = Array.isArray(content) ? content : []
      this.setData({
        steps: raw.map((step: any, index: number) => ({
          index: index + 1,
          indexText: String(index + 1).padStart(2, '0'),
          title: step.title || step.name || '',
          description: step.description || step.text || ''
        }))
      })
    }
  }
})
