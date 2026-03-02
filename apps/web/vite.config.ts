import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path,
      },
    },
  },
  resolve: {
    alias: {
      '@organizrx/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@organizrx/plugin-sdk': path.resolve(__dirname, '../../packages/plugin-sdk/src'),
    },
  },
})
