import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n'
import App from './App'
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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <ThemeProvider>
          <HashRouter>
            <AuthProvider>
              <ToastProvider>
                <VersionChecker />
                <App />
              </ToastProvider>
            </AuthProvider>
          </HashRouter>
        </ThemeProvider>
      </I18nextProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
