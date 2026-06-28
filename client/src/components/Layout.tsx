import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { NavBar } from './NavBar'
import { CommandPalette } from './CommandPalette'
import { SosFab } from './SosFab'
import { useAuth } from '../context/AuthContext'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const { t } = useTranslation()
  const { isAdmin, isAuthenticated } = useAuth()

  return (
    <div className="gov-layout">
      <a href="#main-content" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <NavBar />
      <CommandPalette isAdmin={isAdmin} />
      {isAuthenticated && <SosFab />}
      <main className="gov-main" id="main-content" role="main" aria-label="Main content">
        {children}
      </main>
      <footer className="gov-navbar-bottom">
        <div className="gov-navbar-bottom-inner">
          <span>&copy; {new Date().getFullYear()} Disaster Relief Coordination Platform</span>
          <span className="gov-navbar-bottom-links">
            <a href="#" onClick={(e) => e.preventDefault()}>{t('footer.privacy')}</a>
            <span className="gov-navbar-bottom-dot">&middot;</span>
            <a href="#" onClick={(e) => e.preventDefault()}>{t('footer.terms')}</a>
            <span className="gov-navbar-bottom-dot">&middot;</span>
            <span>{t('footer.emergencyHelpline')}: 112</span>
          </span>
        </div>
      </footer>
    </div>
  )
}

export default Layout
