import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState, useMemo, useEffect, memo } from 'react'
import NotificationBell from './NotificationBell'
import { clientApi } from '../api/client'
import { useSocket } from '../hooks/useSocket'
import { useToast } from './Toast'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    function goOnline() { setOnline(true) }
    function goOffline() { setOnline(false) }
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])
  return online
}

function safeGetItem(key) {
  try { return localStorage.getItem(key) } catch { return null }
}
function safeSetItem(key, value) {
  try { localStorage.setItem(key, value) } catch {}
}
function safeRemoveItem(key) {
  try { localStorage.removeItem(key) } catch {}
}

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
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const { socket, connected } = useSocket()
  const toast = useToast()
  const { user: currentUser, isAuthenticated, logout: authLogout } = useAuth()
  const online = useOnlineStatus()

  function logout() {
    if (socket?.connected) {
      socket.disconnect()
    }
    safeRemoveItem('notifications')
    authLogout()
    navigate('/login')
    setMobileMenuOpen(false)
    setShowLogoutConfirm(false)
  }

  function confirmLogout() {
    setShowLogoutConfirm(true)
  }

  function changeLanguage(langCode) {
    i18n.changeLanguage(langCode)
    safeSetItem('language', langCode)
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
  const { mode: themeMode, setTheme } = useTheme()

  function cycleTheme() {
    const order = ['system', 'dark', 'light']
    const next = order[(order.indexOf(themeMode) + 1) % order.length]
    setTheme(next)
  }

  const themeIcon = themeMode === 'system' ? '\u{1F310}' : themeMode === 'dark' ? '\u{1F319}' : '\u2600\uFE0F'
  const themeLabel = themeMode === 'system' ? 'Auto (System)' : themeMode === 'dark' ? 'Dark mode' : 'Light mode'

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
      {!online && (
        <div className="offline-banner">
          You are offline — some features may be unavailable
        </div>
      )}
      <div className="gov-top-strip">
        <div className="gov-container flex-between">
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
        <div className="gov-container flex flex-gap-lg">
          <img src="/images/logo.svg" alt="Logo" className="gov-logo" />
          <div className="gov-title-group">
            <div className="gov-app-title">{t('appTitle')}</div>
            <div className="gov-app-subtitle">{t('appSubtitle')}</div>
          </div>
        </div>
      </div>

      {!isAuthPage && (
        <div className="gov-nav-bar">
          <nav className="gov-nav flex-1 overflow-x-auto">
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
                title={!online ? 'Offline' : connected ? 'Connected' : 'Disconnected'}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: !online ? 'var(--accent-red)' : connected ? 'var(--accent-green)' : '#eab308',
                  flexShrink: 0,
                  boxShadow: !online ? '0 0 8px var(--accent-red)' : connected ? '0 0 8px var(--accent-green)' : '0 0 8px #eab308',
                }}
              />
              <button
                onClick={cycleTheme}
                title={themeLabel}
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
                {themeIcon}
              </button>
              <NotificationBell />
              <button onClick={handleSOS} disabled={sosLoading} className="sos-btn">
                {sosLoading ? '...' : 'SOS'}
              </button>
              <button onClick={() => handleNav('/profile')} className="gov-nav-link gov-nav-link-user">
                {currentUser?.displayName || t('nav.profile')}
              </button>
              <button onClick={confirmLogout} className="gov-nav-link">
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
          <button onClick={confirmLogout} className="gov-mobile-link">
            {t('nav.logout')}
          </button>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="modal-card text-center" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">
              <svg width="40" height="40" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logoutEmblem" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4a80c0" />
                    <stop offset="100%" stopColor="#6b7fb5" />
                  </linearGradient>
                </defs>
                <circle cx="28" cy="28" r="25" stroke="url(#logoutEmblem)" strokeWidth="2" fill="none" opacity="0.6" />
                <circle cx="28" cy="28" r="18" stroke="url(#logoutEmblem)" strokeWidth="1" fill="none" opacity="0.3" />
                <circle cx="28" cy="28" r="5" fill="url(#logoutEmblem)" />
                {[...Array(24)].map((_, i) => {
                  const angle = (i * 15 * Math.PI) / 180
                  return (
                    <line key={i} x1={28} y1={28} x2={28 + 22 * Math.sin(angle)} y2={28 - 22 * Math.cos(angle)} stroke="url(#logoutEmblem)" strokeWidth="0.8" opacity="0.4" />
                  )
                })}
              </svg>
            </div>
            <h3 className="modal-title">{t('nav.logout')}</h3>
            <p className="modal-desc">{t('nav.logoutConfirm')}</p>
            <div className="modal-actions">
              <button onClick={logout} className="btn btn-danger">{t('nav.logout')}</button>
              <button onClick={() => setShowLogoutConfirm(false)} className="btn">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
