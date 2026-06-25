import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { useToast } from './Toast'
import { useConfirm } from '../hooks/useConfirm'

export default function SosFab() {
  const { t } = useTranslation()
  const toast = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [showLabel, setShowLabel] = useState(false)
  const timerRef = useRef(null)
  const hideLabelRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (hideLabelRef.current) clearTimeout(hideLabelRef.current)
    }
  }, [])

  async function handleSOS() {
    if (loading || cooldown > 0) return
    const ok = await confirm({ message: t('sos.confirm'), danger: true })
    if (!ok) return
    setLoading(true)
    try {
      await clientApi.broadcastSOS({ message: `${t('sos.from')} ${t('sos.user')}` })
      toast.success(t('sos.broadcastSuccess'))
      setCooldown(5)
      timerRef.current = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            clearInterval(timerRef.current)
            return 0
          }
          return c - 1
        })
      }, 1000)
    } catch (e) {
      toast.error(t('sos.broadcastFailed', { error: e.message }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        className="sos-fab"
        onClick={handleSOS}
        disabled={loading || cooldown > 0}
        aria-label={cooldown > 0 ? `SOS cooldown ${cooldown}s` : 'Emergency SOS alert'}
        onMouseEnter={() => setShowLabel(true)}
        onMouseLeave={() => { setShowLabel(false); clearTimeout(hideLabelRef.current) }}
        onFocus={() => setShowLabel(true)}
        onBlur={() => { hideLabelRef.current = setTimeout(() => setShowLabel(false), 200) }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        {cooldown > 0 && <span className="sos-fab-cooldown" />}
        {showLabel && (
          <span className="sos-fab-label">
            {cooldown > 0 ? `SOS ${cooldown}s` : t('sos.trigger') || 'SOS'}
          </span>
        )}
      </button>
      {ConfirmDialog}
    </>
  )
}
