import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState, useMemo, memo } from 'react'
import NotificationBell from './NotificationBell'
import { clientApi } from '../api/client'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'kn', label: 'Kannada' },
  { code: 'pa', label: 'Punjabi' },
]

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const token = localStorage.getItem('token')
  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
  }, [])

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('notifications')
    navigate('/login')
    setMobileMenuOpen(false)
  }

  function changeLanguage(langCode) {
    i18n.changeLanguage(langCode)
    localStorage.setItem('language', langCode)
  }

  function handleNav(path) {
    navigate(path)
    setMobileMenuOpen(false)
  }

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'

  const navLinks = useMemo(() => token
    ? [
        { path: '/dashboard', label: t('nav.dashboard') },
        { path: '/map', label: t('nav.mapView') || 'Map View' },
        { path: '/zones', label: t('nav.zones') || 'Zones' },
        { path: '/resources', label: t('nav.resources') || 'Resources' },
        { path: '/incidents', label: t('nav.incidents') || 'Incidents' },
        { path: '/schedules', label: t('nav.schedules') || 'Schedules' },
        { path: '/geofencing', label: t('nav.geofencing') || 'Geofencing' },
        { path: '/requests/new', label: t('nav.newRequest') },
        ...(currentUser?.role === 'admin' ? [
          { path: '/admin', label: t('nav.admin') },
          { path: '/escalation', label: t('nav.escalation') || 'Escalation' },
          { path: '/bulk', label: t('nav.bulkImport') || 'Bulk' },
        ] : []),
      ]
    : []
  , [token, currentUser, t])

  const [sosLoading, setSosLoading] = useState(false)

  async function handleSOS() {
    if (!confirm(t('sos.confirm'))) return
    setSosLoading(true)
    try {
      await clientApi.broadcastSOS({ message: `${t('sos.from')} ${currentUser?.displayName || t('sos.user')}` })
      alert(t('sos.broadcastSuccess'))
    } catch (e) {
      alert(t('sos.broadcastFailed', { error: e.message }))
    } finally {
      setSosLoading(false)
    }
  }

  return (
    <header>
      <div className="gov-top-strip">
        <div className="gov-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="gov-top-strip-text">{t('topStrip')}</span>
          <select
            value={i18n.language}
            onChange={(e) => changeLanguage(e.target.value)}
            className="lang-select"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code} style={{ color: '#333' }}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="gov-header-main">
        <div className="gov-container" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src="/images/logo.svg" alt="Logo" className="gov-logo" />
          <div className="gov-title-group">
            <div className="gov-app-title">{t('appTitle')}</div>
            <div className="gov-app-subtitle">{t('appSubtitle')}</div>
          </div>
        </div>
      </div>

      {!isAuthPage && (
        <div className="gov-nav-bar">
          <nav className="gov-nav" style={{ flex: 1, overflowX: 'auto' }}>
            <div className="gov-nav-inner">
              {navLinks.map((link) => (
                <button
                  key={link.path}
                  onClick={() => handleNav(link.path)}
                  className={`gov-nav-link ${location.pathname === link.path ? 'active' : ''}`}
                >
                  {link.label}
                </button>
              ))}
            </div>
          </nav>
          {token && (
            <div className="gov-nav-actions">
              <NotificationBell />
              <button onClick={handleSOS} disabled={sosLoading} className="sos-btn">
                {sosLoading ? '...' : 'SOS'}
              </button>
              <button onClick={() => handleNav('/profile')} className="gov-nav-link gov-nav-link-user">
                {currentUser?.displayName || t('nav.profile')}
              </button>
              <button onClick={logout} className="gov-nav-link">
                {t('nav.logout')}
              </button>
            </div>
          )}
          {token && (
            <button
              className="gov-hamburger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? '\u2715' : '\u2630'}
            </button>
          )}
        </div>
      )}

      {mobileMenuOpen && token && (
        <div className="gov-mobile-menu">
          {navLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => handleNav(link.path)}
              className={`gov-mobile-link ${location.pathname === link.path ? 'active' : ''}`}
            >
              {link.label}
            </button>
          ))}
          <hr className="gov-mobile-divider" />
          <button onClick={() => handleNav('/profile')} className="gov-mobile-link">
            {currentUser?.displayName || t('nav.profile')}
          </button>
          <button onClick={logout} className="gov-mobile-link">
            {t('nav.logout')}
          </button>
        </div>
      )}
    </header>
  )
}
