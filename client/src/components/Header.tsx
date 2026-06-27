import { useNavigate, useLocation } from 'react-router-dom'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useSocket } from '../hooks/useSocket'
import { useEffect } from 'react'
import { Sun, Moon, Search, User, LogOut, Info } from 'lucide-react'
import { IconLazy } from './ui/IconLazy'
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

function Header() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const toggleMenu = () => setMenuOpen(!menuOpen);
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const { user: currentUser, isAuthenticated, isAdmin, logout: authLogout } = useAuth()
  const { theme, toggleTheme, togglePremiumTheme, isPremium, isEmergency, toggleEmergency } = useTheme()
  const { socket } = useSocket()
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'

  function changeLanguage(langCode: string) {
    i18n.changeLanguage(langCode)
    try { localStorage.setItem('language', langCode) } catch {}
  }

  function openKeyboardHints() {
    const hints = document.getElementById('keyboard-hints-emergency')
    if (hints) {
      hints.classList.add('active')
      setTimeout(() => hints.classList.remove('active'), 4000)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'H') {
        e.preventDefault()
        openKeyboardHints()
      }
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

  return (
    <header role="banner">
        {/* Mobile hamburger – visible on small screens */}
        <button
          className="icon-btn md:hidden"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={toggleMenu}
        >
          {/* Simple three-line icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {menuOpen ? (
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>

      <div className={`gov-top-strip ${menuOpen ? 'block' : 'hidden'} md:block`}>
        <div className="container flex-between">
          <span className="gov-top-strip-text">{t('topStrip')}</span>
          <div className="flex flex-gap-sm items-center">
            <div className="relative" style={{ minWidth: '150px' }}>
              <select
                value={i18n.language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="lang-select w-full appearance-none font-medium"
                aria-label={t('header.selectLanguage')}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-[--bg-card] text-[--text]">
                    {l.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                  <path d="M1 1l5 5 5-5" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <div className="ml-4 hidden md:block">
              <div className="text-xs text-[--text-muted] font-medium mb-1">
                🌐 {LANGUAGES.find(l => l.code === i18n.language)?.label}
              </div>
              <div className="text-[--accent] text-xs font-semibold">
                {i18n.language.toUpperCase()}
              </div>
            </div>
            <button 
              onClick={toggleEmergency}
              className={`theme-toggle relative ${isEmergency ? 'border-[--danger] bg-[--danger-50]' : ''}`}
              aria-label={isEmergency ? 'Disable emergency mode' : 'Activate emergency mode'}
              title={isEmergency ? 'Emergency Mode Active (Alt+E to disable)' : 'Emergency Mode (Alt+E to activate)'}
            >
              <IconLazy importPath='lucide-react' name='AlertTriangle' size={14} className={isEmergency ? 'text-[--danger]' : 'text-[--warning]'} aria-hidden='true' />
              {isEmergency && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-[--danger] rounded-full animate-pulse" />
              )}
            </button>
            <button 
              onClick={openKeyboardHints}
              className="theme-toggle"
              aria-label="Show keyboard shortcuts"
              title="Keyboard shortcuts (Ctrl+Shift+H)"
            >
              <Info size={14} className="text-[--text-muted]" aria-hidden="true" />
            </button>
            <button onClick={toggleTheme} className="theme-toggle" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`} title={theme === 'light' ? 'Dark mode' : 'Light mode'}>
              {theme === 'light' ? <Moon size={14} aria-hidden="true" /> : <Sun size={14} aria-hidden="true" />}
            </button>
            {/* Premium Neon Theme Toggle */}
            <button onClick={togglePremiumTheme} className={`theme-toggle ${isPremium ? 'neon-active' : ''}`} aria-label={isPremium ? 'Disable premium neon theme' : 'Enable premium neon theme'} title={isPremium ? 'Premium Neon Theme (Alt+N to disable)' : 'Premium Neon Theme (Alt+N to enable)'}>
              <Zap size={14} className="text-[--accent]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="gov-header-main">
        <div className={`container gov-header-inner ${menuOpen ? 'block' : 'hidden'} md:flex`}>
          <div className="gov-logo-wrapper">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="gov-logo" aria-hidden="true">
              <rect width="40" height="40" rx="10" fill="var(--accent)" />
              <path d="M20 8a2 2 0 0 1 2 2v18a2 2 0 0 1-4 0V10a2 2 0 0 1 2-2z" fill="white" />
              <path d="M12 16a2 2 0 0 1 2 2v10a2 2 0 0 1-4 0V18a2 2 0 0 1 2-2z" fill="white" opacity="0.8" />
              <path d="M28 12a2 2 0 0 1 2 2v14a2 2 0 0 1-4 0V14a2 2 0 0 1 2-2z" fill="white" opacity="0.9" />
              <circle cx="20" cy="20" r="6" fill="rgba(255,255,255,0.2)" />
              <circle cx="20" cy="20" r="3" fill="white" />
            </svg>
          </div>
          <div className="gov-title-group">
            <div className="gov-app-title">{t('appTitle')}</div>
            <div className="gov-app-subtitle">{t('appSubtitle')}</div>
          </div>
          <div className="flex-1" />
          {isAuthenticated && !isAuthPage && (
            <nav aria-label="Main navigation" className="gov-header-actions">
              <button
                className="cmd-hint"
                onClick={() => window.dispatchEvent(new CustomEvent('toggle-cmd-palette'))}
                aria-label="Open command palette"
                title="Open command palette - Press Ctrl+K"
              >
                <Search size={12} aria-hidden="true" />
                <kbd>Ctrl+K</kbd>
                <span className="sr-only">- Command Palette</span>
              </button>
              <NotificationBell />
              {isAdmin && (
                <button onClick={() => navigate('/admin')} className="gov-nav-link-user header-user-btn" aria-current={location.pathname.startsWith('/admin') ? 'page' : undefined} title={t('nav.adminDashboard')}>
                  <span className="header-user-name" style={{ color: 'var(--accent)' }}>Admin</span>
                </button>
              )}
              <button onClick={() => navigate('/profile')} className="gov-nav-link-user header-user-btn" aria-current={location.pathname === '/profile' ? 'page' : undefined}>
                <User size={16} aria-hidden="true" />
                <span className="header-user-name">{currentUser?.displayName || t('nav.profile')}</span>
              </button>
              <button onClick={() => {
                if (socket?.connected) socket.disconnect()
                authLogout()
                navigate('/login')
              }} className="header-icon-btn" aria-label={t('nav.logout')} title={t('nav.logout')}>
                <LogOut size={16} aria-hidden="true" />
              </button>
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}
export { Header }
