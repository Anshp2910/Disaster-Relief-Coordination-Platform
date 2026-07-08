import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { MapPin, Crosshair, Target, Package, Activity } from 'lucide-react'
import { PageHeader, ErrorState, DataTable, RippleBtn, PageTransition } from '../components/ui'
import L from 'leaflet'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'
import { clientApi } from '../api/client'
import { escapeHtml } from '../utils/escapeHtml'
import { getErrorMessage } from '../utils/getErrorMessage'

const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629]
const SEVERITY_COLORS: Record<string, string> = { Critical: 'var(--severity-critical)', High: 'var(--severity-high)', Medium: 'var(--severity-medium)', Low: 'var(--severity-low)' }

interface Position {
  lat: number
  lng: number
}

interface ZoneResult {
  name?: string
  severity?: string
  centerLat?: number
  centerLng?: number
  distanceKm?: number
}

interface RequestResult {
  _id?: string
  id?: string
  title?: string
  lat?: number
  lng?: number
  distanceKm?: number
}

interface ResourceResult {
  _id?: string
  id?: string
  name?: string
  lat?: number
  lng?: number
  distanceKm?: number
}

interface GeofencingResult {
  zones?: ZoneResult[]
  requests?: RequestResult[]
  resources?: ResourceResult[]
}

interface CheckHistoryEntry {
  timestamp: Date
  radius: number
  position: Position
  zonesCount: number
  requestsCount: number
  resourcesCount: number
}

const MAX_HISTORY = 20

