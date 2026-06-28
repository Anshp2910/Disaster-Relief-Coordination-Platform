import { lazy, ComponentType } from 'react'

function PageLoadError() {
  return (
    <div className="flex-center min-h-60vh" style={{ flexDirection: 'column', gap: 'var(--space-xsml)' }}>
      <p className="text-muted">Something went wrong loading this page.</p>
      <button className="btn-primary btn-sm" onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  )
}

export function retryLazy<T extends ComponentType<unknown>>(importFn: () => Promise<{ default: T }>) {
  return lazy(() =>
    importFn().catch(() => {
      return { default: PageLoadError as unknown as T }
    })
  )
}
