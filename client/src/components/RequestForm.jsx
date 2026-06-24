import { useState, useRef, useEffect, useCallback } from 'react'
import L from 'leaflet'
import { useTranslation } from 'react-i18next'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'

export const PIN_ICON = L.divIcon({
  className: '',
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  html: `<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="pinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#3b82f6"/>
        <stop offset="100%" stop-color="#818cf8"/>
      </linearGradient>
    </defs>
    <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z" fill="url(#pinGrad)"/>
    <circle cx="15" cy="14" r="6" fill="#fff"/>
  </svg>`,
})

export const CATEGORIES = ['Medical', 'Food', 'Shelter', 'Water', 'Rescue', 'Supplies', 'Healthcare', 'Sanitation', 'Clothing', 'Transportation', 'Communication', 'Power', 'Infrastructure', 'Other']
export const PRIORITIES = ['Critical', 'High', 'Medium', 'Low']
export const STATUSES = ['Open', 'Pending', 'In Progress', 'Resolved', 'Fulfilled']
export const INITIAL_CENTER = [20.5937, 78.9629]

export default function RequestForm({
  initialData,
  onSubmit,
  submitLabel,
  submitButtonLabel,
  title,
  subtitle,
  showStatus = false,
  loading = false,
  onCancel,
}) {
  const { t } = useTranslation()
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markerRef = useRef(null)

  const [formTitle, setFormTitle] = useState('')
  const [description, setDescription] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [locationName, setLocationName] = useState('')
  const [searchText, setSearchText] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const [category, setCategory] = useState('Other')
  const [priority, setPriority] = useState('Medium')
  const [peopleCount, setPeopleCount] = useState(1)
  const [status, setStatus] = useState('Open')
  const [error, setError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
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
    if (loading || !initialData) return
    setFormTitle(initialData.title || '')
    setDescription(initialData.description || '')
    setStatus(initialData.status || 'Open')
    setCategory(initialData.category || 'Other')
    setPriority(initialData.priority || 'Medium')
    setPeopleCount(initialData.peopleCount || 1)
    setLocationName(initialData.locationName || '')
    if (initialData.lat != null) setLat(String(initialData.lat))
    if (initialData.lng != null) setLng(String(initialData.lng))
  }, [initialData, loading])

  useEffect(() => {
    if (loading || mapInstance.current || !mapRef.current) return

    const map = initLeafletMap(mapRef.current, { onClick: (e) => placeMarker(e.latlng.lat, e.latlng.lng) })
    mapInstance.current = map

    const onResize = () => { if (mapInstance.current) mapInstance.current.invalidateSize() }
    window.addEventListener('resize', onResize)
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize)

    if (initialData?.lat != null && initialData?.lng != null) {
      setTimeout(() => {
        placeMarker(Number(initialData.lat), Number(initialData.lng))
      }, 150)
    }

    return () => {
      window.removeEventListener('resize', onResize)
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize)
      cleanupLeafletMap(map)
      mapInstance.current = null
      markerRef.current = null
    }
  }, [loading, placeMarker])

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError(t('createRequest.geolocationNotSupported'))
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
          .catch(() => { setLocationName(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`) })
          .finally(() => setLocating(false))
      },
      () => {
        setError(t('createRequest.unableToRetrieve'))
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

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!lat || !lng) {
      setError(t('createRequest.locationError'))
      return
    }
    setFormLoading(true)
    try {
      const data = {
        title: formTitle,
        description,
        locationName: locationName || `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`,
        lat: Number(lat),
        lng: Number(lng),
        category,
        priority,
        peopleCount: Number(peopleCount) || 1,
      }
      if (showStatus) {
        data.status = status
      }
      await onSubmit(data)
    } catch (err) {
      setError(err.message || 'Failed to submit')
    } finally {
      setFormLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container max-w-sm">
        <div className="card">
          <div className="small muted">{t('common.loading')}</div>
        </div>
      </div>
    )
  }

  const isSubmitting = formLoading

  return (
    <div className="container max-w-sm">
      <div className="card">
        <h1 className="pageTitle text-2xl">{title}</h1>
        <div className="small muted mt-xs">
          {subtitle}
        </div>

        {error && <div className="errorText">{error}</div>}

        <form onSubmit={handleSubmit} className="inputGrid mt">
          <label htmlFor="rf-title" className="sr-only">{t('createRequest.titleLabel')}</label>
          <input id="rf-title" placeholder={t('createRequest.titleLabel')} value={formTitle} onChange={(e) => setFormTitle(e.target.value)} required maxLength={200} />

          <label htmlFor="rf-desc" className="sr-only">{t('createRequest.descriptionLabel')}</label>
          <textarea id="rf-desc"
            placeholder={t('createRequest.descriptionLabel')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            maxLength={5000}
            className="resize-v"
          />

          <div className="grid-3-responsive">
            <div>
              <label className="small label-block" htmlFor="rf-category">{t('createRequest.categoryLabel')}</label>
              <select id="rf-category" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t(`categories.${c}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="small label-block" htmlFor="rf-priority">{t('createRequest.priorityLabel')}</label>
              <select id="rf-priority" value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full">
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{t(`priorities.${p}`)}</option>
                ))}
              </select>
            </div>
            {showStatus && (
              <div>
                <label className="small label-block" htmlFor="rf-status">{t('editRequest.statusLabel')}</label>
                <select id="rf-status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-full">
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{t(`statuses.${s}`)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="small label-block" htmlFor="rf-people">{t('createRequest.peopleCountLabel')}</label>
            <input id="rf-people" type="number" min="1" max="10000" value={peopleCount} onChange={(e) => setPeopleCount(e.target.value)} className="w-full" />
          </div>

          <div className="card p-sm bg-elevated">
            <div className="flex-between items-baseline gap-12">
              <div>
                <div className="pageTitle mb-xs text-base">{t('createRequest.selectLocation')}</div>
                <div className="text-sm text-muted-extra">{t('createRequest.locationHint')}</div>
              </div>
              <div className="text-sm text-muted-extra">
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

            <div className="flex flex-gap-sm mt-sm mb-sm">
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className={`flex-shrink-0 btn-pill ${locating ? 'cursor-wait' : 'cursor-pointer'}`}
              >
                {locating ? t('createRequest.locating') : t('createRequest.useMyLocation')}
              </button>

              <div className="relative flex-1">
                <label htmlFor="rf-search" className="sr-only">{t('createRequest.searchPlaceholder')}</label>
                <input
                  id="rf-search"
                  type="text"
                  value={searchText}
                  onChange={(e) => { setSearchText(e.target.value); setSuggestions([]) }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSearch(e) } }}
                  placeholder={t('createRequest.searchPlaceholder')}
                  className="w-full input-pill pr-70"
                />
                <button
                  type="button"
                  onClick={onSearch}
                  disabled={searching}
                  className="search-btn"
                >
                  {searching ? t('createRequest.searching') : t('createRequest.search')}
                </button>

                {suggestions.length > 0 && (
                  <div className="suggestions-dropdown">
                    {suggestions.map((s, i) => (
                      <div
                        key={i}
                        onClick={() => pickSuggestion(s)}
                        className={`suggestion-item ${i < suggestions.length - 1 ? 'border-bottom' : ''}`}
                        onMouseEnter={(e) => e.currentTarget.classList.add('bg-accent-soft')}
                        onMouseLeave={(e) => e.currentTarget.classList.remove('bg-accent-soft')}
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
            <button disabled={isSubmitting || !lat} type="submit" className="btnPrimary">
              {isSubmitting ? submitLabel : !lat ? t('createRequest.selectLocationFirst') : submitButtonLabel}
            </button>
            <button type="button" onClick={onCancel}>{t('createRequest.cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
