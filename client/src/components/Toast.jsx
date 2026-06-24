import { createContext, useContext, useState, useCallback, useRef } from 'react'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

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
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            style={{
              padding: '12px 16px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,.15)',
              animation: 'toast-slide-in .25s ease-out',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: '#fff',
              background: t.type === 'success' ? '#34c759' : t.type === 'error' ? '#ff3b30' : t.type === 'warning' ? '#f0a030' : '#4a80c0',
            }}
          >
            <span style={{ fontSize: 16 }}>
              {t.type === 'success' ? '\u2714' : t.type === 'error' ? '\u2718' : t.type === 'warning' ? '\u26A0' : '\u2139'}
            </span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <span style={{ opacity: .7, fontSize: 11 }}>\u00D7</span>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toast-slide-in {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    return (msg, type) => {
      if (type === 'error') alert(msg)
      else if (type === 'success') alert(msg)
      else alert(msg)
    }
  }
  return ctx
}
