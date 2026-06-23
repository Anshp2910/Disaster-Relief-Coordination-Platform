import { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { SkeletonMap } from '../components/Skeleton'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { escapeHtml } from '../utils/escapeHtml'

const STATUS_COLORS = {
  Open: 'var(--color-open)',
  Pending: 'var(--color-pending)',
  'In Progress': 'var(--color-progress)',
  Resolved: 'var(--color-resolved)',
  Fulfilled: 'var(--color-fulfilled)',
}

const PRIORITY_COLORS = {
  Critical: 'var(--color-critical)',
  High: 'var(--color-high)',
  Medium: 'var(--color-medium)',
  Low: 'var(--color-low)',
}

const DEFAULT_CENTER = [20.5937, 78.9629]

const FILTER_OPTIONS_KEYS = ['All', 'Open', 'Pending', 'In Progress', 'Resolved', 'Fulfilled']
const PRIORITY_FILTER_KEYS = ['All', 'Critical', 'High', 'Medium', 'Low']
const CATEGORY_FILTER_KEYS = ['All', 'Medical', 'Food', 'Shelter', 'Water', 'Rescue', 'Supplies', 'Healthcare', 'Sanitation', 'Clothing', 'Transportation', 'Communication', 'Power', 'Infrastructure', 'Other']

export default function MapOverview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterPriority, setFilterPriority] = useState('All')
  const [filterCategory, setFilterCategory] = useState('All')
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])

  const load = useCallback(async () => {
    try {
      const data = await clientApi.getRequests({ limit: 1000 })
      setItems(data.items || [])
      setLoading(false)
    } catch (e) {
      setError(e.message || 'Failed to load request data')
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useAutoRefresh(load, { interval: 20000 })

  useEffect(() => {
    if (loading || !mapRef.current || mapInstanceRef.current) return

    let cancelled = false
    let map = null

    const init = () => {
      if (cancelled || !mapRef.current || mapInstanceRef.current) return
      map = initLeafletMap(mapRef.current)
      mapInstanceRef.current = map
    }

    requestAnimationFrame(init)

    const onResize = () => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize() }
    window.addEventListener('resize', onResize)
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize)

    return () => {
      cancelled = true
      window.removeEventListener('resize', onResize)
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize)
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

      const color = STATUS_COLORS[item.status] || 'var(--color-open)'
      const marker = L.circleMarker([item.lat, item.lng], {
        radius: 8,
        fillColor: color,
        color: 'var(--gov-white)',
        weight: 2,
        fillOpacity: 0.9,
      }).addTo(map)

      marker.bindPopup(`
        <div style="min-width:180px">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">${escapeHtml(item.title)}</div>
          <div style="font-size:12px;color:var(--gov-muted);margin-bottom:4px">${t(`statuses.${item.status}`)} | ${t(`priorities.${item.priority}`)}</div>
          <div style="font-size:12px;color:var(--gov-muted);margin-bottom:8px">${escapeHtml(item.locationName)}</div>
          <a href="#/requests/${escapeHtml(item._id)}" style="display:inline-block;background:linear-gradient(135deg,var(--neon-cyan),var(--neon-purple));color:#fff;text-decoration:none;padding:4px 10px;border-radius:4px;font-size:12px">View Details</a>
        </div>
      `)

      markersRef.current.push(marker)
    })

    if (filtered.length > 0) {
      const coords = filtered.filter((i) => i.lat != null && i.lng != null).map((i) => [i.lat, i.lng])
      if (coords.length > 0) {
        const bounds = L.latLngBounds(coords)
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] })
      }
    }
  }, [items, filterStatus, filterPriority, filterCategory, t])

  const filterOptions = useMemo(() => FILTER_OPTIONS_KEYS.map((key) => ({
    key,
    label: key === 'All' ? t('dashboard.filterAll') : t(`statuses.${key}`),
  })), [t])

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="headerRow">
          <h2 className="pageTitle" style={{ fontSize: 20, margin: 0 }}>{t('dashboard.mapView')}</h2>
          <button onClick={() => navigate('/dashboard')}>{t('admin.backToDashboard')}</button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {filterOptions.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`filter-pill ${filterStatus === f.key ? 'active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {PRIORITY_FILTER_KEYS.map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`filter-pill ${filterPriority === p ? 'active' : ''}`}
              style={{ fontSize: 11, ...(p !== 'All' && PRIORITY_COLORS[p] ? { borderLeft: `3px solid ${PRIORITY_COLORS[p]}` } : {}) }}
            >
              {p === 'All' ? t('dashboard.filterAll') : t(`priorities.${p}`)}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {CATEGORY_FILTER_KEYS.map((c) => (
            <button
              key={c}
              onClick={() => setFilterCategory(c)}
              className={`filter-pill ${filterCategory === c ? 'active' : ''}`}
              style={{ fontSize: 11 }}
            >
              {c === 'All' ? t('dashboard.filterAll') : t(`categories.${c}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 1000 }}>
            <SkeletonMap height="70vh" />
          </div>
        )}

        <div ref={mapRef} className="map-container-full" style={{ height: '70vh', width: '100%', maxWidth: '100%' }} />

        {!loading && error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.95)', zIndex: 1000 }}>
            <div style={{ fontSize: 16, color: 'var(--gov-danger)', marginBottom: 8 }}>{t('dashboard.error') || 'Error'}</div>
            <div className="muted">{error}</div>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.95)', zIndex: 1000 }}>
            <img src="/images/empty-map.svg" alt="No locations" loading="lazy" width="260" height="180" style={{ width: 260, height: 'auto', marginBottom: 16 }} />
            <div className="muted">{t('dashboard.noRequests')}</div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
            <span>{t(`statuses.${status}`)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
