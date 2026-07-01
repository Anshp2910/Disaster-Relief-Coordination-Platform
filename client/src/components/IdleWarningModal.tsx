import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react'
import { RippleBtn } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import useFocusTrap from '../hooks/useFocusTrap'

export default function IdleWarningModal() {
  const { t } = useTranslation()
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
        <div className="modal-icon"><Clock size={24} /></div>
        <h2 className="modal-title">
          {t('idleWarning.title')}
        </h2>
        <p className="modal-desc">
          {t('idleWarning.description')}
        </p>
        <div aria-live="polite">
          <span className={`stat-value ${countdown <= 10 ? 'text-error' : ''}`}>
            {t('idleWarning.seconds', { count: countdown })}
          </span>
        </div>
        <div className="modal-actions mt">
          <RippleBtn onClick={resetIdleTimer} className="btn-primary btn-md">
            {t('idleWarning.stayLoggedIn')}
          </RippleBtn>
        </div>
      </div>
    </div>,
    document.body,
  )
}
