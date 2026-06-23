import { useEffect } from 'react'

const CHECK_INTERVAL = 60_000

export function useVersionCheck() {
  useEffect(() => {
    const currentVersion = document.querySelector('meta[name="build-version"]')?.content

    async function checkVersion() {
      try {
        const res = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        if (currentVersion && String(data.version) !== String(currentVersion)) {
          window.location.reload()
        }
      } catch {
        // offline or error — skip
      }
    }

    const interval = setInterval(checkVersion, CHECK_INTERVAL)
    return () => clearInterval(interval)
  }, [])
}
