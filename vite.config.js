import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/cases':   { target: 'http://localhost:3001', changeOrigin: true },
      '/scripts': { target: 'http://localhost:3001', changeOrigin: true },
      '/upload':  { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
})
