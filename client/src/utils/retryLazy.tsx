import { lazy, type ComponentType } from 'react'

function PageLoadError(_props: Record<string, unknown>) {
  return (
    <div className="flex-center flex-col min-h-60vh" style={{ gap: 'var(--space-sm)' }}>
      <p className="text-muted">{'Something went wrong loading this page.'}</p>
      <button className="btn-primary btn-sm" onClick={() => window.location.reload()}>
        {'Reload'}
      </button>
    </div>
  )
}

export function retryLazy<T extends ComponentType<unknown>>(importFn: () => Promise<{ default: T }>) {
  return lazy(() =>
    importFn().catch(() => {
      return { default: PageLoadError as T }
    })
  )
}
