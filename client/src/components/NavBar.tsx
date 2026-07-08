import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { FeatureNav } from './FeatureNav'
import { NavControls } from './NavControls'

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const { toggleEmergency, togglePremiumTheme } = useTheme()

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'E') {
        e.preventDefault()
        toggleEmergency()
      }
      if (e.altKey && e.key === 'N') {
        e.preventDefault()
        togglePremiumTheme()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [toggleEmergency, togglePremiumTheme])

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'
  const showNav = isAuthenticated && !isAuthPage

  return (
    <nav className="gov-navbar" role="navigation" aria-label={t('nav.mainNavigation')}>
      <div className="gov-navbar-inner">
        {/* ─── Logo + Title ─── */}
        <button
          className="gov-navbar-brand"
          onClick={() => { navigate('/dashboard') }}
          aria-label={t('nav.dashboard')}
        >
          <svg width="32" height="32" viewBox="0 0 40 40" fill="none" className="gov-navbar-logo" aria-hidden="true">
            <rect width="40" height="40" rx="10" fill="var(--accent)" />
            <path d="M20 8a2 2 0 0 1 2 2v18a2 2 0 0 1-4 0V10a2 2 0 0 1 2-2z" fill="white" />
            <path d="M12 16a2 2 0 0 1 2 2v10a2 2 0 0 1-4 0V18a2 2 0 0 1 2-2z" fill="white" opacity="0.8" />
            <path d="M28 12a2 2 0 0 1 2 2v14a2 2 0 0 1-4 0V14a2 2 0 0 1 2-2z" fill="white" opacity="0.9" />
          </svg>
          <div className="gov-navbar-title-group">
            <div className="gov-navbar-title">{t('appTitle')}</div>
          </div>
        </button>

        <FeatureNav showNav={showNav} />

        <NavControls
          onToggleMenu={() => setMenuOpen(!menuOpen)}
          menuOpen={menuOpen}
          showNav={showNav}
        />
      </div>

      {menuOpen && showNav && (
        <div className="gov-navbar-mobile" id="mobile-menu" role="region" aria-label={t('nav.mobileNavigation')}>
          <FeatureNav mobile />
          <NavControls mobile onToggleMenu={() => setMenuOpen(!menuOpen)} menuOpen={menuOpen} showNav={showNav} />
        </div>
      )}
    </nav>
  )
}
