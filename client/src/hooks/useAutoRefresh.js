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

  function clearPoll() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  function startPoll() {
    if (!enabled) return
    clearPoll()
    intervalRef.current = setInterval(refresh, interval)
  }

  useEffect(() => {
    if (!enabled) return
    startPoll()
    return clearPoll
  }, [interval, enabled, refresh])

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
  }, [enabled, interval, refresh])

  return { refresh }
}