function createMapIcon(color: string) {
  return L.divIcon({
    className: 'marker-pulse',
    html: `<div style="width:22px;height:22px;background:${color};border:2px solid var(--bg-card);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:var(--text-3xs);box-shadow:var(--shadow-md)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

export default function Geofencing() {
  useEffect(() => { document.title = 'Disaster Relief - Geofencing' }, [])
  const { t } = useTranslation()
  const [position, setPosition] = useState<Position | null>(null)
  const [radius, setRadius] = useState(10)
  const [result, setResult] = useState<GeofencingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [monitoring, setMonitoring] = useState(false)
  const [checkHistory, setCheckHistory] = useState<CheckHistoryEntry[]>([])

  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const markersRef = useRef<L.Marker[]>([])
  const monitorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!navigator.geolocation) {
      setPosition({ lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setPosition({ lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] })
    )
  }, [])

  const checkArea = useCallback(async () => {
    if (!position) return
    setLoading(true)
    setError('')
    try {
      const data = await clientApi.checkGeofencing(position.lat, position.lng, radius) as GeofencingResult
      setResult(data)

      setCheckHistory((prev) => {
        const entry: CheckHistoryEntry = {
          timestamp: new Date(),
          radius,
          position,
          zonesCount: (data.zones || []).length,
          requestsCount: (data.requests || []).length,
          resourcesCount: (data.resources || []).length,
        }
        const next = [entry, ...prev]
        return next.slice(0, MAX_HISTORY)
      })
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [position, radius])

  useEffect(() => {
    if (!position) return
    checkArea()
  }, [position, checkArea])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    let map: L.Map | undefined
    try {
      map = initLeafletMap(mapRef.current)
    } catch {
      return
    }
    mapInstanceRef.current = map

    const onResize = () => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize() }
    window.addEventListener('resize', onResize)
    if (window.visualViewport) (window.visualViewport as EventTarget).addEventListener('resize', onResize)

    map.on('click', (e: L.LeafletMouseEvent) => {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng })
    })

    return () => {
      window.removeEventListener('resize', onResize)
      if (window.visualViewport) (window.visualViewport as EventTarget).removeEventListener('resize', onResize)
      cleanupLeafletMap(map)
      mapInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!position || !mapInstanceRef.current) return
    try {
      const map = mapInstanceRef.current
      map.setView([position.lat, position.lng], 10)

      if (circleRef.current) map.removeLayer(circleRef.current)
      circleRef.current = L.circle([position.lat, position.lng], {
        radius: radius * 1000,
        fillColor: 'var(--gov-blue)',
        fillOpacity: 0.08,
        color: 'var(--gov-blue)',
        weight: 2,
        dashArray: '6,4',
      }).addTo(map)

      markersRef.current.forEach((m) => map.removeLayer(m))
      markersRef.current = []

      if (!result) return

      const addMarker = (lat: number, lng: number, popup: string, color: string) => {
        const marker = L.marker([lat, lng], { icon: createMapIcon(color) }).addTo(map).bindPopup(popup)
        markersRef.current.push(marker)
      }

      ;(result.zones || []).forEach((z) => {
        if (z.centerLat && z.centerLng) addMarker(z.centerLat, z.centerLng, `<b>${escapeHtml(z.name || '')}</b><br>${escapeHtml(z.severity || '')} zone<br>${z.distanceKm} km away`, SEVERITY_COLORS[z.severity || ''] || 'var(--text-muted)')
      })
      ;(result.requests || []).forEach((r) => {
        if (r.lat && r.lng) addMarker(r.lat, r.lng, `<b>Request:</b> ${escapeHtml(r.title || '')}<br>${r.distanceKm} km away`, 'var(--gov-danger)')
      })
      ;(result.resources || []).forEach((r) => {
        if (r.lat && r.lng) addMarker(r.lat, r.lng, `<b>Resource:</b> ${escapeHtml(r.name || '')}<br>${r.distanceKm} km away`, 'var(--gov-green)')
      })
    } catch {
      // quiet
    }
  }, [position, radius, result])

  useEffect(() => {
    if (monitoring) {
      monitorIntervalRef.current = setInterval(() => {
        checkArea()
      }, 30000)
    } else {
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current)
        monitorIntervalRef.current = null
      }
    }
    return () => {
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current)
        monitorIntervalRef.current = null
      }
    }
  }, [monitoring, checkArea])

  function toggleMonitoring() {
    setMonitoring((prev) => !prev)
  }

  function useMyLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    )
  }

  const renderResultSection = (items: (ZoneResult | RequestResult | ResourceResult)[], color: string, bgLight: string, countLabel: string, itemRenderer: (item: ZoneResult | RequestResult | ResourceResult) => React.ReactNode, icon?: React.ReactNode) => {
    const safeItems = Array.isArray(items) ? items : []
    return (
      <motion.div
        className="card text-center"
        variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
      >
        {icon && <div className="mb-xs" style={{ color }}>{icon}</div>}
        <div className="text-3xl text-bold" style={{ color }}>{safeItems.length}</div>
        <div className="small muted">{countLabel}</div>
        {safeItems.map((item, idx) => (
          <div key={(item as { _id?: string; id?: string })._id || (item as { id?: string }).id || idx} className="text-sm mt-xs p-xs rounded-sm" style={{ background: bgLight }}>
            {itemRenderer(item)}
          </div>
        ))}
      </motion.div>
    )
  }

  function formatTime(d: Date): string {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <PageTransition>
      <div className="container">
      <motion.div
        className="card"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
      >
        <PageHeader title={t('nav.geofencing') || 'Geofencing Alerts'} subtitle={t('geofencing.subtitle')} />

        {error && <ErrorState message={error} />}

        <motion.div className="flex flex-gap-sm mt items-center flex-wrap" variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
          <label className="small text-nowrap" htmlFor="geo-radius">{t('geofencing.radiusLabel')}</label>
          <input
            id="geo-radius"
            type="number"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            min="1"
            max="500"
            className="rounded-sm w-80 text-13 border-gov p-xs"
            aria-label={t('geofencing.radiusLabel')}
          />
          <input
            type="range"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            min="1"
            max="500"
            className="w-160"
            style={{ accentColor: 'var(--gov-blue)' }}
            aria-label={t('geofencing.radiusSlider')}
          />
          {position && (
            <span className="small muted flex items-center gap-xs">
              <MapPin size={14} aria-hidden="true" />
              {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
            </span>
          )}
          <button
            onClick={useMyLocation}
            disabled={!navigator.geolocation}
            className="text-sm btn-pill flex items-center gap-xs"
            title={t('geofencing.useMyLocation')}
            aria-label={t('geofencing.useMyLocation')}
          >
            <Crosshair size={16} />
          </button>
          <RippleBtn
            onClick={checkArea}
            disabled={loading || !position}
            className="text-sm p-sm flex items-center gap-xs"
            aria-label={t('geofencing.checkArea') || 'Check area'}
          >
            <Target size={16} />
            {loading ? t('geofencing.checking') : t('geofencing.checkArea')}
          </RippleBtn>
          <button
            onClick={toggleMonitoring}
            disabled={!position}
            className={`text-sm p-sm flex items-center gap-xs ${monitoring ? 'btn-danger' : 'btn-pill'}`}
            aria-label={monitoring ? t('geofencing.stopMonitoring') : t('geofencing.startMonitoring')}
          >
            <Activity size={16} />
            {monitoring ? t('geofencing.stopMonitoring') : t('geofencing.startMonitoring')}
          </button>
        </motion.div>

        {monitoring && (
          <motion.div
            className="flex flex-gap-sm mt-sm items-center"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'var(--gov-danger)',
                animation: 'geofencePulse 1.5s ease-in-out infinite',
              }}
              aria-hidden="true"
            />
            <span className="small muted text-12">{t('geofencing.autoRefresh')}</span>
          </motion.div>
        )}
      </motion.div>

      <motion.div
        className="card p-0 mt"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <div ref={mapRef} className="map-container-full map-container-60vh" aria-label={t('geofencing.geofencingMap')} />
      </motion.div>

      {result && (
        <motion.div
          className="grid-3 mt"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        >
          {renderResultSection(
            result.zones || [],
            'var(--gov-blue)',
            'var(--accent-soft)',
            t('geofencing.zonesInArea'),
            (z) => <>{'name' in z ? z.name : ''} <span className="text-muted">({'distanceKm' in z ? z.distanceKm : ''} {t('zones.km')})</span></>,
            <Target size={24} />
          )}
          {renderResultSection(
            result.requests || [],
            'var(--gov-danger)',
            'var(--danger-soft)',
            t('geofencing.requestsNearby'),
            (r) => <>{'title' in r ? r.title : ''} <span className="text-muted">({'distanceKm' in r ? r.distanceKm : ''} {t('zones.km')})</span></>,
            <Activity size={24} />
          )}
          {renderResultSection(
            result.resources || [],
            'var(--gov-green)',
            'var(--success-soft)',
            t('geofencing.resourcesNearby'),
            (r) => <>{'name' in r ? r.name : ''} <span className="text-muted">({'distanceKm' in r ? r.distanceKm : ''} {t('zones.km')})</span></>,
            <Package size={24} />
          )}
        </motion.div>
      )}

      {checkHistory.length > 0 && (
        <motion.div
          className="card mt"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.3 }}
        >
          <div className="text-base text-semi mb-sm">{t('geofencing.checkHistory') || 'Check History'}</div>
            <DataTable
            columns={[
              { id: 'time', header: t('geofencing.columnTime'), accessor: (e) => formatTime(e.timestamp), sortable: true },
              { id: 'radius', header: t('geofencing.columnRadius'), accessor: 'radius', sortable: true },
              { id: 'zones', header: t('geofencing.columnZones'), accessor: 'zonesCount', sortable: true },
              { id: 'requests', header: t('geofencing.columnRequests'), accessor: 'requestsCount', sortable: true },
              { id: 'resources', header: t('geofencing.columnResources'), accessor: 'resourcesCount', sortable: true },
            ]}
            data={[...checkHistory].reverse()}
            keyExtractor={(entry: CheckHistoryEntry) => entry.timestamp.getTime()}
            searchable={false}
            sortable
            exportable={false}
            columnVisibility={false}
            pageSize={10}
          />
        </motion.div>
      )}
    </div>
    </PageTransition>
  )
}