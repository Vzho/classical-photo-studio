import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  root: __dirname,
  base: '/editor/',
  build: {
    outDir: path.resolve(__dirname, '../editor-dist'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'pinia'],
          validation: ['ajv']
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true
      },
      '/mini-icons': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true
      }
    }
  }
})
