import { useEffect, useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import useReducedMotion from '../../hooks/useReducedMotion'
import useFocusTrap from '../../hooks/useFocusTrap'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  maxWidth?: number
}

let modalIdCounter = 0
const stableIds = new Map<string, string>()

function getStableId(title: string | undefined): string | undefined {
  if (!title) return undefined
  if (!stableIds.has(title)) stableIds.set(title, `modal-title-${++modalIdCounter}`)
  return stableIds.get(title)
}

export default function Modal({ open, onClose, title, children, maxWidth = 500 }: ModalProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const trapRef = useFocusTrap(open)
  const [announce, setAnnounce] = useState('')
  const titleId = getStableId(title)

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement
    setAnnounce('Dialog opened')
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      prev?.focus()
      setAnnounce('')
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={reduced ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? { opacity: 1 } : { opacity: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.15 }}
          onClick={onClose}
        >
<motion.div
        ref={trapRef}
        className="modal-card"
            style={{ maxWidth }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={reduced ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
            transition={reduced ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            onClick={e => e.stopPropagation()}
          >
            {title && (
              <div className="flex-between mb-md">
                <h3 id={titleId} style={{ margin: 0 }}>{title}</h3>
                <button onClick={onClose} className="icon-btn" aria-label={t('common.close')}><X size={18} aria-hidden="true" /></button>
              </div>
            )}
            {children}
          </motion.div>
          <div aria-live="polite" aria-atomic="true" className="sr-only">{announce === 'Dialog opened' ? announce : ''}</div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
