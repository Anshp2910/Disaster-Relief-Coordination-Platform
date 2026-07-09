import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Filter, MapPin } from 'lucide-react'
import { PageHeader, ErrorState, PageTransition } from '../components/ui'
import L from 'leaflet'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { SkeletonMap } from '../components/Skeleton'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { escapeHtml } from '../utils/escapeHtml'
import EmptyState from '../components/EmptyState'
import { getErrorMessage } from '../utils/getErrorMessage'

interface Item {
  _id: string
  title?: string
  status?: string
  priority?: string
  category?: string
  locationName?: string
  lat?: number
  lng?: number
}

const STATUS_COLORS: Record<string, string> = {
  Open: 'var(--color-open)',
  Pending: 'var(--color-pending)',
  'In Progress': 'var(--color-progress)',
  Resolved: 'var(--color-resolved)',
  Fulfilled: 'var(--color-fulfilled)',
}

const PRIORITY_COLORS: Record<string, string> = {
  Critical: 'var(--color-critical)',
  High: 'var(--color-high)',
  Medium: 'var(--color-medium)',
  Low: 'var(--color-low)',
}

const FILTER_OPTIONS_KEYS = ['All', 'Open', 'Pending', 'In Progress', 'Resolved', 'Fulfilled']
const PRIORITY_FILTER_KEYS = ['All', 'Critical', 'High', 'Medium', 'Low']
const CATEGORY_FILTER_KEYS = ['All', 'Medical', 'Food', 'Shelter', 'Water', 'Rescue', 'Supplies', 'Healthcare', 'Sanitation', 'Clothing', 'Transportation', 'Communication', 'Power', 'Infrastructure', 'Other']

