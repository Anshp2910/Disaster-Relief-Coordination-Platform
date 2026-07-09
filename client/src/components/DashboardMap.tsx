import { useEffect, useRef, useState, useCallback, memo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import L from 'leaflet'
import { clientApi } from '../api/client'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'
import { MAP_MARKER_COLORS } from '../utils/constants'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { escapeHtml } from '../utils/escapeHtml'
import EmptyState from './EmptyState'
import { Map as MapIcon } from 'lucide-react'

interface MapItem {
  _id: string
  title?: string
  status?: string
  priority?: string
  locationName?: string
  lat?: number
  lng?: number
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

function DashboardMapInner() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.CircleMarker[]>([])
  const [mapItems, setMapItems] = useState<MapItem[]>([])
  const [mapLoading, setMapLoading] = useState(false)

  const loadMapItems = useCallback(async () => {
    setMapLoading(true)
    try {
      const data = await clientApi.getRequests({ limit: 100 }) as { items?: MapItem[] }
      setMapItems(data.items || [])
    } catch {
      setMapItems([])
    } finally {
      setMapLoading(false)
    }
  }, [])

  useEffect(() => { loadMapItems() }, [loadMapItems])
  useAutoRefresh(loadMapItems, { interval: 20000 })

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    let map: L.Map | null = null
    try {
      map = initLeafletMap(mapRef.current)
      mapInstanceRef.current = map
    } catch (e) {
      console.error('[DashboardMap] Leaflet init failed:', e)
      return
    }
    const onResize = () => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize() }
    window.addEventListener('resize', onResize)
    if (window.visualViewport) (window.visualViewport as EventTarget).addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (window.visualViewport) (window.visualViewport as EventTarget).removeEventListener('resize', onResize)
      if (map) cleanupLeafletMap(map); mapInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    markersRef.current.forEach((m) => map.removeLayer(m))
    markersRef.current = []
    mapItems.forEach((item) => {
      if (item.lat == null || item.lng == null) return
      const color = MAP_MARKER_COLORS[item.status || 'Open'] || 'var(--gov-muted)'
      const marker = L.circleMarker([item.lat, item.lng], { radius: 8, fillColor: color, color: 'var(--gov-white)', weight: 2, fillOpacity: 0.9 }).addTo(map)
      marker.bindPopup(`<div style="min-width:180px;font-family:var(--font)"><div style="font-weight:700;font-size:var(--text-sm);margin-bottom:var(--space-3xs)">${escapeHtml(item.title || '')}</div><div style="font-size:var(--text-xs);color:var(--gov-muted);margin-bottom:var(--space-3xs)">${escapeHtml(item.status || '')} | ${escapeHtml(item.priority || '')}</div><div style="font-size:var(--text-xs);color:var(--gov-muted);margin-bottom:var(--space-xs)">${escapeHtml(item.locationName || '')}</div><a href="#/requests/${escapeHtml(item._id)}" style="display:inline-block;background:var(--gradient-accent);color:var(--text-on-accent);text-decoration:none;padding:var(--space-3xs) var(--space-xsml);border-radius:var(--radius-2xs);font-size:var(--text-xs)">${t('common.viewDetails')}</a></div>`)
      markersRef.current.push(marker)
    })
    if (mapItems.length > 0) {
      const bounds = L.latLngBounds(mapItems.filter((i) => i.lat != null && i.lng != null).map((i) => [i.lat, i.lng] as [number, number]))
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [mapItems, t])

  return (
    <motion.div className="bento-grid mb-md" variants={fadeUp}>
      <div className="bento-card bento--wide">
        <div className="bento-header">
          <span className="bento-title"><MapIcon size={14} /> {t('dashboard.mapView')}</span>
          <div className="flex gap-sm">
            <button onClick={() => navigate('/map')} className="text-xs" style={{ color: 'var(--accent)' }}>{t('dashboard.viewAll')}</button>
          </div>
        </div>
        <div className="relative dashboard-map">
          {mapLoading && (
            <div className="flex-center inset-0 z-100 bg-elevated" style={{ position: 'absolute' }}>
              <div className="loading-spinner" />
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" />
        </div>
        {!mapLoading && mapItems.length === 0 && (
          <EmptyState icon={<MapIcon size={32} />} title={t('dashboard.noRequests')} />
        )}
        <div className="flex gap-sm mt-sm flex-wrap">
          {Object.entries(MAP_MARKER_COLORS).map(([status, color]) => (
            <div key={status} className="gap-row-xs text-xs">
              <div className="icon-12" style={{ background: color }} />
              <span>{t(`statuses.${status}`)}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

const DashboardMap = memo(DashboardMapInner)
export default DashboardMap
