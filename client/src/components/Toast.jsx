import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout)
      timers.current = {}
    }
  }, [])

  const removeToast = useCallback((id) => {
    if (timers.current[id]) {
      clearTimeout(timers.current[id])
      delete timers.current[id]
    }
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message, type }].slice(-5))
    if (duration > 0) {
      timers.current[id] = setTimeout(() => removeToast(id), duration)
    }
    return id
  }, [removeToast])

  const toast = useCallback((message, type) => addToast(message, type), [addToast])
  toast.success = (msg) => addToast(msg, 'success')
  toast.error = (msg) => addToast(msg, 'error')
  toast.warning = (msg) => addToast(msg, 'warning')
  toast.info = (msg) => addToast(msg, 'info')

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

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    return (msg, type) => {
      if (type === 'error') console.error('[Toast]', msg)
      else console.warn('[Toast]', msg)
      return msg
    }
  }
  return ctx
}
