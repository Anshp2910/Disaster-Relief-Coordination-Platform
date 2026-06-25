import { useMemo, useState, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useSocket } from '../hooks/useSocket'
import NotificationBell from './NotificationBell'
import useFocusTrap from '../hooks/useFocusTrap'

const NAV_ICONS = {
  dashboard: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  map: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
  zones: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  resources: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  incidents: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
  schedules: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  geofencing: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
  'new-request': 'M12 4v16m8-8H4',
  admin: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  profile: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
}

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { user: currentUser, isAuthenticated, isAdmin, logout: authLogout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { socket } = useSocket()
  const sidebarRef = useFocusTrap(open)

  const navLinks = useMemo(() => isAuthenticated
    ? [
        { path: '/dashboard', label: t('nav.dashboard'), icon: 'dashboard' },
        { path: '/map', label: t('nav.mapView') || 'Map View', icon: 'map' },
        { path: '/zones', label: t('nav.zones') || 'Zones', icon: 'zones' },
        { path: '/resources', label: t('nav.resources') || 'Resources', icon: 'resources' },
        { path: '/incidents', label: t('nav.incidents') || 'Incidents', icon: 'incidents' },
        { path: '/schedules', label: t('nav.schedules') || 'Schedules', icon: 'schedules' },
        { path: '/geofencing', label: t('nav.geofencing') || 'Geofencing', icon: 'geofencing' },
        { path: '/requests/new', label: t('nav.newRequest'), icon: 'new-request' },
        ...(isAdmin ? [
          { path: '/admin', label: t('nav.admin'), icon: 'admin' },
          { path: '/escalation', label: t('nav.escalation') || 'Escalation', icon: 'incidents' },
          { path: '/bulk', label: t('nav.bulkImport') || 'Bulk', icon: 'resources' },
        ] : []),
      ]
    : []
  , [isAuthenticated, isAdmin, t])

  function handleNav(path) {
    navigate(path)
    onClose()
  }

  function logout() {
    if (socket?.connected) socket.disconnect()
    try { localStorage.removeItem('notifications') } catch {}
    authLogout()
    navigate('/login')
    onClose()
  }

  const isActive = (path) => location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path))

  return (
    <>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`} ref={sidebarRef} role="dialog" aria-modal={open} aria-label={t('nav.dashboard')}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <svg width="28" height="28" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="28" cy="28" r="25" stroke="var(--accent)" strokeWidth="2" fill="none" opacity="0.5" />
              <circle cx="28" cy="28" r="5" fill="var(--accent)" />
            </svg>
            <span className="sidebar-title">{t('appTitle')}</span>
          </div>
          <button className="sidebar-close" onClick={onClose} aria-label="Close menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navLinks.map((link) => (
            <button
              key={link.path}
              onClick={() => handleNav(link.path)}
              className={`sidebar-link ${isActive(link.path) ? 'active' : ''}`}
              aria-current={isActive(link.path) ? 'page' : undefined}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="sidebar-icon">
                <path d={NAV_ICONS[link.icon]} />
              </svg>
              <span className="sidebar-label">{link.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {isAuthenticated && (
            <button onClick={() => handleNav('/profile')} className="sidebar-link sidebar-user">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="sidebar-icon">
                <path d={NAV_ICONS.profile} />
              </svg>
              <span className="sidebar-label">{currentUser?.displayName || t('nav.profile')}</span>
            </button>
          )}
          <div className="sidebar-actions">
            <button onClick={toggleTheme} className="sidebar-icon-btn" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
              {theme === 'light' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
              )}
            </button>
            {isAuthenticated && (
              <>
                <NotificationBell />
                <button onClick={logout} className="sidebar-icon-btn danger" aria-label={t('nav.logout')}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
