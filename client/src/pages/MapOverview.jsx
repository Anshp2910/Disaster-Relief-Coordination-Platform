import { useEffect, useState, useRef, useMemo, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { SkeletonMap } from '../components/Skeleton'

const STATUS_COLORS = {
  Open: '#000080',
  Pending: '#666',
  'In Progress': '#cc7a00',
  Resolved: '#138808',
  Fulfilled: '#0d6e06',
}

const DEFAULT_CENTER = [20.5937, 78.9629]

const FILTER_OPTIONS_KEYS = ['All', 'Open', 'Pending', 'In Progress', 'Resolved', 'Fulfilled']

export default function MapOverview() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filterStatus, setFilterStatus] = useState('All')
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    clientApi
      .getRequests({ limit: 1000 })
      .then((data) => {
        setItems(data.items || [])
        setLoading(false)
      })
      .catch((e) => {
        setError(e.message || 'Failed to load request data')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    if (loading || !mapRef.current || mapInstanceRef.current) return

    let cancelled = false
    let map = null

    const init = () => {
      if (cancelled || !mapRef.current || mapInstanceRef.current) return
      map = L.map(mapRef.current).setView(DEFAULT_CENTER, 5)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map)
      mapInstanceRef.current = map
      requestAnimationFrame(() => {
        map.invalidateSize()
        setTimeout(() => map.invalidateSize(), 300)
        setTimeout(() => map.invalidateSize(), 800)
      })
    }

    requestAnimationFrame(init)

    return () => {
      cancelled = true
      if (map) {
        map.remove()
        mapInstanceRef.current = null
      }
    }
  }, [loading])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    markersRef.current.forEach((m) => map.removeLayer(m))
    markersRef.current = []

    const filtered = filterStatus === 'All' ? items : items.filter((i) => i.status === filterStatus)

    filtered.forEach((item) => {
      if (item.lat == null || item.lng == null) return

      const color = STATUS_COLORS[item.status] || '#000080'
      const marker = L.circleMarker([item.lat, item.lng], {
        radius: 8,
        fillColor: color,
        color: '#fff',
        weight: 2,
        fillOpacity: 0.9,
      }).addTo(map)

      marker.bindPopup(`
        <div style="min-width:180px">
          <div style="font-weight:700;font-size:13px;margin-bottom:4px">${item.title}</div>
          <div style="font-size:12px;color:#666;margin-bottom:4px">${t(`statuses.${item.status}`)} | ${t(`priorities.${item.priority}`)}</div>
          <div style="font-size:12px;color:#666;margin-bottom:8px">${item.locationName}</div>
          <a href="/requests/${item._id}" style="display:inline-block;background:#000080;color:#fff;text-decoration:none;padding:4px 10px;border-radius:4px;font-size:12px">View Details</a>
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
  }, [items, filterStatus, t])

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
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 1000 }}>
            <SkeletonMap height="70vh" />
          </div>
        )}

        <div ref={mapRef} style={{ height: '70vh', width: '100%' }} />

        {!loading && error && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.95)', zIndex: 1000 }}>
            <div style={{ fontSize: 16, color: '#cc0000', marginBottom: 8 }}>{t('dashboard.error') || 'Error'}</div>
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
