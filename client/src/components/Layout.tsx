import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { NavBar } from './NavBar'
import { SosFab } from './SosFab'
import Breadcrumbs from './Breadcrumbs'
import { useAuth } from '../context/AuthContext'
import { useLocation } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || 
    location.pathname === '/forgot-password' || location.pathname === '/reset-password'

  return (
    <div className="gov-layout">
      <a href="#main-content" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <NavBar />
      {isAuthenticated && <SosFab />}
      <main className="gov-main" id="main-content" role="main" aria-label={t('layout.mainContent')}>
        {isAuthenticated && !isAuthPage && <div className="container"><Breadcrumbs /></div>}
        {children}
      </main>
      <footer className="gov-navbar-bottom">
        <div className="gov-navbar-bottom-inner">
          <span>&copy; {new Date().getFullYear()} {t('footer.appName')}</span>
          <span className="gov-navbar-bottom-links">
            <a href="/privacy" className="link-as-button">{t('footer.privacy')}</a>
            <span className="gov-navbar-bottom-dot">&middot;</span>
            <a href="/terms" className="link-as-button">{t('footer.terms')}</a>
            <span className="gov-navbar-bottom-dot">&middot;</span>
            <span>{t('footer.emergencyHelpline')}: {t('footer.emergencyNumber')}</span>
          </span>
        </div>
      </footer>
    </div>
  )
}

export default Layout
