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
    <span className="gov-footer-copy">&copy; 2026 Disaster Relief Coordination Platform</span>
    <div className="gov-footer-links">
      <div className="gov-footer-legal">
        <a href="/privacy" className="link-as-button">{t('footer.privacy')}</a>
        <span className="gov-navbar-bottom-dot" aria-hidden="true">&middot;</span>
        <a href="/terms" className="link-as-button">{t('footer.terms')}</a>
      </div>
      <div className="gov-footer-helplines">
        <span className="helpline"><strong>112</strong> Emergency</span>
        <span className="helpline-divider" aria-hidden="true">|</span>
        <span className="helpline"><strong>108</strong> Ambulance</span>
        <span className="helpline-divider" aria-hidden="true">|</span>
        <span className="helpline"><strong>102</strong> Fire</span>
      </div>
    </div>
  </div>
</footer>
    </div>
  )
}

export default Layout
