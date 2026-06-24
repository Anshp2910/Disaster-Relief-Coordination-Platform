import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import L from 'leaflet'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'
import { clientApi } from '../api/client'
import { escapeHtml } from '../utils/escapeHtml'

const DEFAULT_CENTER = [20.5937, 78.9629]
const SEVERITY_COLORS = { Critical: 'var(--severity-critical)', High: 'var(--severity-high)', Medium: 'var(--severity-medium)', Low: 'var(--severity-low)' }

function createMapIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;background:${color};border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:0 2px 4px rgba(0,0,0,.3)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

export default function Geofencing() {
  const { t } = useTranslation()
  const [position, setPosition] = useState(null)
  const [radius, setRadius] = useState(10)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const circleRef = useRef(null)
  const markersRef = useRef([])

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
      const data = await clientApi.checkGeofencing(position.lat, position.lng, radius)
      setResult(data)
    } catch (e) {
      setError(e.message)
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

    let map
    try {
      map = initLeafletMap(mapRef.current)
    } catch (err) {
      // silently fail
      return
    }
    mapInstanceRef.current = map

    const onResize = () => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize() }
    window.addEventListener('resize', onResize)
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize)

    map.on('click', (e) => {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng })
    })

    return () => {
      window.removeEventListener('resize', onResize)
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize)
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

      const addMarker = (lat, lng, popup, color) => {
        const marker = L.marker([lat, lng], { icon: createMapIcon(color) }).addTo(map).bindPopup(popup)
        markersRef.current.push(marker)
      }

      ;(result.zones || []).forEach((z) => {
        addMarker(z.centerLat, z.centerLng, `<b>${escapeHtml(z.name)}</b><br>${escapeHtml(z.severity)} zone<br>${z.distanceKm} km away`, SEVERITY_COLORS[z.severity] || '#999')
      })
      ;(result.requests || []).forEach((r) => {
        if (r.lat && r.lng) addMarker(r.lat, r.lng, `<b>Request:</b> ${escapeHtml(r.title)}<br>${r.distanceKm} km away`, 'var(--gov-danger)')
      })
      ;(result.resources || []).forEach((r) => {
        if (r.lat && r.lng) addMarker(r.lat, r.lng, `<b>Resource:</b> ${escapeHtml(r.name)}<br>${r.distanceKm} km away`, 'var(--gov-green)')
      })
    } catch (err) {
      // silently fail
    }
  }, [position, radius, result])

  const renderResultSection = (items, color, bgLight, countLabel, itemRenderer) => {
    const safeItems = Array.isArray(items) ? items : []
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 28, fontWeight: 700, color }}>{safeItems.length}</div>
        <div className="small muted">{countLabel}</div>
        {safeItems.map((item, idx) => (
          <div key={item._id || item.id || idx} style={{ fontSize: 12, marginTop: 4, padding: '4px 8px', borderRadius: 4, background: bgLight }}>
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
            <h2 className="pageTitle" style={{ fontSize: 20 }}>{t('nav.geofencing') || 'Geofencing Alerts'}</h2>
            <div className="small" style={{ marginTop: 4 }}>{t('geofencing.subtitle')}</div>
          </div>
        </div>

        {error && <div className="errorText" style={{ marginTop: 8 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
          <label className="small" style={{ whiteSpace: 'nowrap' }}>{t('geofencing.radiusLabel')}</label>
          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            min="1"
            max="500"
            style={{ width: 80, padding: '6px 10px', border: '1px solid var(--gov-border)', borderRadius: 6, fontSize: 13 }}
          />
          {position && <span className="small muted">{position.lat.toFixed(4)}, {position.lng.toFixed(4)}</span>}
          <button
            className="btnPrimary"
            onClick={checkArea}
            disabled={loading || !position}
            style={{ fontSize: 12, padding: '6px 16px' }}
          >
            {loading ? t('geofencing.checking') : t('geofencing.checkArea')}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, marginTop: 12 }}>
        <div ref={mapRef} className="map-container-full" style={{ height: '60vh', width: '100%', maxWidth: '100%' }} />
      </div>

      {result && (
        <div className="grid-3" style={{ marginTop: 12 }}>
          {renderResultSection(
            result.zones || [],
            'var(--gov-blue)',
            'rgba(0,0,128,.06)',
            t('geofencing.zonesInArea'),
            (z) => <>{z.name} <span style={{ color: 'var(--gov-muted)' }}>({z.distanceKm} km)</span></>
          )}
          {renderResultSection(
            result.requests || [],
            'var(--gov-danger)',
            'rgba(248,81,73,.06)',
            t('geofencing.requestsNearby'),
            (r) => <>{r.title} <span style={{ color: 'var(--gov-muted)' }}>({r.distanceKm} km)</span></>
          )}
          {renderResultSection(
            result.resources || [],
            'var(--gov-green)',
            'rgba(63,185,80,.06)',
            t('geofencing.resourcesNearby'),
            (r) => <>{r.name} <span style={{ color: 'var(--gov-muted)' }}>({r.distanceKm} km)</span></>
          )}
        </div>
      )}
    </div>
  )
}
