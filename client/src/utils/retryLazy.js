import { lazy } from 'react'

export function retryLazy(importFn) {
  return lazy(() =>
    importFn().catch((err) => {
      if (
        err.name === 'ChunkLoadError' ||
        /Failed to fetch dynamically imported module|Loading chunk .* failed/i.test(err.message || '')
      ) {
        window.location.reload()
      }
      throw err
    })
  )
}
