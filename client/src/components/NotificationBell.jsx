import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSocket } from '../hooks/useSocket'

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllRead, clearAll } = useSocket()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

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
    'request:created': '📢',
    'request:updated': '✏️',
    'request:commented': '💬',
    'resource:allocated': '📦',
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'none', border: 'none', color: '#fff',
          fontSize: 18, cursor: 'pointer', padding: '4px 8px',
          position: 'relative', borderRadius: 4,
        }}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            background: '#cc0000', color: '#fff', borderRadius: '50%',
            fontSize: 10, fontWeight: 700, minWidth: 16, height: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', lineHeight: 1,
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, width: 340,
          background: '#fff', border: '1px solid var(--gov-border)',
          borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          zIndex: 9999, maxHeight: 400, overflowY: 'auto',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', borderBottom: '1px solid var(--gov-border)',
          }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--gov-blue)' }}>
              Notifications {unreadCount > 0 && `(${unreadCount})`}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} style={{
                  background: 'none', border: 'none', color: 'var(--gov-blue)',
                  fontSize: 11, cursor: 'pointer', padding: 0, fontWeight: 600,
                }}>
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} style={{
                  background: 'none', border: 'none', color: '#cc0000',
                  fontSize: 11, cursor: 'pointer', padding: 0, fontWeight: 600,
                }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--gov-muted)', fontSize: 13 }}>
              No notifications yet
            </div>
          ) : (
            notifications.slice(0, 20).map((n) => (
              <div
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                style={{
                  padding: '10px 14px', cursor: 'pointer',
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                  background: n.read ? 'transparent' : 'rgba(0,0,128,0.03)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
                onMouseLeave={(e) => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(0,0,128,0.03)'}
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
                    {iconMap[n.type] || '🔔'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--gov-text)' }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gov-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
                      {new Date(n.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  {!n.read && (
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: 'var(--gov-blue)', flexShrink: 0, marginTop: 6,
                    }} />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
