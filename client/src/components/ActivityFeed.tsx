import { useState, useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, RefreshCw, MessageSquare, ArrowRight, Package, AlertTriangle, Trash2, Bell, Inbox } from 'lucide-react'
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

interface ActivityFeedProps {
  limit?: number
  compact?: boolean
}

const ICONS: Record<string, { icon: ReactNode; label: string }> = {
  'request:created': { icon: <Plus size={14} />, label: 'New Request' },
  'request:updated': { icon: <RefreshCw size={14} />, label: 'Updated' },
  'request:commented': { icon: <MessageSquare size={14} />, label: 'Comment' },
  'resource:allocated': { icon: <ArrowRight size={14} />, label: 'Allocated' },
  'resource:created': { icon: <Package size={14} />, label: 'Resource' },
  'request:escalated': { icon: <AlertTriangle size={14} />, label: 'Escalated' },
  'request:deleted': { icon: <Trash2 size={14} />, label: 'Deleted' },
  'sos:alert': { icon: <Bell size={14} />, label: 'SOS' },
}

export default function ActivityFeed({ limit = 20, compact = false }: ActivityFeedProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { notifications, unreadCount, markAsRead, markAllRead } = useSocket()
  const formatTime = useFormatTime()
  const [items, setItems] = useState<NotificationItem[]>([])

  useEffect(() => {
    setItems(notifications.slice(0, limit))
  }, [notifications, limit])

  function handleClick(n: NotificationItem) {
    if (!n.read) markAsRead(n.id)
    if (n.requestId) navigate(`/requests/${n.requestId}`)
  }

  if (items.length === 0) {
    return (
      <div className="activity-feed activity-feed--empty">
        <div className="activity-empty-icon"><Inbox size={24} /></div>
        <div className="activity-empty-text">{t('dashboard.noActivity') || 'No recent activity'}</div>
        <div className="activity-empty-sub">{t('dashboard.activityWaiting') || 'Waiting for live updates...'}</div>
      </div>
    )
  }

  return (
    <div className="activity-feed">
      {unreadCount > 0 && (
        <div className="activity-feed-header">
          <span className="activity-unread-badge">{t('activityFeed.newCount', { count: unreadCount })}</span>
          <button onClick={markAllRead} className="activity-mark-read" aria-label={t('notifications.markAllRead')}>{t('notifications.markAllRead')}</button>
        </div>
      )}
      <div className={`activity-list ${compact ? 'activity-list--compact' : ''}`}>
        {items.map((n) => {
          const meta = ICONS[n.type] || { icon: <Bell size={14} />, label: n.type }
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

function useFormatTime() {
  const { t } = useTranslation()
  return function formatTime(ts: string) {
    if (!ts) return ''
    const diff = Date.now() - new Date(ts).getTime()
    if (diff < 60000) return t('activityFeed.justNow')
    if (diff < 3600000) return t('activityFeed.minutesAgo', { count: Math.floor(diff / 60000) })
    if (diff < 86400000) return t('activityFeed.hoursAgo', { count: Math.floor(diff / 3600000) })
    return t('activityFeed.daysAgo', { count: Math.floor(diff / 86400000) })
  }
}
