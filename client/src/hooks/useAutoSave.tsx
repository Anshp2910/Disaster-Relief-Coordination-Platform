import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CloudOff, CheckCircle, Loader2 } from 'lucide-react'
import { safeRemoveItem } from '../utils/storage'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseAutoSaveOptions {
  key: string
  data: unknown
  delay?: number
  onSave?: (data: unknown) => Promise<void>
  enabled?: boolean
}

export function useAutoSave({ key, data, delay = 1500, onSave, enabled = true }: UseAutoSaveOptions) {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const mountedRef = useRef(true)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!enabled) return
    if (timerRef.current) clearTimeout(timerRef.current)

    setStatus('saving')
    timerRef.current = setTimeout(async () => {
      try {
        const serialized = JSON.stringify(data)
        // Check approximate size before writing (localStorage typically limited to 5-10MB)
        if (serialized.length > 4_000_000) {
          console.warn(`[useAutoSave] Data too large for localStorage (${Math.round(serialized.length / 1024)}KB)`)  
          if (mountedRef.current) setStatus('error')
          return
        }
        try {
          localStorage.setItem(key, serialized)
        } catch (storageErr) {
          if (storageErr instanceof DOMException && storageErr.name === 'QuotaExceededError') {
            console.warn('[useAutoSave] localStorage quota exceeded — clearing old entries')
            // Try to free space by removing the oldest localStorage entries
            try {
              const keysToRemove: string[] = []
              for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i)
                if (k && k !== key && !k.startsWith('token') && !k.startsWith('user')) {
                  keysToRemove.push(k)
                }
              }
              // Remove oldest half of non-essential entries
              const toRemove = keysToRemove.slice(0, Math.ceil(keysToRemove.length / 2))
              toRemove.forEach((k) => localStorage.removeItem(k))
              localStorage.setItem(key, serialized) // Retry after cleanup
            } catch {
              if (mountedRef.current) setStatus('error')
              return
            }
          } else {
            throw storageErr
          }
        }
        if (onSaveRef.current) await onSaveRef.current(data)
        if (mountedRef.current) setStatus('saved')
      } catch {
        if (mountedRef.current) setStatus('error')
      }
      if (mountedRef.current) {
        timerRef.current = setTimeout(() => {
          if (mountedRef.current) setStatus('idle')
        }, 2000)
      }
    }, delay)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [data, key, delay, enabled])

  const restore = useCallback(<T,>(): T | null => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? (JSON.parse(stored) as T) : null
    } catch { return null }
  }, [key])

  const clear = useCallback(() => {
    safeRemoveItem(key)
    setStatus('idle')
  }, [key])

  return { status, restore, clear }
}

export function AutoSaveIndicator({ status }: { status: SaveStatus }) {
  return (
    <AnimatePresence mode="wait">
      {status !== 'idle' && (
        <motion.div
          className="as-indicator"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
        >
          {status === 'saving' && (
            <span className="as-saving"><Loader2 size={12} className="as-spin" /> Saving...</span>
          )}
          {status === 'saved' && (
            <span className="as-saved"><CheckCircle size={12} /> Saved</span>
          )}
          {status === 'error' && (
            <span className="as-error"><CloudOff size={12} /> Save failed</span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
