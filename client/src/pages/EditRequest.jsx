import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTranslation } from 'react-i18next'
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

export default function EditRequest() {
  const { id } = useParams()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [locationName, setLocationName] = useState('')
  const [status, setStatus] = useState('Open')
  const [category, setCategory] = useState('Other')
  const [priority, setPriority] = useState('Medium')
  const [peopleCount, setPeopleCount] = useState(1)
  const [searchText, setSearchText] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [locating, setLocating] = useState(false)

  const navigate = useNavigate()
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const marker = useRef(null)
  const { t } = useTranslation()

  useEffect(() => {
    if (fetching || mapInstance.current) return
    if (!mapRef.current) return
    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    map.on('click', (e) => {
      const { lat: pLat, lng: pLng } = e.latlng
      placeMarker(pLat, pLng)
    })

    mapInstance.current = map
  }, [fetching])

  useEffect(() => {
    async function load() {
      try {
        const { item } = await clientApi.getRequest(id)
        setTitle(item.title)
        setDescription(item.description)
        setStatus(item.status || 'Open')
        setCategory(item.category || 'Other')
        setPriority(item.priority || 'Medium')
        setPeopleCount(item.peopleCount || 1)
        setLocationName(item.locationName)
        setLat(String(item.lat))
        setLng(String(item.lng))
        setTimeout(() => {
          if (mapInstance.current) {
            placeMarker(item.lat, item.lng)
          }
        }, 100)
      } catch (e2) {
        setError(e2.message || 'Failed to load request')
      } finally {
        setFetching(false)
      }
    }
    load()
  }, [id])

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
    if (!navigator.geolocation) return setError(t('editRequest.geolocationNotSupported'))
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
        setError(t('editRequest.unableToRetrieve'))
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
      if (!lat || !lng) return setError(t('editRequest.locationError'))
      await clientApi.updateRequest(id, {
        title,
        description,
        locationName: locationName || `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
        lat: Number(lat),
        lng: Number(lng),
        status,
        category,
        priority,
        peopleCount: Number(peopleCount) || 1,
      })
      navigate('/dashboard')
    } catch (e2) {
      setError(e2.message || 'Failed to update request')
    } finally {
      setLoading(false)
    }
  }

  const categories = ['Medical', 'Food', 'Shelter', 'Water', 'Rescue', 'Supplies', 'Other']
  const priorities = ['Critical', 'High', 'Medium', 'Low']
  const statuses = ['Open', 'In Progress', 'Resolved', 'Fulfilled']

  if (fetching) {
    return (
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="card">
          <div className="small muted">{t('editRequest.loadingRequest')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: 720 }}>
      <div className="card">
        <h2 className="pageTitle" style={{ fontSize: 20 }}>{t('editRequest.title')}</h2>
        <div className="small muted" style={{ marginTop: 4 }}>
          {t('editRequest.subtitle')}
        </div>

        {error ? <div className="errorText">{error}</div> : null}

        <form onSubmit={onSubmit} className="inputGrid" style={{ marginTop: 16 }}>
          <input placeholder={t('createRequest.titleLabel')} value={title} onChange={(e) => setTitle(e.target.value)} required />

          <textarea
            placeholder={t('createRequest.descriptionLabel')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            style={{ resize: 'vertical' }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('createRequest.categoryLabel')}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%' }}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{t(`categories.${c}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('createRequest.priorityLabel')}</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{ width: '100%' }}
              >
                {priorities.map((p) => (
                  <option key={p} value={p}>{t(`priorities.${p}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('editRequest.statusLabel')}</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ width: '100%' }}
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>{t(`statuses.${s}`)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('createRequest.peopleCountLabel')}</label>
            <input
              type="number"
              min="1"
              max="10000"
              value={peopleCount}
              onChange={(e) => setPeopleCount(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <div className="card" style={{ padding: 12, background: '#f8f8f8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <div>
                <div className="pageTitle" style={{ marginBottom: 4, fontSize: 15 }}>
                  {t('createRequest.selectLocation')}
                </div>
                <div style={{ color: '#666', fontSize: 13 }}>
                  {t('createRequest.locationHint')}
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#555' }}>
                {lat && lng ? (
                  <>
                    <div><b>{t('createRequest.lat')}</b> {Number(lat).toFixed(5)}</div>
                    <div><b>{t('createRequest.lng')}</b> {Number(lng).toFixed(5)}</div>
                  </>
                ) : (
                  <span>{t('createRequest.notSelected')}</span>
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
                {locating ? t('editRequest.locating') : t('editRequest.useMyLocation')}
              </button>

              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => { setSearchText(e.target.value); setSuggestions([]) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSearch(e) } }}
                  placeholder={t('createRequest.searchPlaceholder')}
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
                  {searching ? t('createRequest.searching') : t('createRequest.search')}
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
              {loading ? t('editRequest.saving') : !lat ? t('editRequest.selectLocationFirst') : t('editRequest.saveChanges')}
            </button>
            <button type="button" onClick={() => navigate('/dashboard')}>{t('editRequest.cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
