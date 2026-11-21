import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Served from https://<user>.github.io/rubik-academy/ in production
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/rubik-academy/' : '/',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1200 },
}))
