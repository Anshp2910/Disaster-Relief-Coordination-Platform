import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react'

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
      <div className="toast-container" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            className={`flex flex-gap-sm p rounded shadow-sm cursor-pointer ${t.type === 'success' ? 'badge-green' : t.type === 'error' ? 'badge-red' : t.type === 'warning' ? 'badge-orange' : 'badge-blue'}`}
            role="alert"
          >
            <span className="text-lg">
              {t.type === 'success' ? '\u2714' : t.type === 'error' ? '\u2718' : t.type === 'warning' ? '\u26A0' : '\u2139'}
            </span>
            <span className="flex-1">{t.message}</span>
            <span className="text-xs opacity-50">{'\u00D7'}</span>
          </div>
        ))}
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
