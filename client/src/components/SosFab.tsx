import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { clientApi } from '../api/client'
import { useToast } from './Toast'
import { useConfirm } from '../hooks/useConfirm'
import useReducedMotion from '../hooks/useReducedMotion'
import { getErrorMessage } from '../utils/getErrorMessage'

export function SosFab() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const toast = useToast()
  const { confirm, ConfirmDialog } = useConfirm()
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [showLabel, setShowLabel] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hideLabelRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (hideLabelRef.current) clearTimeout(hideLabelRef.current)
    }
  }, [])

  async function handleSOS() {
    if (loading || cooldown > 0) return
    const ok = await confirm({ message: t('sos.confirm'), danger: true, confirmText: 'Send SOS' })
    if (!ok) return
    setLoading(true)
    try {
      await clientApi.broadcastSOS({ message: `${t('sos.from')} ${t('sos.user')}` })
      toast.success(t('sos.broadcastSuccess'))
      setCooldown(5)
      timerRef.current = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            return 0
          }
          return c - 1
        })
      }, 1000)
    } catch (e) {
      toast.error(t('sos.broadcastFailed', { error: getErrorMessage(e) }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <motion.button
        className="sos-fab sos-fab-btn"
        onClick={() => { handleSOS().catch(() => { console.warn('[SOS] handleSOS promise rejected') }) }}
        disabled={loading || cooldown > 0}
        aria-label={cooldown > 0 ? t('sos.cooldown', { count: cooldown }) || `SOS cooldown ${cooldown}s` : t('sos.alertLabel') || 'Emergency SOS alert'}
        onMouseEnter={() => setShowLabel(true)}
        onMouseLeave={() => { setShowLabel(false); if (hideLabelRef.current) clearTimeout(hideLabelRef.current) }}
        onFocus={() => setShowLabel(true)}
        onBlur={() => { hideLabelRef.current = setTimeout(() => setShowLabel(false), 200) }}
        whileHover={reduced ? {} : { scale: 1.08 }}
        whileTap={reduced ? {} : { scale: 0.95 }}
        animate={reduced || cooldown <= 0 ? {} : { rotate: [0, -10, 10, -10, 0] }}
        transition={reduced ? { duration: 0 } : { duration: 0.5 }}
      >
        <AlertTriangle size={24} />
        {cooldown > 0 && <span className="sos-cooldown">{cooldown}</span>}
        <AnimatePresence>
          {showLabel && (
            <motion.span
              className="sos-fab-label"
              initial={reduced ? { opacity: 1, x: 0 } : { opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduced ? { opacity: 1, x: 0 } : { opacity: 0, x: 8 }}
              transition={reduced ? { duration: 0 } : { duration: 0.15 }}
            >
              {cooldown > 0 ? `SOS ${cooldown}s` : t('sos.trigger') || 'SOS'}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
      {ConfirmDialog}
    </>
  )
}
