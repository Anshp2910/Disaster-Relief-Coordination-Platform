import { useEffect, useRef, useCallback } from 'react'
import { API_BASE } from '../api/client'

const PING_INTERVAL = 5 * 60 * 1000 // 5 minutes

export function useKeepAlive() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const ping = useCallback(() => {
    fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(10_000) })
      .catch(() => {})
  }, [])

  const stopPing = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  const startPing = useCallback(() => {
    stopPing()
    ping()
    intervalRef.current = setInterval(ping, PING_INTERVAL)
  }, [ping, stopPing])

  useEffect(() => {
    startPing()

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        startPing()
      } else {
        stopPing()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      stopPing()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [startPing, stopPing])
}
