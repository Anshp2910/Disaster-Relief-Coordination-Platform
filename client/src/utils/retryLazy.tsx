import { lazy, ComponentType } from 'react'

let lastReload = 0

function PageLoadError() {
  return (
    <div className="flex-center min-h-60vh" style={{ flexDirection: 'column', gap: '12px' }}>
      <p className="text-muted">Something went wrong loading this page.</p>
      <button className="btnPrimary btn-sm" onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  )
}

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
      return { default: PageLoadError as unknown as T }
    })
  )
}
