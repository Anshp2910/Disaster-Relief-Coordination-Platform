import { useEffect, useRef, useCallback } from 'react'

export function useAutoRefresh(refreshFn, { interval = 20000, enabled = true } = {}) {
  const savedFn = useRef(refreshFn)
  const intervalRef = useRef(null)

  savedFn.current = refreshFn

  const refresh = useCallback(() => {
    if (typeof savedFn.current === 'function') {
      savedFn.current()
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    intervalRef.current = setInterval(refresh, interval)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [interval, enabled, refresh])

  useEffect(() => {
    if (!enabled) return

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }

    function onFocus() {
      refresh()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onFocus)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onFocus)
    }
  }, [enabled, refresh])

  return { refresh }
}
