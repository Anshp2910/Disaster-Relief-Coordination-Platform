import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Header from './Header'
import Footer from './Footer'
import CommandPalette from './CommandPalette'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }) {
  const { t } = useTranslation()
  const { canInstall, install } = usePwaInstall()
  const [dismissed, setDismissed] = useState(false)
  const { isAdmin } = useAuth()

  return (
    <div className="gov-layout">
      <a href="#main-content" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <Header />
      <CommandPalette isAdmin={isAdmin} />
      <main className="gov-main" id="main-content">
        {children}
      </main>
      <Footer />
      {canInstall && !dismissed && (
        <div className="pwa-install-banner">
          <span className="pwa-install-text">{t('common.installApp')}</span>
          <button onClick={install} className="btnPrimary pwa-install-btn">{t('common.install')}</button>
          <button onClick={() => setDismissed(true)} className="pwa-dismiss-btn">&times;</button>
        </div>
      )}
    </div>
  )
}
