import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629]

interface InitLeafletMapOptions {
  center?: [number, number]
  zoom?: number
  onClick?: (e: L.LeafletMouseEvent) => void
}

export function initLeafletMap(container: HTMLElement, { center = DEFAULT_CENTER, zoom = 5, onClick }: InitLeafletMapOptions = {}): L.Map {
  const map = L.map(container).setView(center, zoom)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  if (onClick) map.on('click', onClick)

  const invalidate = () => {
    try { map.invalidateSize() } catch { /* ignore */ }
  }

  requestAnimationFrame(() => {
    invalidate()
    setTimeout(invalidate, 200)
    setTimeout(invalidate, 500)
    setTimeout(invalidate, 1200)
  })

  if (window.ResizeObserver) {
    const existing = (map as unknown as Record<string, unknown>).__resizeObserver as ResizeObserver | undefined
    if (existing) existing.disconnect()
    const ro = new ResizeObserver(() => invalidate())
    ro.observe(container)
    ;(map as unknown as Record<string, unknown>).__resizeObserver = ro
  }

  return map
}

export function cleanupLeafletMap(map: L.Map | null | undefined): void {
  if (!map) return
  const ro = (map as unknown as Record<string, unknown>).__resizeObserver
  if (ro) {
    ;(ro as ResizeObserver).disconnect()
    delete (map as unknown as Record<string, unknown>).__resizeObserver
  }
  map.remove()
}

type PulseSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export function createPulseMarker(map: L.Map, lat: number, lng: number, severity: PulseSeverity = 'info', label?: string): L.Marker {
  const el = document.createElement('div')
  el.className = `pulse-marker pulse-marker--${severity}`
  el.innerHTML = '<div class="pulse-marker-dot"></div>'
  if (label) el.setAttribute('aria-label', label)
  return L.marker([lat, lng], { icon: L.divIcon({ html: el.outerHTML, className: '', iconSize: [24, 24], iconAnchor: [12, 12] }) }).addTo(map)
}
