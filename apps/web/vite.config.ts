import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const apiProxy = {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    rewrite: (requestPath: string) => requestPath,
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: apiProxy,
  },
  preview: {
    port: 5173,
    host: '0.0.0.0',
    proxy: apiProxy,
  },
  resolve: {
    alias: {
      '@organizrx/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@organizrx/plugin-sdk': path.resolve(__dirname, '../../packages/plugin-sdk/src'),
    },
  },
})
