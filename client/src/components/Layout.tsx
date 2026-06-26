import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { RippleBtn } from '../components/ui'
import { Header } from './Header'
import { Footer } from './Footer'
import { CommandPalette } from './CommandPalette'
import { SosFab } from './SosFab'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { useAuth } from '../context/AuthContext'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const { canInstall, install } = usePwaInstall()
  const [dismissed, setDismissed] = useState(false)
  const { isAdmin, isAuthenticated } = useAuth()

  return (
    <div className="gov-layout">
      <a href="#main-content" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <Header />
      <CommandPalette isAdmin={isAdmin} />
      {isAuthenticated && <SosFab />}
      <motion.main className="gov-main" id="main-content" role="main" aria-label="Main content">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </motion.main>
      <Footer />
      {canInstall && !dismissed && (
        <motion.div
          className="pwa-install-banner"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="pwa-install-text">{t('common.installApp')}</span>
          <RippleBtn onClick={install} className="pwa-install-btn">{t('common.install')}</RippleBtn>
          <button onClick={() => setDismissed(true)} className="pwa-dismiss-btn" aria-label="Dismiss install banner">&times;</button>
        </motion.div>
      )}
    </div>
  )
}

export default Layout
