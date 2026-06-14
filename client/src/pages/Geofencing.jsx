import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { clientApi } from '../api/client'

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
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setPosition({ lat: 20.5937, lng: 78.9629 })
      )
    } else {
      setPosition({ lat: 20.5937, lng: 78.9629 })
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
    mapInstanceRef.current = map

    map.on('click', (e) => {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng })
    })

    return () => { map.remove(); mapInstanceRef.current = null }
  }, [])

  useEffect(() => {
    if (!position || !mapInstanceRef.current) return
    const map = mapInstanceRef.current
    map.setView([position.lat, position.lng], 10)

    if (circleRef.current) map.removeLayer(circleRef.current)
    circleRef.current = L.circle([position.lat, position.lng], {
      radius: radius * 1000, fillColor: '#000080', fillOpacity: 0.08, color: '#000080', weight: 2, dashArray: '6,4',
    }).addTo(map)

    markersRef.current.forEach((m) => map.removeLayer(m))
    markersRef.current = []

    if (result) {
      const addMarker = (lat, lng, popup, color) => {
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:22px;height:22px;background:${color};border:2px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:0 2px 4px rgba(0,0,0,.3)"></div>`,
          iconSize: [22, 22], iconAnchor: [11, 11],
        })
        const m = L.marker([lat, lng], { icon }).addTo(map).bindPopup(popup)
        markersRef.current.push(m)
      }

      const SEVERITY_COLORS = { Critical: '#cc0000', High: '#cc6600', Medium: '#FF9933', Low: '#138808' }
      ;(result.zones || []).forEach((z) => addMarker(z.centerLat, z.centerLng, `<b>${z.name}</b><br>${z.severity} zone<br>${z.distanceKm} km away`, SEVERITY_COLORS[z.severity] || '#999'))
      ;(result.requests || []).forEach((r) => { if (r.lat && r.lng) addMarker(r.lat, r.lng, `<b>Request:</b> ${r.title}<br>${r.distanceKm} km away`, '#cc0000') })
      ;(result.resources || []).forEach((r) => { if (r.lat && r.lng) addMarker(r.lat, r.lng, `<b>Resource:</b> ${r.name}<br>${r.distanceKm} km away`, '#138808') })
    }
  }, [position, radius, result])

  async function checkArea() {
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
  }

  return (
    <div className="container">
      <div className="card">
        <div className="headerRow">
          <div>
            <h2 className="pageTitle" style={{ fontSize: 20 }}>{t('nav.geofencing') || 'Geofencing Alerts'}</h2>
            <div className="small" style={{ marginTop: 4 }}>Click map to set center, then check area</div>
          </div>
        </div>
        {error && <div className="errorText" style={{ marginTop: 8 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
          <label className="small" style={{ whiteSpace: 'nowrap' }}>Radius (km):</label>
          <input type="number" value={radius} onChange={(e) => setRadius(Number(e.target.value))} min="1" max="500" style={{ width: 80, padding: '6px 10px', border: '1px solid var(--gov-border)', borderRadius: 6, fontSize: 13 }} />
          {position && <span className="small muted">{position.lat.toFixed(4)}, {position.lng.toFixed(4)}</span>}
          <button className="btnPrimary" onClick={checkArea} disabled={loading || !position} style={{ fontSize: 12, padding: '6px 16px' }}>{loading ? 'Checking...' : 'Check Area'}</button>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', marginTop: 12 }}>
        <div ref={mapRef} style={{ height: '60vh', width: '100%' }} />
      </div>

      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 12 }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--gov-blue)' }}>{(result.zones || []).length}</div>
            <div className="small muted">Zones in area</div>
            {(result.zones || []).map((z) => (
              <div key={z._id} style={{ fontSize: 12, marginTop: 4, padding: '4px 8px', borderRadius: 4, background: 'rgba(0,0,128,.06)' }}>
                {z.name} <span style={{ color: '#666' }}>({z.distanceKm} km)</span>
              </div>
            ))}
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#cc0000' }}>{(result.requests || []).length}</div>
            <div className="small muted">Requests nearby</div>
            {(result.requests || []).map((r) => (
              <div key={r._id} style={{ fontSize: 12, marginTop: 4, padding: '4px 8px', borderRadius: 4, background: 'rgba(204,0,0,.06)' }}>
                {r.title} <span style={{ color: '#666' }}>({r.distanceKm} km)</span>
              </div>
            ))}
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#138808' }}>{(result.resources || []).length}</div>
            <div className="small muted">Resources nearby</div>
            {(result.resources || []).map((r) => (
              <div key={r._id} style={{ fontSize: 12, marginTop: 4, padding: '4px 8px', borderRadius: 4, background: 'rgba(19,136,8,.06)' }}>
                {r.name} <span style={{ color: '#666' }}>({r.distanceKm} km)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
