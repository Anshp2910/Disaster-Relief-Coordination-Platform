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

function VersionChecker() {
  useVersionCheck()
  return null
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
    }).catch(() => {})
  }, [])
  return null
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

const root = document.getElementById('root')
if (root) {
  ReactDOM.createRoot(root).render(
    <ErrorBoundary>
      <React.StrictMode>
        <I18nextProvider i18n={i18n}>          <HashRouter future={routerFuture}>
            <ThemeProvider>
              <AuthProvider>
                <ToastProvider>
                  <VersionChecker />
                  <WebVitalsReporter />
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
