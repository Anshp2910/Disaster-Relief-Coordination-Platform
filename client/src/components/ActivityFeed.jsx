import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useSocket } from '../hooks/useSocket'

const ICONS = {
  'request:created': { icon: '➕', label: 'New Request' },
  'request:updated': { icon: '🔄', label: 'Updated' },
  'request:commented': { icon: '💬', label: 'Comment' },
  'resource:allocated': { icon: '📦', label: 'Allocated' },
  'resource:created': { icon: '📋', label: 'Resource' },
  'request:escalated': { icon: '🔺', label: 'Escalated' },
  'request:deleted': { icon: '🗑️', label: 'Deleted' },
  'sos:alert': { icon: '🚨', label: 'SOS' },
}

export default function ActivityFeed({ limit = 20, compact = false }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { notifications, unreadCount, markAsRead, markAllRead } = useSocket()
  const [items, setItems] = useState([])

  useEffect(() => {
    setItems(notifications.slice(0, limit))
  }, [notifications, limit])

  function handleClick(n) {
    if (!n.read) markAsRead(n.id)
    if (n.requestId) navigate(`/requests/${n.requestId}`)
  }

  if (items.length === 0) {
    return (
      <div className="activity-feed activity-feed--empty">
        <div className="activity-empty-icon">📡</div>
        <div className="activity-empty-text">{t('dashboard.noActivity') || 'No recent activity'}</div>
        <div className="activity-empty-sub">{t('dashboard.activityWaiting') || 'Waiting for live updates...'}</div>
      </div>
    )
  }

  return (
    <div className="activity-feed">
      {unreadCount > 0 && (
        <div className="activity-feed-header">
          <span className="activity-unread-badge">{unreadCount} new</span>
          <button onClick={markAllRead} className="activity-mark-read">{t('notifications.markAllRead')}</button>
        </div>
      )}
      <div className={`activity-list ${compact ? 'activity-list--compact' : ''}`}>
        {items.map((n) => {
          const meta = ICONS[n.type] || { icon: '🔔', label: n.type }
          return (
            <button
              key={n.id}
              className={`activity-item ${n.read ? '' : 'activity-item--unread'}`}
              onClick={() => handleClick(n)}
            >
              <span className="activity-icon">{meta.icon}</span>
              <div className="activity-content">
                <div className="activity-title">{n.title}</div>
                <div className="activity-message">{n.message}</div>
                <div className="activity-time">{formatTime(n.timestamp)}</div>
              </div>
              {!n.read && <span className="activity-dot" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function formatTime(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}
