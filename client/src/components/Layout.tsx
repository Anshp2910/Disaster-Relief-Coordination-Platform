import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { NavBar } from './NavBar'
import { SosFab } from './SosFab'
import { useAuth } from '../context/AuthContext'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()

  return (
    <div className="gov-layout">
      <a href="#main-content" className="skip-link">
        {t('common.skipToContent')}
      </a>
      <NavBar />
      {isAuthenticated && <SosFab />}
      <main className="gov-main" id="main-content" role="main" aria-label={t('layout.mainContent')}>
        {children}
      </main>
      <footer className="gov-navbar-bottom">
        <div className="gov-navbar-bottom-inner">
          <span>&copy; {new Date().getFullYear()} {t('footer.appName')}</span>
          <span className="gov-navbar-bottom-links">
            <button type="button" className="link-as-button" onClick={(e) => e.preventDefault()}>{t('footer.privacy')}</button>
            <span className="gov-navbar-bottom-dot">&middot;</span>
            <button type="button" className="link-as-button" onClick={(e) => e.preventDefault()}>{t('footer.terms')}</button>
            <span className="gov-navbar-bottom-dot">&middot;</span>
            <span>{t('footer.emergencyHelpline')}: {t('footer.emergencyNumber')}</span>
          </span>
        </div>
      </footer>
    </div>
  )
}

export default Layout
