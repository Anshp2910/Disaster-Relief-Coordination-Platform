import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { clientApi } from '../api/client'

const pinIcon = L.divIcon({
  className: '',
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  html: `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z" fill="#000080"/>
    <circle cx="15" cy="14" r="6" fill="#fff"/>
  </svg>`,
})

export default function CreateRequest() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [locationName, setLocationName] = useState('')
  const [searchText, setSearchText] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [category, setCategory] = useState('Other')
  const [priority, setPriority] = useState('Medium')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)

  const navigate = useNavigate()
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const marker = useRef(null)

  useEffect(() => {
    if (mapInstance.current) return
    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    map.on('click', (e) => {
      const { lat: pLat, lng: pLng } = e.latlng
      placeMarker(pLat, pLng)
    })

    mapInstance.current = map
  }, [])

  function placeMarker(pLat, pLng) {
    setLat(String(pLat))
    setLng(String(pLng))
    setLocationName(`${pLat.toFixed(5)}, ${pLng.toFixed(5)}`)
    if (marker.current) {
      marker.current.setLatLng([pLat, pLng])
    } else {
      marker.current = L.marker([pLat, pLng], { icon: pinIcon }).addTo(mapInstance.current)
    }
    mapInstance.current.setView([pLat, pLng], 12)
    mapInstance.current.invalidateSize()
  }

  function useMyLocation() {
    if (!navigator.geolocation) return setError('Geolocation is not supported by your browser.')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: pLat, longitude: pLng } = pos.coords
        placeMarker(pLat, pLng)
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pLat}&lon=${pLng}`, {
          headers: { 'Accept-Language': 'en' },
        })
          .then((r) => r.json())
          .then((data) => {
            setLocationName(data.display_name || `${pLat.toFixed(5)}, ${pLng.toFixed(5)}`)
          })
          .catch(() => {})
        setLocating(false)
      },
      () => {
        setError('Unable to retrieve your location.')
        setLocating(false)
      }
    )
  }

  async function onSearch(e) {
    e.preventDefault()
    if (!searchText.trim()) return
    setSearching(true)
    setSuggestions([])
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const data = await res.json()
      setSuggestions(data)
    } catch {
      setSuggestions([])
    } finally {
      setSearching(false)
    }
  }

  function pickSuggestion(s) {
    const pLat = parseFloat(s.lat)
    const pLng = parseFloat(s.lon)
    placeMarker(pLat, pLng)
    setLocationName(s.display_name || s.name || searchText)
    setSuggestions([])
    setSearchText('')
    setTimeout(() => {
      if (mapInstance.current) mapInstance.current.invalidateSize()
    }, 0)
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (!lat || !lng) return setError('Please select a location by clicking on the map or searching.')
      await clientApi.createRequest({
        title,
        description,
        locationName: locationName || `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
        lat: Number(lat),
        lng: Number(lng),
        category,
        priority,
      })
      navigate('/dashboard')
    } catch (e2) {
      setError(e2.message || 'Failed to create request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <div className="card">
        <h2 className="pageTitle" style={{ fontSize: 20 }}>Create Disaster Relief Request</h2>
        <div className="small muted" style={{ marginTop: 4 }}>
          Fill in the details below to submit a new relief request
        </div>

        {error ? <div className="errorText">{error}</div> : null}

        <form onSubmit={onSubmit} className="inputGrid" style={{ marginTop: 16 }}>
          <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />

          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            style={{ resize: 'vertical' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 4 }}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="Medical">Medical</option>
                <option value="Food">Food</option>
                <option value="Shelter">Shelter</option>
                <option value="Water">Water</option>
                <option value="Rescue">Rescue</option>
                <option value="Supplies">Supplies</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 4 }}>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="card" style={{ padding: 12, background: '#f8f8f8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <div>
                <div className="pageTitle" style={{ marginBottom: 4, fontSize: 15 }}>
                  Select Location
                </div>
                <div style={{ color: '#666', fontSize: 13 }}>
                  Search, use your location, or click on the map.
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#555' }}>
                {lat && lng ? (
                  <>
                    <div><b>Lat:</b> {Number(lat).toFixed(5)}</div>
                    <div><b>Lng:</b> {Number(lng).toFixed(5)}</div>
                  </>
                ) : (
                  <span>Not selected</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                style={{
                  flex: '0 0 auto', padding: '8px 14px', borderRadius: 4,
                  border: '1px solid #ccc', background: '#fff',
                  color: '#333', fontSize: 13, whiteSpace: 'nowrap',
                  cursor: locating ? 'wait' : 'pointer',
                }}
              >
                {locating ? 'Locating...' : 'Use My Location'}
              </button>

              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => { setSearchText(e.target.value); setSuggestions([]) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSearch(e) } }}
                  placeholder="Search for a place..."
                  style={{
                    width: '100%', padding: '10px 12px', paddingRight: 70,
                    borderRadius: 4, border: '1px solid #ccc',
                    background: '#fff', color: '#333',
                    fontSize: 14, boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={onSearch}
                  disabled={searching}
                  style={{
                    position: 'absolute', right: 4, top: 4, bottom: 4,
                    padding: '4px 12px', borderRadius: 4, border: 'none',
                    background: '#000080', color: '#fff', fontSize: 13,
                    cursor: searching ? 'wait' : 'pointer',
                  }}
                >
                  {searching ? '...' : 'Search'}
                </button>

                {suggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', zIndex: 1000, top: '100%', left: 0, right: 0,
                    background: '#fff', border: '1px solid #ccc',
                    borderRadius: 4, marginTop: 4, maxHeight: 200, overflowY: 'auto',
                  }}>
                    {suggestions.map((s, i) => (
                      <div
                        key={i}
                        onClick={() => pickSuggestion(s)}
                        style={{
                          padding: '8px 12px', cursor: 'pointer',
                          borderBottom: i < suggestions.length - 1 ? '1px solid #eee' : 'none',
                          color: '#333', fontSize: 13,
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        {s.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div
              ref={mapRef}
              className="mapBox"
              role="application"
              aria-label="Map for selecting location"
            />
          </div>

          <div className="btnRow">
            <button disabled={loading || !lat} type="submit" className="btnPrimary">
              {loading ? 'Creating...' : !lat ? 'Select a location first' : 'Create Request'}
            </button>
            <button type="button" onClick={() => navigate('/dashboard')}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
