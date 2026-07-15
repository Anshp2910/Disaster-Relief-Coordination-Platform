import { useState, useRef, useEffect, useCallback, useReducer, useMemo } from 'react'
import L from 'leaflet'
import { useTranslation } from 'react-i18next'
import { MapPin, Navigation } from 'lucide-react'
import { StepForm, type Step, RippleBtn } from '../components/ui'
import { ModernSelect } from '../components/ui'
import { useAutoSave, AutoSaveIndicator } from '../hooks/useAutoSave'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'
import { safeGetItem, safeRemoveItem } from '../utils/storage'
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, STATUS_OPTIONS } from '../utils/constants'
import { getErrorMessage } from '../utils/getErrorMessage'

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
}

export const PIN_ICON = L.divIcon({
  className: 'marker-pulse',
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
}: RequestFormProps) {
  const { t } = useTranslation()
  const STEPS: Step[] = useMemo(() => [
    { title: t('stepForm.stepDetails'), description: t('stepForm.stepDetailsDesc') },
    { title: t('stepForm.stepLocation'), description: t('stepForm.stepLocationDesc') },
    { title: t('stepForm.stepReview'), description: t('stepForm.stepReviewDesc') },
  ], [t])
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const [draftKey, setDraftKey] = useState(DRAFT_PREFIX + (initialData?._id || 'new'))
  useEffect(() => {
    setDraftKey(DRAFT_PREFIX + (initialData?._id || 'new'))
  }, [initialData?._id])
  const [currentStep, setCurrentStep] = useState(0)
  const [showRestore, setShowRestore] = useState(false)
  const [form, dispatch] = useReducer(formReducer, INITIAL_FORM)
  const [searchText, setSearchText] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const nominatimControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => { nominatimControllerRef.current?.abort() }
  }, [])

  const { status: autoSaveStatus } = useAutoSave({
    key: draftKey,
    data: { ...form, status: form.status },
    delay: 1500,
    enabled: true,
  })

  function setFormField(field: keyof FormState, value: string | number) {
    dispatch({ type: 'SET_FIELD', field, value })
  }

  useEffect(() => {
    const raw = safeGetItem(draftKey)
    if (raw && !initialData) {
      try { const draft = JSON.parse(raw); if (draft && draft.title) setShowRestore(true) } catch { /* ignore */ }
    }
  }, [draftKey, initialData])

  function restoreDraft() {
    const raw = safeGetItem(draftKey)
    if (raw) {
      try {
        const draft = JSON.parse(raw)
        dispatch({ type: 'LOAD_DRAFT', state: draft })
      } catch { /* ignore */ }
      setShowRestore(false)
    }
  }

  function dismissRestore() {
    safeRemoveItem(draftKey)
    setShowRestore(false)
  }

  const placeMarker = useCallback((pLat: number, pLng: number) => {
    dispatch({ type: 'SET_LOCATION', lat: String(pLat), lng: String(pLng), locationName: `${pLat.toFixed(5)}, ${pLng.toFixed(5)}` })

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

  const initialId = initialData?._id
  useEffect(() => {
    if (loading || !initialData) return
    dispatch({ type: 'LOAD_INITIAL', state: initialData as Partial<FormState> })
  }, [initialId, initialData, loading])

  useEffect(() => {
    if (loading || currentStep !== 1 || mapInstance.current || !mapRef.current) return

    const map = initLeafletMap(mapRef.current, { onClick: (e: L.LeafletMouseEvent) => placeMarker(e.latlng.lat, e.latlng.lng) })
    mapInstance.current = map

    const onResize = () => { if (mapInstance.current) mapInstance.current.invalidateSize() }
    window.addEventListener('resize', onResize)
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize)

    if (initialData?.lat != null && initialData?.lng != null) {
      const timeoutId = setTimeout(() => {
        placeMarker(Number(initialData.lat), Number(initialData.lng))
      }, 150)
      return () => {
        window.removeEventListener('resize', onResize)
        if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize)
        clearTimeout(timeoutId)
        cleanupLeafletMap(map)
        mapInstance.current = null
        markerRef.current = null
      }
    }

    return () => {
      window.removeEventListener('resize', onResize)
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize)
      cleanupLeafletMap(map)
      mapInstance.current = null
      markerRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, currentStep, placeMarker])
  // Map effect ^ intentionally stable — adding deps like initialData would cause map re-init

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError(t('createRequest.geolocationNotSupported'))
      return
    }
    setLocating(true)
    nominatimControllerRef.current?.abort()
    const controller = new AbortController()
    nominatimControllerRef.current = controller
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        placeMarker(latitude, longitude)
        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
          headers: { 'Accept-Language': 'en' },
          signal: controller.signal,
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
    nominatimControllerRef.current?.abort()
    const controller = new AbortController()
    nominatimControllerRef.current = controller
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}&limit=5`,
        { headers: { 'Accept-Language': 'en' }, signal: controller.signal }
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

  async function handleSubmit() {
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
      safeRemoveItem(draftKey)
    } catch (err) {
      setError(getErrorMessage(err) || 'Failed to submit')
    } finally {
      setFormLoading(false)
    }
  }

  const canNextStep = currentStep === 0 ? !!form.title && !!form.description : true
  if (loading) {
    return (
      <div className="container max-w-sm">
        <div className="card">
          <div className="small muted">{t('common.loading')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container max-w-sm">
      <div className="card border-gov rounded-lg px-lg py-md">
        <div className="flex-between items-center">
          <div>
            <h1 className="page-title text-2xl">{title}</h1>
            {subtitle && <div className="small muted mt-xs">{subtitle}</div>}
          </div>
          <AutoSaveIndicator status={autoSaveStatus} />
        </div>

        {showRestore && (
          <div className="draft-banner">
            <span className="text-sm">{t('createRequest.draftFound') || 'You have an unsaved draft'}</span>
            <div className="flex gap-xs">
              <RippleBtn type="button" onClick={restoreDraft} className="btn-secondary btn-sm">{t('createRequest.restore') || 'Restore'}</RippleBtn>
              <button type="button" onClick={dismissRestore} className="btn-ghost btn-sm">{t('createRequest.dismiss') || 'Dismiss'}</button>
            </div>
          </div>
        )}

        {error && <div className="error-text animate-shake mt-sm mb-sm" role="alert" aria-live="polite" id="rf-error">{error}</div>}

        <StepForm
          steps={STEPS}
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          onNext={() => setCurrentStep((s) => Math.min(s + 1, 2))}
          onPrev={() => setCurrentStep((s) => Math.max(s - 1, 0))}
          onComplete={handleSubmit}
          canNext={currentStep === 0 ? canNextStep : true}
          loading={formLoading}
          completeLabel={formLoading ? submitLabel : submitButtonLabel}
        >
          {currentStep === 0 && (
            <div>
              <div className="ff-group">
                <div className={`ff-wrap ${form.title ? 'ff-focused' : ''}`}>
                  <input
                    id="rf-title"
                    type="text"
                    value={form.title}
                    onChange={(e) => setFormField('title', e.target.value)}
                    required
                    maxLength={200}
                    aria-describedby={error ? 'rf-error' : undefined}
                    className={`ff-input ${form.title ? 'ff-input-filled' : ''}`}
                    placeholder={t('createRequest.titleLabel')}
                  />
                  <label htmlFor="rf-title" className={`ff-label ${form.title ? 'ff-label-float' : ''}`}>
                    {t('createRequest.titleLabel')}
                  </label>
                </div>
              </div>

              <div className="ff-group">
                <div className={`ff-wrap ${form.description ? 'ff-focused' : ''}`}>
                  <textarea
                    id="rf-desc"
                    value={form.description}
                    onChange={(e) => setFormField('description', e.target.value)}
                    required
                    rows={4}
                    maxLength={5000}
                    className="ff-input ff-textarea"
                    placeholder={t('createRequest.descriptionLabel')}
                  />
                  <label htmlFor="rf-desc" className={`ff-label ff-label-with-icon ${form.description ? 'ff-label-float' : ''}`}>
                    {t('createRequest.descriptionLabel')}
                  </label>
                </div>
              </div>

              <div className="flex gap-sm">
                <div className="ff-group flex-1">
                  <ModernSelect
                    label={t('createRequest.categoryLabel')}
                    options={CATEGORIES.map((c) => ({ label: t(`categories.${c}`), value: c }))}
                    value={form.category}
                    onChange={(v) => setFormField('category', v)}
                  />
                </div>
                <div className="ff-group flex-1">
                  <ModernSelect
                    label={t('createRequest.priorityLabel')}
                    options={PRIORITIES.map((p) => ({ label: t(`priorities.${p}`), value: p }))}
                    value={form.priority}
                    onChange={(v) => setFormField('priority', v)}
                  />
                </div>
              </div>

              <div className="ff-group">
                <div className={`ff-wrap ${form.peopleCount > 0 ? 'ff-focused' : ''}`}>
                  <input
                    id="rf-people"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="10000"
                    value={form.peopleCount}
                    onChange={(e) => setFormField('peopleCount', Number(e.target.value))}
                    className={`ff-input ${form.peopleCount > 0 ? 'ff-input-filled' : ''}`}
                    placeholder={t('createRequest.peopleCountLabel')}
                  />
                  <label htmlFor="rf-people" className={`ff-label ${form.peopleCount > 0 ? 'ff-label-float' : ''}`}>
                    {t('createRequest.peopleCountLabel')}
                  </label>
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div>
              <div className="flex-between items-baseline gap-12 mb-sm">
                <div>
                  <div className="ff-label-text">{t('createRequest.selectLocation')}</div>
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

              <div className="flex gap-sm mb-sm">
                <button
                  type="button"
                  onClick={useMyLocation}
                  disabled={locating}
                  className="sf-btn sf-btn-prev"
                  aria-label={locating ? t('createRequest.locating') : t('createRequest.useMyLocation')}
                >
                  <Navigation size={14} aria-hidden="true" />
                  {locating ? t('createRequest.locating') : t('createRequest.useMyLocation')}
                </button>

                <div className="relative flex-1">
                  <input
                    id="rf-search"
                    type="text"
                    value={searchText}
                    onChange={(e) => { setSearchText(e.target.value); setSuggestions([]) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSearch(e) } }}
                    placeholder={t('createRequest.searchPlaceholder')}
                    aria-label={t('createRequest.searchPlaceholder')}
                    className="location-search-input"
                  />
                  <button
                    type="button"
                    onClick={onSearch}
                    disabled={searching}
                    aria-label={searching ? t('createRequest.searching') : t('createRequest.search')}
                    className="btn-ghost btn-sm location-search-btn"
                  >
                    {searching ? t('createRequest.searching') : t('createRequest.search')}
                  </button>

                  {suggestions.length > 0 && (
                    <div className="location-suggestions" style={{ maxHeight: 240, overflowY: 'auto' }}>
                      {suggestions.map((s, i) => (
                        <div
                          key={String(s.place_id ?? '') || i}
                          onClick={() => pickSuggestion(s)}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickSuggestion(s) } }}
                          role="button"
                          tabIndex={0}
                          className="suggestion-item"
                          style={{
                            borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-light)' : 'none',
                          }}
                        >
                          {s.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div ref={mapRef} className="mapBox" role="application" aria-label={t('map.selectLocation')} />
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <div className="flex-col gap-md py-sm">
                <div className="ff-label-text">{t('createRequest.review') || 'Review your request'}</div>
                <div className="review-card">
                  <div className="text-sm review-grid">
                    <div><span className="text-muted">{t('createRequest.titleLabel') || 'Title'}:</span> <strong>{form.title}</strong></div>
                    <div><span className="text-muted">{t('createRequest.descriptionLabel') || 'Description'}:</span> <strong>{form.description}</strong></div>
                    <div className="review-field">
                      <div><span className="text-muted">{t('createRequest.categoryLabel') || 'Category'}:</span> <strong>{t(`categories.${form.category}`)}</strong></div>
                      <div><span className="text-muted">{t('createRequest.priorityLabel') || 'Priority'}:</span> <strong>{t(`priorities.${form.priority}`)}</strong></div>
                    </div>
                    <div><span className="text-muted">{t('createRequest.peopleLabel') || 'People affected'}:</span> <strong>{form.peopleCount}</strong></div>
                    <div><span className="text-muted">{t('createRequest.locationLabel') || 'Location'}:</span> <strong>{form.locationName || `${Number(form.lat).toFixed(5)}, ${Number(form.lng).toFixed(5)}`}</strong></div>
                    {form.lat && form.lng && (
                      <div><span className="text-muted">{t('createRequest.coordinatesLabel') || 'Coordinates'}:</span> <strong>{Number(form.lat).toFixed(5)}, {Number(form.lng).toFixed(5)}</strong></div>
                    )}
                  </div>
                </div>
                {!form.lat && (
                  <div className="text-sm text-danger flex items-center gap-xs">
                    <MapPin size={14} aria-hidden="true" /> {t('createRequest.locationRequired') || 'Please select a location on the map before submitting.'}
                  </div>
                )}
              </div>
            </div>
          )}
        </StepForm>
      </div>
    </div>
  )
}
