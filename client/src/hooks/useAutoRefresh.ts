import { useEffect, useRef, useCallback } from 'react'

interface UseAutoRefreshOptions {
  interval?: number
  enabled?: boolean
}

export function useAutoRefresh(refreshFn: () => void, { interval = 20000, enabled = true }: UseAutoRefreshOptions = {}): { refresh: () => void } {
  const savedFn = useRef<() => void>(refreshFn)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  savedFn.current = refreshFn

  const refresh = useCallback(() => {
    if (typeof savedFn.current === 'function') {
      savedFn.current()
    }
  }, [])

  function clearPoll() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const startPoll = useCallback(() => {
    if (!enabled) return
    clearPoll()
    intervalRef.current = setInterval(refresh, interval)
  }, [enabled, interval, refresh])

  useEffect(() => {
    if (!enabled) return
    startPoll()
    return clearPoll
  }, [interval, enabled, refresh, startPoll])

  useEffect(() => {
    if (!enabled) return

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        startPoll()
        refresh()
      } else {
        clearPoll()
      }
    }

    function onFocus() {
      startPoll()
      refresh()
    }

    function onBlur() {
      if (document.visibilityState === 'hidden') {
        clearPoll()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
    }
  }, [enabled, interval, refresh, startPoll])

  return { refresh }
}
