import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import NotificationBell from './NotificationBell'
import { clientApi } from '../api/client'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'mr', label: 'मराठी' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
]

function LogoMark() {
  return (
    <img src="/images/logo.svg" alt="Logo" style={{ height: 48, width: 'auto' }} />
  )
}

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()

  const token = localStorage.getItem('token')
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
  })()

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('notifications')
    navigate('/login')
  }

  function changeLanguage(langCode) {
    i18n.changeLanguage(langCode)
    localStorage.setItem('language', langCode)
  }

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'

  const navLinks = token
    ? [
        { path: '/dashboard', label: t('nav.dashboard') },
        { path: '/zones', label: t('nav.zones') || 'Zones' },
        { path: '/resources', label: t('nav.resources') || 'Resources' },
        { path: '/incidents', label: t('nav.incidents') || 'Incidents' },
        { path: '/schedules', label: t('nav.schedules') || 'Schedules' },
        { path: '/geofencing', label: t('nav.geofencing') || 'Geofencing' },
        { path: '/bulk', label: t('nav.bulkImport') || 'Bulk' },
        { path: '/requests/new', label: t('nav.newRequest') },
        ...(currentUser?.role === 'admin' ? [
          { path: '/admin', label: t('nav.admin') },
          { path: '/escalation', label: t('nav.escalation') || 'Escalation' },
        ] : []),
      ]
    : []

  const [sosLoading, setSosLoading] = useState(false)

  async function handleSOS() {
    if (!confirm('Send SOS emergency alert to all connected users?')) return
    setSosLoading(true)
    try {
      await clientApi.broadcastSOS({ message: `SOS from ${currentUser?.displayName || 'User'}` })
      alert('SOS alert broadcasted!')
    } catch (e) {
      alert('Failed: ' + e.message)
    } finally {
      setSosLoading(false)
    }
  }

  return (
    <header>
      <div className="gov-top-strip">
        <div className="gov-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#ccc' }}>{t('topStrip')}</span>
          <select
            value={i18n.language}
            onChange={(e) => changeLanguage(e.target.value)}
            style={{
              fontSize: 12, background: 'transparent', color: '#ccc',
              border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4,
              padding: '2px 6px', cursor: 'pointer',
            }}
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
          <LogoMark />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#000080', lineHeight: 1.2 }}>
              {t('appTitle')}
            </div>
            <div style={{ fontSize: 12, color: '#555', letterSpacing: 0.5 }}>
              {t('appSubtitle')}
            </div>
          </div>
        </div>
      </div>

      {!isAuthPage && (
        <div style={{ background: 'var(--gov-blue)', display: 'flex', alignItems: 'stretch' }}>
          <nav className="gov-nav" style={{ flex: 1, overflowX: 'auto' }}>
            <div className="gov-nav-inner">
              {navLinks.map((link) => (
                <button
                  key={link.path}
                  onClick={() => navigate(link.path)}
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
              <button
                onClick={handleSOS}
                disabled={sosLoading}
                className="sos-btn"
              >
                {sosLoading ? '...' : 'SOS'}
              </button>
              <button onClick={() => navigate('/profile')} className="gov-nav-link">
                {currentUser?.displayName || t('nav.profile')}
              </button>
              <button onClick={logout} className="gov-nav-link">
                {t('nav.logout')}
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
