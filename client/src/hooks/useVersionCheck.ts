import { useEffect, useRef } from 'react'

const API_BASE: string = import.meta.env.VITE_API_BASE_URL || ''

export function useVersionCheck(): void {
  const versionRef = useRef<string | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined

    async function check() {
      try {
        const ctrl = new AbortController()
        const tid = setTimeout(() => ctrl.abort(), 10000)
        const res = await fetch(`${API_BASE}/api/version?_t=${Date.now()}`, { signal: ctrl.signal })
        clearTimeout(tid)
        if (!res.ok) return
        const data = await res.json() as Record<string, unknown>
        const serverVer = String(data.version)

        if (versionRef.current === null) {
          versionRef.current = serverVer
          return
        }

        if (versionRef.current !== serverVer) {
          window.location.reload()
        }
      } catch (e) {
        console.warn('Version check failed:', (e as Error).message)
      }
    }

    const POLL_INTERVAL = 120000
    check()
    timer = setInterval(check, POLL_INTERVAL)

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        check()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])
}
