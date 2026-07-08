import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [react(), visualizer({ open: process.env.REPORT === 'true', filename: 'dist/stats.html', gzipSize: true, brotliSize: true })],
  server: {
    port: 5173,
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) return 'vendor'
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) return 'i18n'
          if (id.includes('node_modules/leaflet')) return 'leaflet'
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) return 'charts'
          if (id.includes('node_modules/framer-motion')) return 'motion'
          if (id.includes('node_modules/socket.io-client')) return 'socket'
          if (id.includes('node_modules/lucide-react')) return 'icons'
        },
      },
      preserveEntrySignatures: 'allow-extension',
    },
    chunkSizeWarningLimit: 1000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.js'],
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/__tests__/**',
        'src/**/*.test.*',
        'src/**/*.spec.*',
        'src/main.tsx',
        'src/i18n/**',
        'src/styles/**',
      ],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
  },
})
