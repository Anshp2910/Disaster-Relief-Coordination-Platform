import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import L from 'leaflet'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'

const PIN_ICON = L.divIcon({
  className: '',
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  html: `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#00d4ff"/>
        <stop offset="100%" stop-color="#7c3aed"/>
      </linearGradient>
    </defs>
    <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z" fill="url(#pinGrad)"/>
    <circle cx="15" cy="14" r="6" fill="#fff"/>
  </svg>`,
})

const CATEGORIES = ['Medical', 'Food', 'Shelter', 'Water', 'Rescue', 'Supplies', 'Healthcare', 'Sanitation', 'Clothing', 'Transportation', 'Communication', 'Power', 'Infrastructure', 'Other']
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low']
const STATUSES = ['Open', 'Pending', 'In Progress', 'Resolved', 'Fulfilled']

const INITIAL_CENTER = [20.5937, 78.9629]

export default function EditRequest() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markerRef = useRef(null)

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

  const placeMarker = useCallback((pLat, pLng) => {
    setLat(String(pLat))
    setLng(String(pLng))
    setLocationName(`${pLat.toFixed(5)}, ${pLng.toFixed(5)}`)

    if (markerRef.current) {
      markerRef.current.setLatLng([pLat, pLng])
    } else if (mapInstance.current) {
      markerRef.current = L.marker([pLat, pLng], { icon: PIN_ICON }).addTo(mapInstance.current)
    }

    if (mapInstance.current) {
      mapInstance.current.setView([pLat, pLng], 12)
      mapInstance.current.invalidateSize()
    }
  }, [])

  useEffect(() => {
    if (fetching || mapInstance.current || !mapRef.current) return

    const map = initLeafletMap(mapRef.current, { onClick: (e) => placeMarker(e.latlng.lat, e.latlng.lng) })
    mapInstance.current = map

    const onResize = () => { if (mapInstance.current) mapInstance.current.invalidateSize() }
    window.addEventListener('resize', onResize)
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize)
      cleanupLeafletMap(map)
      mapInstance.current = null
    }
  }, [fetching, placeMarker])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { item } = await clientApi.getRequest(id)
        if (cancelled) return
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
          if (!cancelled && mapInstance.current) placeMarker(item.lat, item.lng)
        }, 100)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load request')
      } finally {
        if (!cancelled) setFetching(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, placeMarker])

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError(t('editRequest.geolocationNotSupported'))
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        placeMarker(latitude, longitude)
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
          headers: { 'Accept-Language': 'en' },
        })
          .then((r) => r.json())
          .then((data) => {
            setLocationName(data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`)
          })
          .catch(() => {})
          .finally(() => setLocating(false))
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
      setSuggestions(await res.json())
    } catch {
      setSuggestions([])
    } finally {
      setSearching(false)
    }
  }

  function pickSuggestion(s) {
    placeMarker(parseFloat(s.lat), parseFloat(s.lon))
    setLocationName(s.display_name || s.name || searchText)
    setSuggestions([])
    setSearchText('')
    setTimeout(() => mapInstance.current?.invalidateSize(), 0)
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!lat || !lng) {
      setError(t('editRequest.locationError'))
      return
    }
    setLoading(true)
    try {
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
    } catch (err) {
      setError(err.message || 'Failed to update request')
    } finally {
      setLoading(false)
    }
  }

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

        {error && <div className="errorText">{error}</div>}

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
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%' }}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t(`categories.${c}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('createRequest.priorityLabel')}</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ width: '100%' }}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{t(`priorities.${p}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('editRequest.statusLabel')}</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '100%' }}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{t(`statuses.${s}`)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('createRequest.peopleCountLabel')}</label>
            <input type="number" min="1" max="10000" value={peopleCount} onChange={(e) => setPeopleCount(e.target.value)} style={{ width: '100%' }} />
          </div>

          <div className="card" style={{ padding: 12, background: '#f8f8f8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
              <div>
                <div className="pageTitle" style={{ marginBottom: 4, fontSize: 15 }}>{t('createRequest.selectLocation')}</div>
                <div style={{ color: '#666', fontSize: 13 }}>{t('createRequest.locationHint')}</div>
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

            <div style={{ display: 'flex', gap: 8, marginBlock: 8 }}>
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
                    background: '#fff', color: '#333', fontSize: 14, boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  onClick={onSearch}
                  disabled={searching}
                  style={{
                    position: 'absolute', right: 4, top: 4, bottom: 4,
                    padding: '4px 12px', borderRadius: 4, border: 'none',
                    background: 'linear-gradient(135deg, #00d4ff, #7c3aed)', color: '#fff', fontSize: 13,
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

            <div ref={mapRef} className="mapBox" role="application" aria-label="Map for selecting location" />
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
