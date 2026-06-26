import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, BellRing, AlertTriangle, TrendingUp, Info, ArrowUp } from 'lucide-react'
import { useSocket } from '../hooks/useSocket'

interface NotificationItem {
  id: number
  read: boolean
  timestamp: string
  type: string
  title: string
  message: string
  requestId?: string
}

interface GroupConfig {
  label: string
  order: number
  icon: React.ReactNode
  className: string
}

interface GroupData extends GroupConfig {
  key: string
  items: NotificationItem[]
}

function useNotifTiers() {
  const { t } = useTranslation()
  return {
    sos: { label: t('notificationBell.alerts'), order: 0, icon: <AlertTriangle size={12} />, className: 'notif-tier-alert' },
    escalation: { label: t('notificationBell.escalations'), order: 1, icon: <ArrowUp size={12} />, className: 'notif-tier-escalation' },
    update: { label: t('notificationBell.updates'), order: 2, icon: <Bell size={12} />, className: 'notif-tier-update' },
  } as Record<string, GroupConfig>
}

function getTier(type: string): string {
  if (type === 'sos:alert') return 'sos'
  if (type === 'request:escalated' || type === 'request:deleted') return 'escalation'
  return 'update'
}

const iconMap: Record<string, React.ReactNode> = {
  'request:created': <Info size={14} />,
  'request:updated': <Info size={14} />,
  'request:commented': <Info size={14} />,
  'request:escalated': <TrendingUp size={14} />,
  'request:deleted': <Info size={14} />,
  'resource:allocated': <Info size={14} />,
  'resource:created': <Info size={14} />,
  'sos:alert': <AlertTriangle size={14} />,
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllRead, clearAll } = useSocket()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  const navigate = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const NOTIF_TIERS = useNotifTiers()
  const grouped = useMemo<GroupData[]>(() => {
    const groups: Record<string, NotificationItem[]> = {}
    for (const n of notifications.slice(0, 30)) {
      const tier = getTier(n.type)
      if (!groups[tier]) groups[tier] = []
      groups[tier].push(n)
    }
    return Object.entries(NOTIF_TIERS)
      .filter(([key]) => groups[key]?.length)
      .sort((a, b) => a[1].order - b[1].order)
      .map(([key, config]) => ({ ...config, key, items: groups[key] }))
  }, [notifications, NOTIF_TIERS])

  const hasUnreadUrgent = notifications.some((n) => !n.read && n.type === 'sos:alert')

  function handleNotificationClick(n: NotificationItem) {
    markAsRead(n.id)
    if (n.requestId) {
      navigate(`/requests/${n.requestId}`)
    }
    setOpen(false)
  }

  return (
    <div ref={ref} className="notification-bell">
      <button
        onClick={() => setOpen(!open)}
        className={`notification-bell-btn${hasUnreadUrgent ? ' notif-bell-urgent' : ''}`}
        aria-expanded={open}
        aria-label={t('notifications.title')}
        title={t('notifications.title')}
      >
        {hasUnreadUrgent ? <BellRing size={18} /> : <Bell size={18} />}
        {unreadCount > 0 && (
          <span className={`notification-badge${hasUnreadUrgent ? ' notification-badge-urgent' : ''}`}>
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
            <>
              {grouped.map((group) => (
                <div key={group.key}>
                  <div className={`notif-group-header ${group.className}`}>
                    <span className="notif-group-icon">{group.icon}</span>
                    <span className="notif-group-label">{group.label}</span>
                    <span className="notif-group-count">{group.items.length}</span>
                  </div>
                  {group.items.map((n) => (
                    <div
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNotificationClick(n)}
                      onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNotificationClick(n) } }}
                      className={`notification-item ${!n.read ? 'notification-unread' : ''} ${group.className}`}
                    >
                      <div className="notification-item-content">
                        <span className="notification-icon">
                          {iconMap[n.type] || <Bell size={14} />}
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
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
