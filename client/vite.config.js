import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'build-version',
      transformIndexHtml(html) {
        const timestamp = Date.now()
        return html.replace(
          '</head>',
          `<meta name="build-version" content="${timestamp}" />\n  </head>`
        )
      },
      generateBundle() {
        const timestamp = Date.now()
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ version: timestamp, buildTime: new Date().toISOString() }),
        })
      },
    },
  ],
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
  },
})
