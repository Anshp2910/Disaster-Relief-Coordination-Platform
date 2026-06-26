import { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cloud, CloudOff, CheckCircle, Loader2 } from 'lucide-react'

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
        localStorage.setItem(key, JSON.stringify(data))
        if (onSave) await onSave(data)
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
  }, [data, key, delay, onSave, enabled])

  const restore = useCallback((): T | null => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? (JSON.parse(stored) as T) : null
    } catch { return null }
  }, [key])

  const clear = useCallback(() => {
    localStorage.removeItem(key)
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
