import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { NavBar } from './NavBar'
import { CommandPalette } from './CommandPalette'
import { SosFab } from './SosFab'
import { useAuth } from '../context/AuthContext'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const { isAdmin, isAuthenticated } = useAuth()

  return (
    <div className="gov-layout">
      <a href="#main-content" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <NavBar />
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
      <footer className="gov-navbar-bottom">
        <div className="gov-navbar-bottom-inner">
          <span>&copy; {new Date().getFullYear()} Disaster Relief Coordination Platform</span>
          <span className="gov-navbar-bottom-links">
            <a href="#" onClick={(e) => e.preventDefault()}>Privacy</a>
            <span className="gov-navbar-bottom-dot">&middot;</span>
            <a href="#" onClick={(e) => e.preventDefault()}>Terms</a>
            <span className="gov-navbar-bottom-dot">&middot;</span>
            <span>{t('footer.emergencyHelpline')}: 112</span>
          </span>
        </div>
      </footer>
    </div>
  )
}

export default Layout
