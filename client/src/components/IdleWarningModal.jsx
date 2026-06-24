import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import useFocusTrap from '../hooks/useFocusTrap'

export default function IdleWarningModal() {
  const { idleWarning, resetIdleTimer } = useAuth()
  const trapRef = useFocusTrap(idleWarning)
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
    <div className="modal-overlay" ref={trapRef} role="alertdialog" aria-modal="true">
      <div className="modal-card text-center">
        <div className="modal-icon">&#9200;</div>
        <h2 className="modal-title">
          Session Expiring
        </h2>
        <p className="modal-desc">
          You've been inactive. For security, your session will expire in:
        </p>
        <div aria-live="polite">
          <span className={`stat-value ${countdown <= 10 ? 'text-error' : ''}`}>
            {countdown}s
          </span>
        </div>
        <div className="modal-actions mt">
          <button onClick={resetIdleTimer} className="btnPrimary">
            Stay Logged In
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
