import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSocket } from '../hooks/useSocket'

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllRead, clearAll } = useSocket()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleNotificationClick(n) {
    markAsRead(n.id)
    if (n.requestId) {
      navigate(`/requests/${n.requestId}`)
    }
    setOpen(false)
  }

  const iconMap = {
    'request:created': '\u{1F4E2}',
    'request:updated': '\u{270F}\u{FE0F}',
    'request:commented': '\u{1F4AC}',
    'request:escalated': '\u{1F53A}',
    'request:deleted': '\u{1F5D1}\u{FE0F}',
    'resource:allocated': '\u{1F4E6}',
    'resource:created': '\u{2795}',
    'sos:alert': '\u{1F6A8}',
  }

  const BellIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )

  return (
    <div ref={ref} className="notification-bell">
      <button
        onClick={() => setOpen(!open)}
        className="notification-bell-btn"
        aria-expanded={open}
        aria-label={t('notifications.title')}
        title={t('notifications.title')}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <span className="notification-header-title">
              {t('notifications.title')} {unreadCount > 0 && `(${unreadCount})`}
            </span>
            <div className="notification-actions">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="notification-action-btn">
                  {t('notifications.markAllRead')}
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} className="notification-action-btn notification-action-danger">
                  {t('notifications.clear')}
                </button>
              )}
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="notification-empty">
              {t('notifications.noNotifications')}
            </div>
          ) : (
            notifications.slice(0, 20).map((n) => (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => handleNotificationClick(n)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNotificationClick(n) } }}
                className={`notification-item ${!n.read ? 'notification-unread' : ''}`}
              >
                <div className="notification-item-content">
                  <span className="notification-icon">
                    {iconMap[n.type] || '\u{1F514}'}
                  </span>
                  <div className="notification-text">
                    <div className="notification-title">{n.title}</div>
                    <div className="notification-message">{n.message}</div>
                    <div className="notification-time">
                      {new Date(n.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  {!n.read && <span className="notification-dot" />}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
