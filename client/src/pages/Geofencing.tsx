import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import L from 'leaflet'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'
import { clientApi } from '../api/client'
import { escapeHtml } from '../utils/escapeHtml'

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

function createMapIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;background:${color};border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:0 2px 4px rgba(0,0,0,.3)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

export default function Geofencing() {
  const { t } = useTranslation()
  const [position, setPosition] = useState<Position | null>(null)
  const [radius, setRadius] = useState(10)
  const [result, setResult] = useState<GeofencingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const markersRef = useRef<L.Marker[]>([])

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
    } catch (e) {
      setError((e as Error).message)
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
      // silently fail
    }
  }, [position, radius, result])

  const renderResultSection = (items: (ZoneResult | RequestResult | ResourceResult)[], color: string, bgLight: string, countLabel: string, itemRenderer: (item: ZoneResult | RequestResult | ResourceResult) => React.ReactNode) => {
    const safeItems = Array.isArray(items) ? items : []
    return (
      <div className="card text-center">
        <div className="text-3xl text-bold" style={{ color }}>{safeItems.length}</div>
        <div className="small muted">{countLabel}</div>
        {safeItems.map((item, idx) => (
          <div key={(item as { _id?: string; id?: string })._id || (item as { id?: string }).id || idx} className="text-sm mt-xs p-xs rounded-sm" style={{ background: bgLight }}>
            {itemRenderer(item)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card">
        <div className="headerRow">
          <div>
            <h2 className="pageTitle text-20">{t('nav.geofencing') || 'Geofencing Alerts'}</h2>
            <div className="small mt-xs">{t('geofencing.subtitle')}</div>
          </div>
        </div>

        {error && <div className="errorText mt-sm">{error}</div>}

        <div className="flex flex-gap-sm mt">
          <label className="small text-nowrap">{t('geofencing.radiusLabel')}</label>
          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            min="1"
            max="500"
            className="rounded-sm w-80 text-13 border-gov" style={{ padding: '6px 10px' }}
          />
          {position && <span className="small muted">{position.lat.toFixed(4)}, {position.lng.toFixed(4)}</span>}
          <button
            onClick={checkArea}
            disabled={loading || !position}
            className="btnPrimary text-sm p-sm"
          >
            {loading ? t('geofencing.checking') : t('geofencing.checkArea')}
          </button>
        </div>
      </div>

      <div className="card p-0 mt">
        <div ref={mapRef} className="map-container-full map-container-60vh" />
      </div>

      {result && (
        <div className="grid-3 mt">
          {renderResultSection(
            result.zones || [],
            'var(--gov-blue)',
            'var(--accent-soft)',
            t('geofencing.zonesInArea'),
            (z) => <>{'name' in z ? z.name : ''} <span className="text-muted">({'distanceKm' in z ? z.distanceKm : ''} km)</span></>
          )}
          {renderResultSection(
            result.requests || [],
            'var(--gov-danger)',
            'var(--danger-soft)',
            t('geofencing.requestsNearby'),
            (r) => <>{'title' in r ? r.title : ''} <span className="text-muted">({'distanceKm' in r ? r.distanceKm : ''} km)</span></>
          )}
          {renderResultSection(
            result.resources || [],
            'var(--gov-green)',
            'var(--success-soft)',
            t('geofencing.resourcesNearby'),
            (r) => <>{'name' in r ? r.name : ''} <span className="text-muted">({'distanceKm' in r ? r.distanceKm : ''} km)</span></>
          )}
        </div>
      )}
    </div>
  )
}
