import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useSocket } from '../hooks/useSocket'
import { useConfirm } from '../hooks/useConfirm'
import { clientApi } from '../api/client'
import { useToast } from './Toast'
import NotificationBell from './NotificationBell'

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
  { code: 'ur', label: 'اردو' },
]

export default function Header({ onToggleSidebar }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const { user: currentUser, isAuthenticated, logout: authLogout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { socket } = useSocket()
  const toast = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const [sosLoading, setSosLoading] = useState(false)
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'

  function changeLanguage(langCode) {
    i18n.changeLanguage(langCode)
    try { localStorage.setItem('language', langCode) } catch {}
  }

  async function handleSOS() {
    const ok = await confirm({ message: t('sos.confirm'), danger: true })
    if (!ok) return
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
    <header role="banner">

      <div className="gov-top-strip">
        <div className="gov-container flex-between">
          <span className="gov-top-strip-text">{t('topStrip')}</span>
          <div className="flex flex-gap-sm items-center">
            <select
              value={i18n.language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="lang-select"
              aria-label={t('header.selectLanguage')}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <button onClick={toggleTheme} className="theme-toggle" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title={theme === 'light' ? 'Dark mode' : 'Light mode'}>
              {theme === 'light' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="gov-header-main">
        <div className="gov-container flex flex-gap-lg">
          {isAuthenticated && onToggleSidebar && (
            <button onClick={onToggleSidebar} className="gov-hamburger" aria-label={t('common.toggleMenu')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            </button>
          )}
          <img src="/images/logo.svg" alt="Logo" className="gov-logo" />
          <div className="gov-title-group">
            <div className="gov-app-title">{t('appTitle')}</div>
            <div className="gov-app-subtitle">{t('appSubtitle')}</div>
          </div>
          <div className="flex-1" />
          {isAuthenticated && !isAuthPage && (
            <div className="gov-header-actions">
              <NotificationBell />
              <button onClick={handleSOS} disabled={sosLoading} className="sos-btn">{sosLoading ? '...' : 'SOS'}</button>
              <button onClick={() => navigate('/profile')} className="gov-nav-link-user header-user-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span className="header-user-name">{currentUser?.displayName || t('nav.profile')}</span>
              </button>
              <button onClick={() => {
                if (socket?.connected) socket.disconnect()
                authLogout()
                navigate('/login')
              }} className="header-icon-btn" aria-label={t('nav.logout')} title={t('nav.logout')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {ConfirmDialog}
    </header>
  )
}
