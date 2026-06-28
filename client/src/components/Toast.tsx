import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'

interface ToastItem {
  id: number
  message: string
  type: string
}

type ToastType = 'info' | 'success' | 'error' | 'warning'

interface ToastFn {
  (message: string, type?: ToastType): number
  success: (msg: string) => number
  error: (msg: string) => number
  warning: (msg: string) => number
  info: (msg: string) => number
}

const ToastContext = createContext<ToastFn | null>(null)

let toastId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout)
      timers.current = {}
    }
  }, [])

  const removeToast = useCallback((id: number) => {
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
      delete timers.current[id]
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((message: string, type: string = 'info', duration: number = 4000) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }].slice(-5))
    if (duration > 0) {
      timers.current[id] = setTimeout(() => removeToast(id), duration)
    }
    return id
  }, [removeToast])

  const toast = useCallback((message: string, type?: ToastType) => addToast(message, type), [addToast]) as ToastFn
  toast.success = (msg: string) => addToast(msg, 'success')
  toast.error = (msg: string) => addToast(msg, 'error')
  toast.warning = (msg: string) => addToast(msg, 'warning')
  toast.info = (msg: string) => addToast(msg, 'info')

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container" role="region" aria-live="polite" aria-atomic="true" aria-label="Notifications">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 80, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => removeToast(t.id)}
              className={`toast-item toast-${t.type}`}
              role="alert"
            >
              <span className={`toast-icon ${t.type}`} aria-hidden="true">
                {t.type === 'success' ? <CheckCircle size={16} /> : t.type === 'error' ? <XCircle size={16} /> : t.type === 'warning' ? <AlertTriangle size={16} /> : <Info size={16} />}
              </span>
              <span className="toast-message">{t.message}</span>
              <button className="toast-close" aria-label="Dismiss" onClick={() => removeToast(t.id)} type="button"><X size={14} aria-hidden="true" /></button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastFn {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    const fallback = ((msg: string, type?: ToastType) => {
      if (type === 'error') console.error('[Toast]', msg)
      else console.warn('[Toast]', msg)
      return 0
    }) as ToastFn
    fallback.success = () => 0
    fallback.error = () => 0
    fallback.warning = () => 0
    fallback.info = () => 0
    return fallback
  }
  return ctx
}
