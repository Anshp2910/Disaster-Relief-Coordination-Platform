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
