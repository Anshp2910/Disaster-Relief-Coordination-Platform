import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState, useMemo, useEffect, memo } from 'react'
import NotificationBell from './NotificationBell'
import { clientApi } from '../api/client'
import { useSocket } from '../hooks/useSocket'
import { useToast } from './Toast'
import { useAuth } from '../context/AuthContext'

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
  const { socket, connected } = useSocket()
  const toast = useToast()
  const { user: currentUser, isAuthenticated, logout: authLogout } = useAuth()

  function logout() {
    if (socket?.connected) {
      socket.disconnect()
    }
    localStorage.removeItem('notifications')
    authLogout()
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

  const navLinks = useMemo(() => isAuthenticated
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
  , [isAuthenticated, currentUser, t])

  const [sosLoading, setSosLoading] = useState(false)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode') === 'true'
    if (saved) document.documentElement.classList.add('dark')
    return saved
  })

  function toggleDarkMode() {
    const next = !darkMode
    setDarkMode(next)
    localStorage.setItem('darkMode', String(next))
    document.documentElement.classList.toggle('dark', next)
  }

  async function handleSOS() {
    if (!confirm(t('sos.confirm'))) return
    setSosLoading(true)
    try {
      await clientApi.broadcastSOS({ message: `${t('sos.from')} ${currentUser?.displayName || t('sos.user')}` })
      toast.success(t('sos.broadcastSuccess'))
    } catch (e) {
      toast.error(t('sos.broadcastFailed', { error: e.message }))
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
            aria-label={t('header.selectLanguage', 'Select Language')}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
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
          {isAuthenticated && (
            <div className="gov-nav-actions">
              <div
                title={connected ? 'Connected' : 'Disconnected'}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: connected ? 'var(--neon-green)' : 'var(--neon-red)',
                  flexShrink: 0,
                  boxShadow: connected ? '0 0 8px var(--neon-green)' : '0 0 8px var(--neon-red)',
                }}
              />
              <button
                onClick={toggleDarkMode}
                title={darkMode ? 'Light mode' : 'Dark mode'}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 16,
                  padding: '4px 8px',
                  borderRadius: 8,
                  transition: 'all 0.2s',
                }}
              >
                {darkMode ? '\u2600\uFE0F' : '\u{1F319}'}
              </button>
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
          {isAuthenticated && (
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

      {mobileMenuOpen && isAuthenticated && (
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
