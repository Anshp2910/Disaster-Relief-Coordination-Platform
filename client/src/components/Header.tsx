import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useSocket } from '../hooks/useSocket'
import { Sun, Moon, Search, User, LogOut } from 'lucide-react'
import NotificationBell from './NotificationBell'

interface Language {
  code: string
  label: string
}

const LANGUAGES: Language[] = [
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

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const { user: currentUser, isAuthenticated, logout: authLogout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { socket } = useSocket()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'

  function changeLanguage(langCode: string) {
    i18n.changeLanguage(langCode)
    try { localStorage.setItem('language', langCode) } catch {}
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
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>
          </div>
        </div>
      </div>

      <div className="gov-header-main">
        <div className="gov-container flex flex-gap-lg">
          <img src="/images/logo.svg" alt="" className="gov-logo" />
          <div className="gov-title-group">
            <div className="gov-app-title">{t('appTitle')}</div>
            <div className="gov-app-subtitle">{t('appSubtitle')}</div>
          </div>
          <div className="flex-1" />
          {isAuthenticated && !isAuthPage && (
            <div className="gov-header-actions">
              <button
                className="cmd-hint"
                onClick={() => window.dispatchEvent(new CustomEvent('toggle-cmd-palette'))}
                aria-label="Open command palette"
                title="Open command palette"
              >
                <Search size={12} />
                <kbd>Ctrl+K</kbd>
              </button>
              <NotificationBell />
              <button onClick={() => navigate('/profile')} className="gov-nav-link-user header-user-btn">
                <User size={16} />
                <span className="header-user-name">{currentUser?.displayName || t('nav.profile')}</span>
              </button>
              <button onClick={() => {
                if (socket?.connected) socket.disconnect()
                authLogout()
                navigate('/login')
              }} className="header-icon-btn" aria-label={t('nav.logout')} title={t('nav.logout')}>
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
