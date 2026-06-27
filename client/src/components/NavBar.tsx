import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useSocket } from '../hooks/useSocket'
import {
  Sun, Moon, Search, User, LogOut, AlertTriangle, Zap,
  LayoutDashboard, Map, Package, MapPin, PlusSquare,
  Shield, Menu, X
} from 'lucide-react'
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

interface NavLink {
  path: string
  labelKey: string
  fallback: string
  icon: React.ReactNode
  admin?: boolean
}

const NAV_LINKS: NavLink[] = [
  { path: '/dashboard', labelKey: 'nav.dashboard', fallback: 'Dashboard', icon: <LayoutDashboard size={16} /> },
  { path: '/map', labelKey: 'nav.mapView', fallback: 'Map', icon: <Map size={16} /> },
  { path: '/resources', labelKey: 'nav.resources', fallback: 'Resources', icon: <Package size={16} /> },
  { path: '/zones', labelKey: 'nav.zones', fallback: 'Zones', icon: <MapPin size={16} /> },
  { path: '/incidents', labelKey: 'nav.incidents', fallback: 'Incidents', icon: <AlertTriangle size={16} /> },
  { path: '/requests/new', labelKey: 'nav.newRequest', fallback: 'New Request', icon: <PlusSquare size={16} /> },
  { path: '/admin', labelKey: 'nav.admin', fallback: 'Admin', icon: <Shield size={16} />, admin: true },
]

export function NavBar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const { user: currentUser, isAuthenticated, isAdmin, logout: authLogout } = useAuth()
  const { theme, toggleTheme, togglePremiumTheme, isPremium, isEmergency, toggleEmergency } = useTheme()
  const { socket } = useSocket()

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  function changeLanguage(langCode: string) {
    i18n.changeLanguage(langCode)
    try { localStorage.setItem('language', langCode) } catch { /* noop */ }
  }

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

  const prefetchPage = useCallback((path: string) => {
    const routes: Record<string, () => Promise<unknown>> = {
      '/dashboard': () => import('../pages/Dashboard'),
      '/map': () => import('../pages/MapOverview'),
      '/resources': () => import('../pages/Resources'),
      '/zones': () => import('../pages/ZoneHeatMap'),
      '/incidents': () => import('../pages/Incidents'),
      '/requests/new': () => import('../pages/CreateRequest'),
      '/admin': () => import('../pages/AdminDashboard'),
      '/profile': () => import('../pages/Profile'),
    }
    routes[path]?.().catch(() => {})
  }, [])

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname.startsWith(path)
  }

  const filteredLinks = NAV_LINKS.filter(l => !l.admin || (l.admin && isAdmin))
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register'
  const showNav = isAuthenticated && !isAuthPage

  return (
    <>
      <nav className="gov-navbar" role="navigation" aria-label="Main navigation">
        <div className="gov-navbar-inner">
          {/* ─── Logo + Title ─── */}
          <div
            className="gov-navbar-brand"
            onClick={() => navigate('/dashboard')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate('/dashboard') }}
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
          </div>

          {/* ─── Desktop Nav Links ─── */}
          <div className="gov-navbar-links">
            {showNav && filteredLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                onMouseEnter={() => prefetchPage(link.path)}
                onFocus={() => prefetchPage(link.path)}
                className={`gov-navbar-link ${isActive(link.path) ? 'active' : ''}`}
                aria-current={isActive(link.path) ? 'page' : undefined}
              >
                {link.icon}
                <span>{t(link.labelKey, link.fallback)}</span>
              </button>
            ))}
          </div>

          {/* ─── Right Controls ─── */}
          <div className="gov-navbar-controls">
            {showNav && (
              <>
                {/* Tools group */}
                <div className="gov-navbar-btn-group">
                  <button
                    className="gov-navbar-tool-btn"
                    onClick={() => window.dispatchEvent(new CustomEvent('toggle-cmd-palette'))}
                    aria-label="Open command palette"
                    title="Command palette (Ctrl+K)"
                  >
                    <Search size={14} />
                  </button>

                  <div className="gov-navbar-lang">
                    <select
                      value={i18n.language}
                      onChange={(e) => changeLanguage(e.target.value)}
                      className="gov-navbar-lang-select"
                      aria-label={t('header.selectLanguage')}
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>{l.code.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="gov-navbar-divider" />

                {/* Theme group */}
                <div className="gov-navbar-btn-group">
                  <button
                    onClick={toggleTheme}
                    className="gov-navbar-tool-btn"
                    aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    title={theme === 'light' ? 'Dark mode' : 'Light mode'}
                  >
                    {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                  </button>
                  <button
                    onClick={togglePremiumTheme}
                    className={`gov-navbar-tool-btn ${isPremium ? 'premium-active' : ''}`}
                    aria-label={isPremium ? 'Disable premium theme' : 'Activate premium theme'}
                    title="Premium theme (Alt+N)"
                  >
                    <Zap size={14} />
                  </button>
                  <button
                    onClick={toggleEmergency}
                    className={`gov-navbar-tool-btn ${isEmergency ? 'emergency-active' : ''}`}
                    aria-label={isEmergency ? 'Disable emergency mode' : 'Activate emergency mode'}
                    title="Emergency mode (Alt+E)"
                  >
                    <AlertTriangle size={14} />
                    {isEmergency && <span className="gov-navbar-emergency-dot" />}
                  </button>
                </div>

                <div className="gov-navbar-divider" />

                {/* User group */}
                <div className="gov-navbar-btn-group">
                  <NotificationBell />
                  <button
                    onClick={() => navigate('/profile')}
                    className="gov-navbar-user-btn"
                    aria-label="Profile"
                    title={currentUser?.displayName || t('nav.profile')}
                  >
                    <User size={16} />
                    <span className="gov-navbar-user-name">{currentUser?.displayName?.split(' ')[0] || t('nav.profile')}</span>
                  </button>
                  <button
                    onClick={() => {
                      if (socket?.connected) socket.disconnect()
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

            {/* Always visible: hamburger */}
            <button
              className="gov-navbar-hamburger"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* ─── Mobile Menu ─── */}
        {menuOpen && showNav && (
          <div className="gov-navbar-mobile">
            <div className="gov-navbar-mobile-section-label">Navigation</div>
            {filteredLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`gov-navbar-mobile-link ${isActive(link.path) ? 'active' : ''}`}
              >
                {link.icon}
                <span>{t(link.labelKey, link.fallback)}</span>
              </button>
            ))}

            <div className="gov-navbar-mobile-divider" />

            <div className="gov-navbar-mobile-section-label">Settings</div>
            <div className="gov-navbar-mobile-controls">
              <div className="gov-navbar-lang">
                <select
                  value={i18n.language}
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="gov-navbar-lang-select"
                  aria-label={t('header.selectLanguage')}
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.code.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="gov-navbar-mobile-theme">
                <button onClick={toggleTheme} className="gov-navbar-tool-btn" aria-label="Toggle theme">
                  {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                </button>
                <button onClick={togglePremiumTheme} className={`gov-navbar-tool-btn ${isPremium ? 'premium-active' : ''}`} aria-label="Toggle premium theme" title="Premium theme (Alt+N)">
                  <Zap size={14} />
                </button>
                <button onClick={toggleEmergency} className={`gov-navbar-tool-btn ${isEmergency ? 'emergency-active' : ''}`} aria-label={isEmergency ? 'Disable emergency mode' : 'Activate emergency mode'} title="Emergency mode (Alt+E)">
                  <AlertTriangle size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  )
}
