import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Sun, Moon, User, LogOut, AlertTriangle, Zap, Menu, X } from 'lucide-react'
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

interface NavControlsProps {
  mobile?: boolean
  onToggleMenu: () => void
  menuOpen: boolean
  showNav: boolean
}

export function NavControls({ mobile = false, onToggleMenu, menuOpen, showNav }: NavControlsProps) {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { user: currentUser, logout: authLogout } = useAuth()
  const { theme, toggleTheme, togglePremiumTheme, isPremium, isEmergency, toggleEmergency } = useTheme()

  function changeLanguage(langCode: string) {
    i18n.changeLanguage(langCode)
    try { localStorage.setItem('language', langCode) } catch { /* noop */ }
  }

  if (mobile) {
    return (
      <>
        <div className="gov-navbar-mobile-divider" />
        <div className="gov-navbar-mobile-section-label">{t('nav.settings')}</div>
        <div className="gov-navbar-mobile-controls">
          <div className="gov-navbar-lang">
            <select
              value={i18n.language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="gov-navbar-lang-select"
              aria-label={t('header.selectLanguage')}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
          <div className="gov-navbar-mobile-theme">
            <button onClick={toggleTheme} className="gov-navbar-tool-btn" aria-label={t('nav.toggleTheme')}>
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>
            <button onClick={togglePremiumTheme} className={`gov-navbar-tool-btn ${isPremium ? 'premium-active' : ''}`} aria-label={t('nav.togglePremiumTheme')} title={t('nav.premiumThemeHint')}>
              <Zap size={14} />
            </button>
            <button onClick={toggleEmergency} className={`gov-navbar-tool-btn ${isEmergency ? 'emergency-active' : ''}`} aria-label={isEmergency ? t('nav.disableEmergencyMode') : t('nav.activateEmergencyMode')} title={t('nav.emergencyModeHint')}>
              <AlertTriangle size={14} />
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="gov-navbar-controls">
      {showNav && (
        <>
          <div className="gov-navbar-btn-group">
            <div className="gov-navbar-lang">
              <select
                value={i18n.language}
                onChange={(e) => changeLanguage(e.target.value)}
                className="gov-navbar-lang-select"
                aria-label={t('header.selectLanguage')}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="gov-navbar-divider" />

          <div className="gov-navbar-btn-group">
            <button
              onClick={toggleTheme}
              className="gov-navbar-tool-btn"
              aria-label={t('nav.switchTo', { mode: theme === 'light' ? t('nav.darkMode') : t('nav.lightMode') })}
              title={theme === 'light' ? t('nav.darkMode') : t('nav.lightMode')}
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>
            <button
              onClick={togglePremiumTheme}
              className={`gov-navbar-tool-btn ${isPremium ? 'premium-active' : ''}`}
              aria-label={isPremium ? t('nav.disablePremiumTheme') : t('nav.activatePremiumTheme')}
              title={t('nav.premiumThemeHint')}
            >
              <Zap size={14} />
            </button>
            <button
              onClick={toggleEmergency}
              className={`gov-navbar-tool-btn ${isEmergency ? 'emergency-active' : ''}`}
              aria-label={isEmergency ? t('nav.disableEmergencyMode') : t('nav.activateEmergencyMode')}
              title={t('nav.emergencyModeHint')}
            >
              <AlertTriangle size={14} />
              {isEmergency && <span className="gov-navbar-emergency-dot" />}
            </button>
          </div>

          <div className="gov-navbar-divider" />

          <div className="gov-navbar-btn-group">
            <NotificationBell />
            <button
              onClick={() => { navigate('/profile') }}
              className="gov-navbar-user-btn"
              aria-label={t('nav.profile')}
              title={currentUser?.displayName || t('nav.profile')}
            >
              <User size={16} />
              <span className="gov-navbar-user-name">{currentUser?.displayName?.split(' ')[0] || t('nav.profile')}</span>
            </button>
            <button
              onClick={() => {
                authLogout()
                navigate('/login')
              }}
              className="gov-navbar-tool-btn"
              aria-label={t('nav.logout')}
              title={t('nav.logout')}
            >
              <LogOut size={14} />
            </button>
          </div>
        </>
      )}

      <button
        className="gov-navbar-hamburger"
        onClick={onToggleMenu}
        aria-expanded={menuOpen}
        aria-controls="mobile-menu"
        aria-label={menuOpen ? t('nav.closeMenu') : t('nav.openMenu')}
      >
        {menuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
    </div>
  )
}
