type WebVitalsModule = Record<string, (fn: (metric: unknown) => void) => void>

export function reportWebVitals(onPerfEntry?: (metric: unknown) => void): void {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then((mod) => {
      const m = mod as unknown as WebVitalsModule
      try {
        m.getCLS?.(onPerfEntry)
        m.getFID?.(onPerfEntry)
        m.getFCP?.(onPerfEntry)
        m.getLCP?.(onPerfEntry)
        m.getTTFB?.(onPerfEntry)
      } catch { /* ignore */ }
    }).catch(() => { /* ignore */ })
  }
}
