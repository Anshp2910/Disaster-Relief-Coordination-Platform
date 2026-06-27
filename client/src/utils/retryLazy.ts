import { lazy, ComponentType } from 'react'

let lastReload = 0

export function retryLazy<T extends ComponentType<unknown>>(importFn: () => Promise<{ default: T }>) {
  return lazy(() =>
    importFn().catch((err: unknown) => {
      const error = err as { name?: string; message?: string }
      if (
        error.name === 'ChunkLoadError' ||
        /Failed to fetch dynamically imported module|Loading chunk .* failed/i.test(error.message || '')
      ) {
        const now = Date.now()
        if (now - lastReload > 30000) {
          lastReload = now
          window.location.reload()
        }
      }
      throw err
    })
  )
}
