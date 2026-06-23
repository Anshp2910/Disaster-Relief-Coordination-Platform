import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18n from './i18n'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { ToastProvider } from './components/Toast'
import { AuthProvider } from './context/AuthContext'
import { useVersionCheck } from './hooks/useVersionCheck'
import 'leaflet/dist/leaflet.css'
import './styles.css'

function VersionChecker() {
  useVersionCheck()
  return null
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <HashRouter>
          <AuthProvider>
            <ToastProvider>
              <VersionChecker />
              <App />
            </ToastProvider>
          </AuthProvider>
        </HashRouter>
      </I18nextProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
