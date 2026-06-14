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
    navigate('/login')
  }

  function changeLanguage(langCode) {
    i18n.changeLanguage(langCode)
    localStorage.setItem('language', langCode)
  }

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
    : [
        { path: '/login', label: t('nav.login') },
        { path: '/register', label: t('nav.register') },
      ]

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

      <nav className="gov-nav">
        <div className="gov-container" style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {navLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`gov-nav-link ${location.pathname === link.path ? 'active' : ''}`}
            >
              {link.label}
            </button>
          ))}
          {token && (
            <>
              <NotificationBell />
              <button
                onClick={handleSOS}
                disabled={sosLoading}
                style={{ background: '#cc0000', color: 'white', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5 }}
              >
                {sosLoading ? '...' : 'SOS'}
              </button>
              <button onClick={() => navigate('/profile')} className="gov-nav-link">
                {currentUser?.displayName || t('nav.profile')}
              </button>
              <button onClick={logout} className="gov-nav-link">
                {t('nav.logout')}
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
