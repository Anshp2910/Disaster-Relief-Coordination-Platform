import type { Metric } from 'web-vitals'

export function reportWebVitals(onPerfEntry?: (metric: Metric) => void): void {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then((m) => {
      try {
        m.onCLS(onPerfEntry)
        m.onINP(onPerfEntry)
        m.onFCP(onPerfEntry)
        m.onLCP(onPerfEntry)
        m.onTTFB(onPerfEntry)
      } catch { /* ignore */ }
    }).catch(() => { /* ignore */ })
  }
}
