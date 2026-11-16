import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  test: {
    // The backend has its own suite (backend/), run from that folder.
    include: ['src/**/*.test.{js,jsx}'],
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})