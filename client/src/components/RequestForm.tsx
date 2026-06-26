import { useState, useRef, useEffect, useCallback, useReducer } from 'react'
import L from 'leaflet'
import { useTranslation } from 'react-i18next'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/storage'
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, STATUS_OPTIONS } from '../utils/constants'

interface Suggestion {
  lat: string
  lon: string
  display_name: string
  name?: string
  [key: string]: unknown
}

interface RequestFormData {
  title: string
  description: string
  lat: string
  lng: string
  locationName: string
  category: string
  priority: string
  peopleCount: string
  status?: string
}

interface RequestFormProps {
  initialData?: Partial<RequestFormData> & { _id?: string }
  onSubmit: (data: Record<string, unknown>) => Promise<void>
  submitLabel: string
  submitButtonLabel: string
  title: string
  subtitle?: string
  showStatus?: boolean
  loading?: boolean
  onCancel?: () => void
}

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

export const CATEGORIES = CATEGORY_OPTIONS
export const PRIORITIES = PRIORITY_OPTIONS
export const STATUSES = STATUS_OPTIONS
export const INITIAL_CENTER = [20.5937, 78.9629]
const DRAFT_PREFIX = 'draft:request:'

interface FormState {
  title: string
  description: string
  lat: string
  lng: string
  locationName: string
  category: string
  priority: string
  peopleCount: number
  status: string
}

type FormAction =
  | { type: 'SET_FIELD'; field: keyof FormState; value: string | number }
  | { type: 'SET_LOCATION'; lat: string; lng: string; locationName: string }
  | { type: 'LOAD_INITIAL'; state: Partial<FormState> }
  | { type: 'LOAD_DRAFT'; state: Partial<FormState> }
  | { type: 'RESET' }

