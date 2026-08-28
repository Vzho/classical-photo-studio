// page-shell（方案 §8.1）：blocks-v3 页面外壳。
// 只负责把主题 CSS 变量注入页面根节点并承载区块流，不含业务逻辑。
Component({
  options: {
    addGlobalClass: true,
    styleIsolation: 'apply-shared'
  },

  properties: {
    themeStyle: { type: String, value: '' },
    buttonStyle: { type: String, value: 'solid' },
    loading: { type: Boolean, value: false }
  }
})
