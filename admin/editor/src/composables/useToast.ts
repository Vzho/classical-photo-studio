import { createApp, h } from 'vue'
import Toast from '../components/Toast.vue'

interface ToastOptions {
  type?: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  closable?: boolean
}

function showToast(options: ToastOptions) {
  const container = document.createElement('div')
  document.body.appendChild(container)

  const app = createApp({
    render() {
      return h(Toast, {
        ...options,
        onClose: () => {
          app.unmount()
          document.body.removeChild(container)
        }
      })
    }
  })

  app.mount(container)
}

export function useToast() {
  return {
    success: (title: string, message?: string) => {
      showToast({ type: 'success', title, message })
    },
    error: (title: string, message?: string) => {
      showToast({ type: 'error', title, message, duration: 5000 })
    },
    warning: (title: string, message?: string) => {
      showToast({ type: 'warning', title, message })
    },
    info: (title: string, message?: string) => {
      showToast({ type: 'info', title, message })
    }
  }
}