export default function MapOverview() {
  useEffect(() => { document.title = 'Disaster Relief - Map' }, [])
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterPriority, setFilterPriority] = useState('All')
  const [filterCategory, setFilterCategory] = useState('All')
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.CircleMarker[]>([])

  const load = useCallback(async () => {
    try {
      const data = await clientApi.getRequests({ limit: '1000' }) as { items?: Item[] }
      setItems(data.items || [])
      setLoading(false)
    } catch (e) {
      setError(getErrorMessage(e) || t('map.failedToLoad'))
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { load() }, [load])

  useAutoRefresh(load, { interval: 20000 })

  useEffect(() => {
    if (loading || !mapRef.current || mapInstanceRef.current) return

    let cancelled = false
    let map: L.Map | null = null

    const init = () => {
      if (cancelled || !mapRef.current || mapInstanceRef.current) return
      map = initLeafletMap(mapRef.current)
      mapInstanceRef.current = map
    }

    requestAnimationFrame(init)

    const onResize = () => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize() }
    window.addEventListener('resize', onResize)
    if (window.visualViewport) (window.visualViewport as EventTarget).addEventListener('resize', onResize)

    return () => {
      cancelled = true
      window.removeEventListener('resize', onResize)
      if (window.visualViewport) (window.visualViewport as EventTarget).removeEventListener('resize', onResize)
      if (map) {
        cleanupLeafletMap(map)
        mapInstanceRef.current = null
      }
    }
  }, [loading])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    markersRef.current.forEach((m) => map.removeLayer(m))
    markersRef.current = []

    const filtered = items.filter((i) => {
      if (filterStatus !== 'All' && i.status !== filterStatus) return false
      if (filterPriority !== 'All' && i.priority !== filterPriority) return false
      if (filterCategory !== 'All' && i.category !== filterCategory) return false
      return true
    })

    filtered.forEach((item) => {
      if (item.lat == null || item.lng == null) return

      const color = STATUS_COLORS[item.status || 'Open'] || 'var(--color-open)'
      const marker = L.circleMarker([item.lat, item.lng], {
        radius: 8,
        fillColor: color,
        color: 'var(--gov-white)',
        weight: 2,
        fillOpacity: 0.9,
      }).addTo(map)

      marker.bindPopup(`
        <div style="min-width:180px;font-family:var(--font)">
          <div style="font-weight:700;font-size:var(--text-sm);margin-bottom:var(--space-3xs)">${escapeHtml(item.title || '')}</div>
          <div style="font-size:var(--text-xs);color:var(--gov-muted);margin-bottom:var(--space-3xs)">${t(`statuses.${item.status || 'Open'}`)} | ${t(`priorities.${item.priority || 'Medium'}`)}</div>
          <div style="font-size:var(--text-xs);color:var(--gov-muted);margin-bottom:var(--space-xs)">${escapeHtml(item.locationName || '')}</div>
          <a href="#/requests/${escapeHtml(item._id)}" style="display:inline-block;background:var(--gradient-accent);color:var(--text-on-accent);text-decoration:none;padding:var(--space-3xs) var(--space-xsml);border-radius:var(--radius-2xs);font-size:var(--text-xs)">${t('common.viewDetails')}</a>
        </div>
      `)

      markersRef.current.push(marker)
    })

    if (filtered.length > 0) {
      const coords = filtered.filter((i) => i.lat != null && i.lng != null).map((i) => [i.lat, i.lng] as [number, number])
      if (coords.length > 0) {
        const bounds = L.latLngBounds(coords)
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, filterStatus, filterPriority, filterCategory])

  const filterOptions = useMemo(() => FILTER_OPTIONS_KEYS.map((key) => ({
    key,
    label: key === 'All' ? t('dashboard.filterAll') : t(`statuses.${key}`),
  })), [t])

  return (
    <PageTransition>
      <motion.div
        className="container"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
      <div className="card mb-lg">
        <PageHeader
          title={t('dashboard.mapView')}
          actions={<button onClick={() => navigate('/dashboard')} aria-label={t('admin.backToDashboard')}>{t('admin.backToDashboard')}</button>}
        />
        <div className="filter-row">
          <Filter size={16} className="text-muted flex-shrink-0 self-center" aria-hidden="true" />
          {filterOptions.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`filter-pill flex-shrink-0 ${filterStatus === f.key ? 'active' : ''}`}
              aria-label={t('map.filterByStatus') + ': ' + f.label}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="filter-row mt-sm">
          {PRIORITY_FILTER_KEYS.map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`filter-pill text-xs flex-shrink-0 ${filterPriority === p ? 'active' : ''}`}
              style={p !== 'All' && PRIORITY_COLORS[p] ? { borderLeft: `3px solid ${PRIORITY_COLORS[p]}` } : undefined}
              aria-label={`${t('map.filterByPriority')}: ${p === 'All' ? t('dashboard.filterAll') : t(`priorities.${p}`)}`}
            >
              {p === 'All' ? t('dashboard.filterAll') : t(`priorities.${p}`)}
            </button>
          ))}
        </div>

        <div className="filter-row mt-sm">
          {CATEGORY_FILTER_KEYS.map((c) => (
            <button
              key={c}
              onClick={() => setFilterCategory(c)}
              className={`filter-pill text-xs flex-shrink-0 ${filterCategory === c ? 'active' : ''}`}
              aria-label={`${t('map.filterByCategory')}: ${c === 'All' ? t('dashboard.filterAll') : t(`categories.${c}`)}`}
            >
              {c === 'All' ? t('dashboard.filterAll') : t(`categories.${c}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-0 relative">
        {loading && (
          <div className="inset-0">
            <SkeletonMap height="70vh" />
          </div>
        )}

        <div ref={mapRef} className="map-container-full w-full" aria-label={t('map.mapAriaLabel')} />

        {!loading && error && (
          <div className="flex flex-col flex-center inset-0 bg-elevated">
            <ErrorState message={error} />
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <EmptyState icon={<MapPin size={32} />} title={t('dashboard.noRequests')} description={t('map.noRequestsDesc')} />
        )}
      </div>

      <div className="flex gap-lg mt flex-wrap">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex text-sm gap-6 items-center">
            <MapPin size={14} style={{ color }} aria-hidden="true" />
            <span>{t(`statuses.${status}`)}</span>
          </div>
        ))}
      </div>
    </motion.div>
    </PageTransition>
  )
}