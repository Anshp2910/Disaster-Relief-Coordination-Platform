import { useEffect, useRef } from 'react'
import { API_BASE } from '../api/client'

const PING_INTERVAL = 5 * 60 * 1000 // 5 minutes

/**
 * Pings the server health endpoint on a timer while the page is visible.
 * This prevents Render's free-tier from spinning down the instance after
 * 15 minutes of inactivity, which would cause a 50+ second cold start
 * on the next request.
 *
 * The /health endpoint is unauthenticated, so no token is needed.
 */
export function useKeepAlive() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function ping() {
    fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(10_000) })
      .catch(() => {
        // Silently ignore — the server may be cold-starting
      })
  }

  function startPing() {
    stopPing()
    // Ping immediately on mount/visibility change
    ping()
    intervalRef.current = setInterval(ping, PING_INTERVAL)
  }

  function stopPing() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

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
  }, [])
}
