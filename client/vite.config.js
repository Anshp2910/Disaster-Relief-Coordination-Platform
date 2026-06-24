import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// To analyze bundle size, set ANALYZE=true and run `npm run build`
// Example: $env:ANALYZE='true'; npm run build
// Then open dist/stats.html in your browser
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          i18n: ['i18next', 'react-i18next'],
          leaflet: ['leaflet'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
