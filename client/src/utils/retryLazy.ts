import { lazy, ComponentType } from 'react'

export function retryLazy<T extends ComponentType<unknown>>(importFn: () => Promise<{ default: T }>) {
  return lazy(() =>
    importFn().catch((err: unknown) => {
      const error = err as { name?: string; message?: string }
      if (
        error.name === 'ChunkLoadError' ||
        /Failed to fetch dynamically imported module|Loading chunk .* failed/i.test(error.message || '')
      ) {
        window.location.reload()
      }
      throw err
    })
  )
}
