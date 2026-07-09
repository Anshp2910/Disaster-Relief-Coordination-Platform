import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'

const routerFuture = {
  v7_startTransition: false,
  v7_relativeSplatPath: true,
}
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n'
import { App } from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { useVersionCheck } from './hooks/useVersionCheck'
// Leaflet CSS is loaded dynamically in mapInit.js to avoid blocking non-map pages
import './styles/index.css'

function UpdateBanner() {
  const { hasUpdate, applyUpdate } = useVersionCheck()
  return (
    hasUpdate ? (
      <div
        role="alert"
        aria-live="polite"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 99999,
          background: 'var(--accent, #3b82f6)',
          color: '#fff',
          padding: '8px 16px',
          textAlign: 'center',
          fontSize: 14,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        <span>A new version is available</span>
        <button
          onClick={(e) => { e.stopPropagation(); applyUpdate() }}
          style={{
            background: '#fff',
            color: 'var(--accent, #3b82f6)',
            border: 'none',
            borderRadius: 4,
            padding: '4px 12px',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Refresh now
        </button>
      </div>
    ) : null
  )
}

function WebVitalsReporter() {
  const { useEffect } = React
  useEffect(() => {
    import('./utils/reportWebVitals').then(({ reportWebVitals }) => {
      reportWebVitals((metric: unknown) => {
        const m = metric as { name: string; value: number }
        if (m.name === 'LCP' || m.name === 'FID' || m.name === 'CLS') {
          console.warn('[web-vital]', m.name, m.value)
        }
      })
    }).catch(() => { console.warn('[web-vitals] reportWebVitals import failed') })
  }, [])
  return null
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { console.warn('[sw] ServiceWorker registration failed') })
  })
}

const root = document.getElementById('root')
if (root) {
  ReactDOM.createRoot(root).render(
    <ErrorBoundary>
      <React.StrictMode>
        <I18nextProvider i18n={i18n}>
          <HashRouter future={routerFuture}>
            <ThemeProvider>
              <AuthProvider>
                <ToastProvider>
                  <UpdateBanner />
                  {import.meta.env.DEV && <WebVitalsReporter />}
                  <App />
                </ToastProvider>
              </AuthProvider>
            </ThemeProvider>
          </HashRouter>
        </I18nextProvider>
      </React.StrictMode>
    </ErrorBoundary>,
  )
}
