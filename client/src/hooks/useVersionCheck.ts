import { useEffect, useRef, useState, useCallback } from 'react'

const API_BASE: string = import.meta.env.VITE_API_BASE_URL || ''
const CHECK_INTERVAL = 120_000 // 2 minutes
const RELOAD_COOLDOWN = 300_000 // 5 minutes

let lastReload = 0

/**
 * Checks server version every 2 minutes and on tab focus.
 * Returns { hasUpdate, applyUpdate } so the UI can show an update banner
 * instead of doing a silent hard reload.
 */
export function useVersionCheck(): { hasUpdate: boolean; applyUpdate: () => void } {
  const versionRef = useRef<string | null>(null)
  const [hasUpdate, setHasUpdate] = useState(false)

  const applyUpdate = useCallback(() => {
    const now = Date.now()
    if (now - lastReload > RELOAD_COOLDOWN) {
      lastReload = now
      setHasUpdate(false)
      window.location.reload()
    }
  }, [])

  useEffect(() => {
    async function check() {
      try {
        const ctrl = new AbortController()
        const tid = setTimeout(() => ctrl.abort(), 10_000)
        const res = await fetch(`${API_BASE}/api/version?_t=${Date.now()}`, { signal: ctrl.signal })
        clearTimeout(tid)
        if (!res.ok) return
        const data = await res.json() as Record<string, unknown>
        const serverVer = String(data.version)

        if (versionRef.current === null) {
          versionRef.current = serverVer
          return
        }

        if (versionRef.current !== serverVer && serverVer !== 'undefined') {
          setHasUpdate(true)
        }
      } catch (e) {
        console.warn('Version check failed:', (e as Error).message)
      }
    }

    check()
    const timer = setInterval(check, CHECK_INTERVAL)

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return { hasUpdate, applyUpdate }
}
