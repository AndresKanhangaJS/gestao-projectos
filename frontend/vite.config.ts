import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      // nginx fala HTTP e sabe encaminhar para o php-fpm (app) via fastcgi;
      // o vite nao consegue falar fastcgi directamente com o app, por isso aponta para o nginx.
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://nginx',
        changeOrigin: true,
      },
      '/sanctum': {
        target: process.env.VITE_API_PROXY_TARGET ?? 'http://nginx',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
