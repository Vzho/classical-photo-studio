<template>
  <Teleport to="body">
    <div v-if="visible" :class="['toast-container', `toast-${type}`]">
      <div class="toast-icon">{{ iconMap[type] }}</div>
      <div class="toast-content">
        <div class="toast-title">{{ title }}</div>
        <div v-if="message" class="toast-message">{{ message }}</div>
      </div>
      <button v-if="closable" class="toast-close" @click="close">✕</button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

interface Props {
  type?: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  closable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  duration: 3000,
  closable: true
})

const emit = defineEmits<{
  close: []
}>()

const visible = ref(false)
let timer: number | null = null

const iconMap = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: 'ℹ'
}

function close() {
  visible.value = false
  emit('close')
}

function show() {
  visible.value = true

  if (props.duration > 0) {
    if (timer) clearTimeout(timer)
    timer = window.setTimeout(() => {
      close()
    }, props.duration)
  }
}

onMounted(() => {
  show()
})

watch(() => props.title, () => {
  if (visible.value) {
    show()
  }
})
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  min-width: 320px;
  max-width: 480px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  animation: slide-in 0.3s ease;
}

@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.toast-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 600;
  border-radius: 50%;
}

.toast-success {
  border-left: 4px solid #16a34a;
}

.toast-success .toast-icon {
  background: #dcfce7;
  color: #16a34a;
}

.toast-error {
  border-left: 4px solid #dc2626;
}

.toast-error .toast-icon {
  background: #fee2e2;
  color: #dc2626;
}

.toast-warning {
  border-left: 4px solid #ea580c;
}

.toast-warning .toast-icon {
  background: #fef3c7;
  color: #ea580c;
}

.toast-info {
  border-left: 4px solid #0ea5e9;
}

.toast-info .toast-icon {
  background: #e0f2fe;
  color: #0ea5e9;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.toast-message {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.toast-close {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  background: transparent;
  color: var(--color-text-muted);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
}

.toast-close:hover {
  background: var(--color-surface-secondary);
  color: var(--color-text);
}
</style>