const INITIAL_FORM: FormState = {
  title: '',
  description: '',
  lat: '',
  lng: '',
  locationName: '',
  category: 'Other',
  priority: 'Medium',
  peopleCount: 1,
  status: 'Open',
}

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }
    case 'SET_LOCATION':
      return { ...state, lat: action.lat, lng: action.lng, locationName: action.locationName }
    case 'LOAD_INITIAL':
      return {
        ...state,
        title: action.state.title || '',
        description: action.state.description || '',
        lat: action.state.lat != null ? String(action.state.lat) : '',
        lng: action.state.lng != null ? String(action.state.lng) : '',
        locationName: action.state.locationName || '',
        category: action.state.category || 'Other',
        priority: action.state.priority || 'Medium',
        peopleCount: Number(action.state.peopleCount) || 1,
        status: action.state.status || 'Open',
      }
    case 'LOAD_DRAFT':
      return { ...state, ...action.state, peopleCount: Number(action.state.peopleCount) || 1 }
    case 'RESET':
      return { ...INITIAL_FORM }
    default:
      return state
  }
}

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
}: RequestFormProps) {
  const { t } = useTranslation()
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const draftKeyRef = useRef(DRAFT_PREFIX + (initialData?._id || 'new'))
  const dirtyRef = useRef(false)
  const [showRestore, setShowRestore] = useState(false)
  const [form, dispatch] = useReducer(formReducer, INITIAL_FORM)
  const [searchText, setSearchText] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [savedIndicator, setSavedIndicator] = useState(false)

  function getFormState(): FormState {
    return { ...form, peopleCount: form.peopleCount }
  }

  function setFormField(field: keyof FormState, value: string | number) {
    dispatch({ type: 'SET_FIELD', field, value })
    dirtyRef.current = true
  }

  function markDirty() { dirtyRef.current = true }

  useEffect(() => {
    const raw = safeGetItem(draftKeyRef.current)
    if (raw && !initialData) {
      try { const draft = JSON.parse(raw); if (draft && draft.title) setShowRestore(true) } catch {}
    }
  }, [])

  useEffect(() => {
    if (!dirtyRef.current) return
    const timer = setTimeout(() => {
      safeSetItem(draftKeyRef.current, JSON.stringify(getFormState()))
      setSavedIndicator(true)
      setTimeout(() => setSavedIndicator(false), 2000)
    }, 1000)
    return () => clearTimeout(timer)
  }, [form.title, form.description, form.category, form.priority, form.peopleCount, form.lat, form.lng, form.locationName, form.status])

  function restoreDraft() {
    const raw = safeGetItem(draftKeyRef.current)
    if (raw) {
      try {
        const draft = JSON.parse(raw)
        dispatch({ type: 'LOAD_DRAFT', state: draft })
      } catch {}
      setShowRestore(false)
      dirtyRef.current = true
    }
  }

  function dismissRestore() {
    safeRemoveItem(draftKeyRef.current)
    setShowRestore(false)
  }

  const placeMarker = useCallback((pLat: number, pLng: number) => {
    dispatch({ type: 'SET_LOCATION', lat: String(pLat), lng: String(pLng), locationName: `${pLat.toFixed(5)}, ${pLng.toFixed(5)}` })
    markDirty()

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
    dispatch({ type: 'LOAD_INITIAL', state: initialData as Partial<FormState> })
  }, [initialData, loading])

  useEffect(() => {
    if (loading || mapInstance.current || !mapRef.current) return

    const map = initLeafletMap(mapRef.current, { onClick: (e: L.LeafletMouseEvent) => placeMarker(e.latlng.lat, e.latlng.lng) })
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
            dispatch({ type: 'SET_LOCATION', lat: String(latitude), lng: String(longitude), locationName: data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` })
          })
          .catch(() => { dispatch({ type: 'SET_LOCATION', lat: String(latitude), lng: String(longitude), locationName: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` }) })
          .finally(() => setLocating(false))
      },
      () => {
        setError(t('createRequest.unableToRetrieve'))
        setLocating(false)
      }
    )
  }

  async function onSearch(e: React.FormEvent) {
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

  function pickSuggestion(s: Suggestion) {
    placeMarker(parseFloat(s.lat), parseFloat(s.lon))
    dispatch({ type: 'SET_LOCATION', lat: s.lat, lng: s.lon, locationName: s.display_name || s.name || searchText })
    setSuggestions([])
    setSearchText('')
    setTimeout(() => mapInstance.current?.invalidateSize(), 0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.lat || !form.lng) {
      setError(t('createRequest.locationError'))
      return
    }
    setFormLoading(true)
    try {
      const data: Record<string, unknown> = {
        title: form.title,
        description: form.description,
        locationName: form.locationName || `${Number(form.lat).toFixed(5)}, ${Number(form.lng).toFixed(5)}`,
        lat: Number(form.lat),
        lng: Number(form.lng),
        category: form.category,
        priority: form.priority,
        peopleCount: form.peopleCount || 1,
      }
      if (showStatus) {
        data.status = form.status
      }
      await onSubmit(data)
      safeRemoveItem(draftKeyRef.current)
    } catch (err) {
      const e = err as Error
      setError(e.message || 'Failed to submit')
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
        <div className="flex-between items-center">
          <div>
            <h1 className="pageTitle text-2xl">{title}</h1>
            <div className="small muted mt-xs">{subtitle}</div>
          </div>
          {savedIndicator && <span className="result-count">Draft saved</span>}
        </div>

        {showRestore && (
          <div className="flex-between items-center gap-sm mt-md p-sm rounded-sm" style={{ background: 'var(--accent-soft)', border: '1px solid var(--border)' }}>
            <span className="text-sm">{t('createRequest.draftFound') || 'You have an unsaved draft'}</span>
            <div className="flex flex-gap-xs">
              <button type="button" onClick={restoreDraft} className="btnPrimary text-xs p-xs">{t('createRequest.restore') || 'Restore'}</button>
              <button type="button" onClick={dismissRestore} className="text-xs p-xs">{t('createRequest.dismiss') || 'Dismiss'}</button>
            </div>
          </div>
        )}

        {error && <div className="errorText">{error}</div>}

        <form onSubmit={handleSubmit} className="inputGrid mt">
          <label htmlFor="rf-title" className="sr-only">{t('createRequest.titleLabel')}</label>
          <input id="rf-title" placeholder={t('createRequest.titleLabel')} value={form.title} onChange={(e) => setFormField('title', e.target.value)} required maxLength={200} />

          <label htmlFor="rf-desc" className="sr-only">{t('createRequest.descriptionLabel')}</label>
          <textarea id="rf-desc"
            placeholder={t('createRequest.descriptionLabel')}
            value={form.description}
            onChange={(e) => setFormField('description', e.target.value)}
            required
            rows={4}
            maxLength={5000}
            className="resize-v"
          />

          <div className="grid-3-responsive">
            <div>
              <label className="small label-block" htmlFor="rf-category">{t('createRequest.categoryLabel')}</label>
              <select id="rf-category" value={form.category} onChange={(e) => setFormField('category', e.target.value)} className="w-full">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t(`categories.${c}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="small label-block" htmlFor="rf-priority">{t('createRequest.priorityLabel')}</label>
              <select id="rf-priority" value={form.priority} onChange={(e) => setFormField('priority', e.target.value)} className="w-full">
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{t(`priorities.${p}`)}</option>
                ))}
              </select>
            </div>
            {showStatus && (
              <div>
                <label className="small label-block" htmlFor="rf-status">{t('editRequest.statusLabel')}</label>
                <select id="rf-status" value={form.status} onChange={(e) => setFormField('status', e.target.value)} className="w-full">
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{t(`statuses.${s}`)}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="small label-block" htmlFor="rf-people">{t('createRequest.peopleCountLabel')}</label>
            <input id="rf-people" type="number" min="1" max="10000" value={form.peopleCount} onChange={(e) => setFormField('peopleCount', Number(e.target.value))} className="w-full" />
          </div>

          <div className="card p-sm bg-elevated">
            <div className="flex-between items-baseline gap-12">
              <div>
                <div className="pageTitle mb-xs text-base">{t('createRequest.selectLocation')}</div>
                <div className="text-sm text-muted-extra">{t('createRequest.locationHint')}</div>
              </div>
              <div className="text-sm text-muted-extra">
                {form.lat && form.lng ? (
                  <>
                    <div><b>{t('createRequest.lat')}</b> {Number(form.lat).toFixed(5)}</div>
                    <div><b>{t('createRequest.lng')}</b> {Number(form.lng).toFixed(5)}</div>
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
            <button disabled={isSubmitting || !form.lat} type="submit" className={`btnPrimary${isSubmitting ? ' btnLoading' : ''}`}>
              {isSubmitting ? submitLabel : !form.lat ? t('createRequest.selectLocationFirst') : submitButtonLabel}
            </button>
            <button type="button" onClick={onCancel}>{t('createRequest.cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
