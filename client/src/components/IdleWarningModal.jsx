import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'

export default function IdleWarningModal() {
  const { idleWarning, resetIdleTimer } = useAuth()
  const [countdown, setCountdown] = useState(60)

  useEffect(() => {
    if (!idleWarning) {
      setCountdown(60)
      return
    }
    const id = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(id)
  }, [idleWarning])

  if (!idleWarning) return null

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      }}
    >
      <div
        style={{
          background: 'var(--gov-card-bg)',
          border: '1px solid var(--accent-orange)',
          borderRadius: 16, padding: 32, maxWidth: 420, width: '90%',
          textAlign: 'center',
          boxShadow: '0 16px 64px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>&#9200;</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, color: 'var(--gov-text)' }}>
          Session Expiring
        </h2>
        <p style={{ margin: '0 0 16px', color: 'var(--gov-muted)', fontSize: 14, lineHeight: 1.5 }}>
          You've been inactive. For security, your session will expire in:
        </p>
        <div
          style={{
            fontSize: 48, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
            color: countdown <= 10 ? 'var(--accent-red)' : 'var(--accent-orange)',
            marginBottom: 20,
          }}
        >
          {countdown}s
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={resetIdleTimer}
            className="btnPrimary"
            style={{ padding: '12px 28px', fontSize: 14, fontWeight: 700 }}
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
