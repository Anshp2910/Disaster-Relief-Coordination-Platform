import L from 'leaflet'

const DEFAULT_CENTER = [20.5937, 78.9629]

export function initLeafletMap(container, { center = DEFAULT_CENTER, zoom = 5, onClick } = {}) {
  const map = L.map(container).setView(center, zoom)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  if (onClick) map.on('click', onClick)

  const invalidate = () => {
    try { map.invalidateSize() } catch (_) {}
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
    map.__resizeObserver = ro
  }

  return map
}

export function cleanupLeafletMap(map) {
  if (!map) return
  if (map.__resizeObserver) {
    map.__resizeObserver.disconnect()
    delete map.__resizeObserver
  }
  map.remove()
}
