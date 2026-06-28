import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { createStagger, createListItem } from '../utils/animations'
import { MapPin, Thermometer, Plus, Edit, Trash2, Users, Activity, AlertTriangle, Droplets, Wind } from 'lucide-react'
import L from 'leaflet'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'
import { clientApi } from '../api/client'
import { Modal, PageHeader, ErrorState, FilterBar, ModernSelect, RippleBtn, PageTransition } from '../components/ui'
import { SkeletonMap } from '../components/Skeleton'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useDebounce } from '../hooks/useDebounce'
import { escapeHtml } from '../utils/escapeHtml'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../hooks/useConfirm'
import EmptyState from '../components/EmptyState'

interface Zone {
  _id: string
  name?: string
  description?: string
  severity?: string
  status?: string
  disasterType?: string
  centerLat?: number
  centerLng?: number
  radiusKm?: number
  affectedPopulation?: number
  openRequests?: number
  totalResources?: number
  coverageStatus?: string
  notes?: string
  stats?: {
    openRequests?: number
  }
}

interface WeatherData {
  temperature?: number
  conditions?: string
  feelsLike?: number
  humidity?: number
  windSpeed?: number
  windGusts?: number
  precipitation?: number
  dailyPrecipitation?: number
}

interface ZoneForm {
  name: string
  description: string
  centerLat: string
  centerLng: string
  radiusKm: string
  severity: string
  status: string
  disasterType: string
  affectedPopulation: string
  notes: string
}

const SEVERITY_COLORS: Record<string, { fill: string; stroke: string; weight: number }> = {
  Critical: { fill: 'var(--severity-critical)', stroke: 'var(--severity-critical-stroke)', weight: 0.6 },
  High: { fill: 'var(--severity-high)', stroke: 'var(--severity-high-stroke)', weight: 0.5 },
  Medium: { fill: 'var(--severity-medium)', stroke: 'var(--severity-medium-stroke)', weight: 0.4 },
  Low: { fill: 'var(--severity-low)', stroke: 'var(--severity-low-stroke)', weight: 0.3 },
}

const DISASTER_ICONS: Record<string, string> = {
  Flood: '\u{1F327}', Earthquake: '\u{1F30A}', Cyclone: '\u{1F300}', Drought: '\u2600', Fire: '\u{1F525}', Landslide: '\u26F0', Other: '\u{1F4CC}',
}

const COVERAGE_COLORS: Record<string, string> = {
  Covered: 'var(--coverage-covered)',
  Partial: 'var(--coverage-partial)',
  Gap: 'var(--coverage-gap)',
}


const SEVERITY_OPTIONS = ['All', 'Critical', 'High', 'Medium', 'Low']
const DISASTER_OPTIONS = ['All', ...Object.keys(DISASTER_ICONS)]
const STATUS_OPTIONS = ['All', 'Active', 'Monitoring', 'Resolved', 'Closed']

const containerVariants = createStagger(0.05)
const itemVariants = createListItem(10, 0.3)

function buildPopup(zone: Zone, color: { fill: string }, t: (key: string) => string) {
  const coverageColor = COVERAGE_COLORS[zone.coverageStatus || ''] || 'var(--text-muted)'
  return `
    <div style="font-family:Arial,sans-serif;min-width:200px">
      <div style="font-weight:700;font-size:14px;color:var(--pri-500);margin-bottom:4px">
        ${DISASTER_ICONS[zone.disasterType || ''] || ''} ${escapeHtml(zone.name || '')}
      </div>
      <div style="font-size:12px;margin-bottom:6px">
        <span style="color:${color.fill};font-weight:600">${escapeHtml(zone.severity || '')}</span> severity
        &middot; ${escapeHtml(zone.disasterType || '')}
      </div>
      <div style="font-size:12px;margin-bottom:4px">Radius: ${zone.radiusKm} km</div>
      ${(zone.affectedPopulation ?? 0) > 0
        ? `<div style="font-size:12px;margin-bottom:4px">Affected: ${zone.affectedPopulation?.toLocaleString()}</div>`
        : ''
      }
      <hr style="margin:6px 0;border:none;border-top:1px solid rgba(255,255,255,0.1)"/>
      <div style="font-size:12px">
        <div>Open requests: <strong style="color:var(--red-500)">${zone.openRequests}</strong></div>
        <div>Resources: <strong>${zone.totalResources}</strong> units</div>
        <div style="margin-top:4px">
          Coverage: <span style="background:${coverageColor};color:var(--gov-white);padding:1px 6px;border-radius:3px;font-size:11px">${escapeHtml(zone.coverageStatus || '')}</span>
        </div>
      </div>
      <div style="margin-top:8px">
        <button data-zone-id="${escapeHtml(zone._id)}" class="zone-view-btn" style="background:var(--gov-blue);color:var(--gov-white);border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px">${t('common.viewDetails')}</button>
      </div>
    </div>
  `
}

const DEFAULT_FORM: ZoneForm = {
  name: '', description: '', centerLat: '20.5937', centerLng: '78.9629', radiusKm: '10',
  severity: 'Medium', status: 'Active', disasterType: 'Other', affectedPopulation: '', notes: '',
}

export default function ZoneHeatMap() {
  const { t } = useTranslation()
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editZone, setEditZone] = useState<Zone | null>(null)
  const [form, setForm] = useState<ZoneForm>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('All')
  const [filterDisaster, setFilterDisaster] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const { confirm, ConfirmDialog } = useConfirm()

  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)

  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const circlesRef = useRef<L.Circle[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string | number | undefined> = { limit: 100 }
      if (filterSeverity !== 'All') params.severity = filterSeverity
      if (filterDisaster !== 'All') params.disasterType = filterDisaster
      if (filterStatus !== 'All') params.status = filterStatus
      if (debouncedSearch) params.search = debouncedSearch
      const data = await clientApi.getZones(params) as { items?: Zone[] }
      setZones(data.items || [])
    } catch (e) {
      setError((e as Error).message || 'Failed to load zones')
    } finally {
      setLoading(false)
    }
  }, [filterSeverity, filterDisaster, filterStatus, debouncedSearch])

  useEffect(() => { load() }, [load])

  useAutoRefresh(load, { interval: 20000 })

  async function fetchWeather() {
    const map = mapInstanceRef.current
    if (!map) return
    try {
      setWeatherLoading(true)
      const center = map.getCenter()
      const data = await clientApi.getWeatherCurrent(Number(center.lat.toFixed(4)), Number(center.lng.toFixed(4))) as WeatherData
      setWeather(data)
    } catch {
      // silent
    } finally {
      setWeatherLoading(false)
    }
  }

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || loading) return

    const map = initLeafletMap(mapRef.current)
    mapInstanceRef.current = map

    const onResize = () => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize() }
    window.addEventListener('resize', onResize)
    if (window.visualViewport) (window.visualViewport as EventTarget).addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      if (window.visualViewport) (window.visualViewport as EventTarget).removeEventListener('resize', onResize)
      cleanupLeafletMap(map)
      mapInstanceRef.current = null
    }
  }, [loading])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    circlesRef.current.forEach((c) => map.removeLayer(c))
    circlesRef.current = []

    zones.forEach((zone) => {
      const color = SEVERITY_COLORS[zone.severity || 'Medium'] || SEVERITY_COLORS.Medium
      if (!zone.centerLat || !zone.centerLng) return
      const circle = L.circle([zone.centerLat, zone.centerLng], {
        radius: (zone.radiusKm || 0) * 1000,
        fillColor: color.fill,
        fillOpacity: color.weight,
        color: color.stroke,
        weight: 2,
      }).addTo(map)

      circle.bindPopup(buildPopup(zone, color, t))
      circle.on('click', () => setSelectedZone(zone))
      circlesRef.current.push(circle)
    })

    const clickHandler = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest('.zone-view-btn') as HTMLElement | null
      if (!btn) return
      const zoneId = btn.getAttribute('data-zone-id')
      const z = zones.find((z) => z._id === zoneId)
      if (z) setSelectedZone(z)
    }

    function onPopupOpen(e: L.PopupEvent) {
      const popupEl = e.popup.getElement()
      if (popupEl) popupEl.addEventListener('click', clickHandler)
    }

    function onPopupClose(e: L.PopupEvent) {
      const popupEl = e.popup.getElement()
      if (popupEl) popupEl.removeEventListener('click', clickHandler)
    }

    map.on('popupopen', onPopupOpen)
    map.on('popupclose', onPopupClose)

    return () => {
      map.off('popupopen', onPopupOpen)
      map.off('popupclose', onPopupClose)
    }
  }, [zones])

  function openCreate() {
    setEditZone(null)
    setForm(DEFAULT_FORM)
    setShowForm(true)
    setSelectedZone(null)
  }

  function openEdit(zone: Zone) {
    setEditZone(zone)
    setForm({
      name: zone.name || '',
      description: zone.description || '',
      centerLat: String(zone.centerLat || ''),
      centerLng: String(zone.centerLng || ''),
      radiusKm: String(zone.radiusKm || ''),
      severity: zone.severity || 'Medium',
      status: zone.status || 'Active',
      disasterType: zone.disasterType || 'Other',
      affectedPopulation: String(zone.affectedPopulation || ''),
      notes: zone.notes || '',
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        centerLat: Number(form.centerLat),
        centerLng: Number(form.centerLng),
        radiusKm: Number(form.radiusKm),
        affectedPopulation: Number(form.affectedPopulation) || 0,
      }
      if (editZone) {
        await clientApi.updateZone(editZone._id, payload)
      } else {
        await clientApi.createZone(payload)
      }
      setShowForm(false)
      load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ message: t('zones.deleteConfirm'), danger: true })
    if (!ok) return
    try {
      await clientApi.deleteZone(id)
      setSelectedZone(null)
      load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const { user: currentUser } = useAuth()
  const totalOpen = useMemo(() => zones.reduce((s, z) => s + (z.openRequests || 0), 0), [zones])
  const totalGap = useMemo(() => zones.filter((z) => z.coverageStatus === 'Gap').length, [zones])
  const totalAffected = useMemo(() => zones.reduce((s, z) => s + (z.affectedPopulation || 0), 0), [zones])

  const updateForm = (field: keyof ZoneForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <PageTransition>
      <motion.div className="container" variants={containerVariants} initial="hidden" animate="visible">
      <PageHeader
        title={t('zones.title')}
        subtitle={`${zones.length} zones \u00B7 ${totalOpen} open requests \u00B7 ${totalGap} coverage gaps \u00B7 ${totalAffected.toLocaleString()} affected`}
        actions={
          <div className="btnRow">
            {currentUser?.role === 'admin' && (
              <RippleBtn className="" onClick={openCreate} aria-label="Add zone">
                <Plus size={16} />
                <span className="ml-xs">{t('zones.addZone')}</span>
              </RippleBtn>
            )}
            <button className="btn-secondary text-sm" onClick={fetchWeather} disabled={weatherLoading}>
              <Thermometer size={16} />
              <span className="ml-xs">{weatherLoading ? '...' : (t('zones.weather') || 'Weather')}</span>
            </button>
          </div>
        }
      />

      {error && <ErrorState message={error} onRetry={load} />}

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('zones.searchPlaceholder') || 'Search zones...'}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: STATUS_OPTIONS.map((s) => ({ key: s, label: s })),
            value: filterStatus,
            onChange: setFilterStatus,
          },
          {
            key: 'severity',
            label: 'Severity',
            options: SEVERITY_OPTIONS.map((s) => ({ key: s, label: s })),
            value: filterSeverity,
            onChange: setFilterSeverity,
          },
          {
            key: 'disaster',
            label: 'Disaster Type',
            options: DISASTER_OPTIONS.map((d) => ({ key: d, label: d })),
            value: filterDisaster,
            onChange: setFilterDisaster,
          },
        ]}
      />

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <motion.div className="flex flex-gap mt-md flex-wrap" variants={itemVariants}>
          <div className="flex-1">
            <div className="card p-0 relative">
              {loading && (
                <div className="inset-0 z-100">
                  <SkeletonMap height="65vh" />
                </div>
              )}
              {!loading && zones.length === 0 && (
                <EmptyState
                  icon=' '
                  title={t('zones.noZones')}
                  description={t('zones.noZonesDesc') || 'No disaster zones defined yet'}
                  action={currentUser?.role === 'admin' ? { onClick: openCreate, label: t('zones.createZone') } : undefined}
                />
              )}
              <div ref={mapRef} className="map-container-full h-65vh w-full" />
            </div>

            <div className="flex flex-gap-lg mt-sm flex-wrap">
              {Object.entries(SEVERITY_COLORS).map(([sev, c]) => (
                <div key={sev} className="gap-row-xs text-sm flex items-center gap-xs">
                  <div className="w-3 h-3 rounded-sm" style={{ background: c.fill, border: `2px solid ${c.stroke}` }} />
                  <span>{sev}</span>
                </div>
              ))}
              <span className="text-sm text-muted">&middot;</span>
              {Object.entries(COVERAGE_COLORS).map(([cov, c]) => (
                <div key={cov} className="gap-row-xs text-sm flex items-center gap-xs">
                  <div className="w-3 h-3 rounded-sm" style={{ background: c }} />
                  <span>{cov}</span>
                </div>
              ))}
            </div>
          </div>

          {selectedZone && (
            <div className="card flex-shrink-0 w-320">
              <div className="flex flex-between mb-sm">
                <div>
                  <h3 className="m-0 text-lg flex items-center gap-xs">
                    <MapPin size={16} />
                    {selectedZone.name}
                  </h3>
                  <div className="text-sm mt-xs text-muted">
                    {selectedZone.disasterType} &middot; {selectedZone.status}
                  </div>
                </div>
                <button onClick={() => setSelectedZone(null)} className="bg-none border-none cursor-pointer text-xl p-0" aria-label={t('common.close')}>&times;</button>
              </div>

              <div className="flex flex-gap-xs mb-sm flex-wrap">
                <span className="severity-badge" data-severity={selectedZone.severity}>
                  {selectedZone.severity}
                </span>
                <span className="coverage-badge" data-coverage={selectedZone.coverageStatus}>
                  {selectedZone.coverageStatus} coverage
                </span>
              </div>

              <div className="text-base">
                <div className="flex items-center gap-xs">
                  <MapPin size={14} />
                  <span>{t('zones.radiusLabel')} <strong>{selectedZone.radiusKm} {t('zones.km')}</strong></span>
                </div>
                {(selectedZone.affectedPopulation ?? 0) > 0 && (
                  <div className="flex items-center gap-xs">
                    <Users size={14} />
                    <span>Affected: <strong>{selectedZone.affectedPopulation?.toLocaleString()}</strong></span>
                  </div>
                )}
                <div className="flex items-center gap-xs">
                  <Activity size={14} />
                  <span>Open requests: <strong className="text-red">{selectedZone.openRequests}</strong></span>
                </div>
                <div className="flex items-center gap-xs">
                  <MapPin size={14} />
                  <span>{t('zones.totalResources')}: <strong>{selectedZone.totalResources}</strong> {t('zones.units')}</span>
                </div>
              </div>

              {selectedZone.stats && (selectedZone.stats.openRequests ?? 0) > 0 && (
                <div className="mt-md rounded-sm text-sm p-sm bg-warning-soft flex items-center gap-xs">
                  <AlertTriangle size={14} />
                  <span><strong className="text-red">{t('zones.coverageGap')}</strong> {selectedZone.stats.openRequests} {t('zones.requestsWithNoResources')}</span>
                </div>
              )}

              {currentUser?.role === 'admin' && (
                <div className="flex flex-gap-sm mt-md">
                  <button onClick={() => openEdit(selectedZone)} className="btn-ghost btn-sm" aria-label={t('common.edit')}>
                    <Edit size={14} />
                    {t('common.edit')}
                  </button>
                  <button onClick={() => handleDelete(selectedZone._id)} className="btn-danger text-sm p-xs flex items-center gap-xs" aria-label={t('common.delete')}>
                    <Trash2 size={14} />
                    {t('common.delete')}
                  </button>
                </div>
              )}
            </div>
          )}

          {weather && (
            <div className="card flex-shrink-0 w-280">
              <div className="flex flex-between mb-sm">
                <h4 className="m-0 text-sm text-accent-blue flex items-center gap-xs">
                  <Thermometer size={14} />
                  {t('zones.weather')}
                </h4>
                <button onClick={() => setWeather(null)} className="bg-none border-none cursor-pointer p-0" aria-label={t('common.close')}>&times;</button>
              </div>
              <div className="text-lg text-bold">{weather.temperature != null ? `${weather.temperature}°C` : '--'}</div>
              <div className="text-sm text-muted mb-sm flex items-center gap-xs">
                <Activity size={14} />
                {weather.conditions} {weather.feelsLike != null ? `(feels ${weather.feelsLike}°C)` : ''}
              </div>
              <div className="text-sm grid-2 gap-8">
                {weather.humidity != null && <><span className="text-muted flex items-center gap-xs"><Droplets size={14} /> {t('zones.humidity')}</span><span>{weather.humidity}%</span></>}
                {weather.windSpeed != null && <><span className="text-muted flex items-center gap-xs"><Wind size={14} /> {t('zones.wind')}</span><span>{weather.windSpeed} km/h{weather.windGusts ? ` (gust ${weather.windGusts})` : ''}</span></>}
                {weather.precipitation != null && <><span className="text-muted flex items-center gap-xs"><Droplets size={14} /> {t('zones.precipitation')}</span><span>{weather.precipitation} mm</span></>}
                {weather.dailyPrecipitation != null && <><span className="text-muted flex items-center gap-xs"><Droplets size={14} /> 24h total</span><span>{weather.dailyPrecipitation} mm</span></>}
              </div>
              <button onClick={fetchWeather} className="text-xs mt-sm p-xs" disabled={weatherLoading}>
                {weatherLoading ? '...' : t('zones.refreshWeather') || 'Refresh'}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editZone ? t('zones.editZoneTitle') : t('zones.addZoneTitle')}
      >
        <form onSubmit={handleSubmit}>
          <div className="ff-group">
            <div className={`ff-wrap ${form.name ? 'ff-focused' : ''}`}>
              <input
                id="zone-name"
                type="text"
                value={form.name}
                onChange={updateForm('name')}
                required
                className={`ff-input ${form.name ? 'ff-input-filled' : ''}`}
                placeholder={t('zones.zoneNamePlaceholder')}
              />
              <label htmlFor="zone-name" className={`ff-label ${form.name ? 'ff-label-float' : ''}`}>
                {t('zones.zoneNamePlaceholder')}
              </label>
            </div>
          </div>

          <div className="flex flex-gap-sm">
            <div className="ff-group flex-1">
              <ModernSelect
                label={t('zones.disasterType') || 'Disaster type'}
                options={Object.keys(DISASTER_ICONS).map((d) => ({ label: d, value: d }))}
                value={form.disasterType}
                onChange={(v) => setForm((prev) => ({ ...prev, disasterType: v }))}
              />
            </div>
            <div className="ff-group flex-1">
              <ModernSelect
                label={t('zones.severity') || 'Severity'}
                options={Object.keys(SEVERITY_COLORS).map((s) => ({ label: s, value: s }))}
                value={form.severity}
                onChange={(v) => setForm((prev) => ({ ...prev, severity: v }))}
              />
            </div>
            <div className="ff-group flex-1">
              <ModernSelect
                label={t('zones.status') || 'Status'}
                options={['Active', 'Monitoring', 'Resolved', 'Closed'].map((s) => ({ label: s, value: s }))}
                value={form.status}
                onChange={(v) => setForm((prev) => ({ ...prev, status: v }))}
              />
            </div>
          </div>

          <div className="flex flex-gap-sm">
            <div className="ff-group flex-1">
              <div className={`ff-wrap ${form.centerLat ? 'ff-focused' : ''}`}>
                <input
                  id="zone-centerlat"
                  type="number"
                  step="any"
                  value={form.centerLat}
                  onChange={updateForm('centerLat')}
                  required
                  className={`ff-input ${form.centerLat ? 'ff-input-filled' : ''}`}
                  placeholder={t('zones.centerLat')}
                />
                <label htmlFor="zone-centerlat" className={`ff-label ${form.centerLat ? 'ff-label-float' : ''}`}>
                  {t('zones.centerLat')}
                </label>
              </div>
            </div>
            <div className="ff-group flex-1">
              <div className={`ff-wrap ${form.centerLng ? 'ff-focused' : ''}`}>
                <input
                  id="zone-centerlng"
                  type="number"
                  step="any"
                  value={form.centerLng}
                  onChange={updateForm('centerLng')}
                  required
                  className={`ff-input ${form.centerLng ? 'ff-input-filled' : ''}`}
                  placeholder={t('zones.centerLng')}
                />
                <label htmlFor="zone-centerlng" className={`ff-label ${form.centerLng ? 'ff-label-float' : ''}`}>
                  {t('zones.centerLng')}
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-gap-sm">
            <div className="ff-group flex-1">
              <div className={`ff-wrap ${form.radiusKm ? 'ff-focused' : ''}`}>
                <input
                  id="zone-radius"
                  type="number"
                  value={form.radiusKm}
                  onChange={updateForm('radiusKm')}
                  required
                  min="1"
                  className={`ff-input ${form.radiusKm ? 'ff-input-filled' : ''}`}
                  placeholder={t('zones.radiusKm')}
                />
                <label htmlFor="zone-radius" className={`ff-label ${form.radiusKm ? 'ff-label-float' : ''}`}>
                  {t('zones.radiusKm')}
                </label>
              </div>
            </div>
            <div className="ff-group flex-1">
              <div className={`ff-wrap ${form.affectedPopulation ? 'ff-focused' : ''}`}>
                <input
                  id="zone-population"
                  type="number"
                  value={form.affectedPopulation}
                  onChange={updateForm('affectedPopulation')}
                  className={`ff-input ${form.affectedPopulation ? 'ff-input-filled' : ''}`}
                  placeholder={t('zones.affectedPopulationPlaceholder')}
                />
                <label htmlFor="zone-population" className={`ff-label ${form.affectedPopulation ? 'ff-label-float' : ''}`}>
                  {t('zones.affectedPopulationPlaceholder')}
                </label>
              </div>
            </div>
          </div>

          <div className="ff-group">
            <div className={`ff-wrap ${form.description ? 'ff-focused' : ''}`}>
              <textarea
                id="zone-description"
                value={form.description}
                onChange={updateForm('description')}
                rows={2}
                className="ff-input ff-textarea"
                placeholder={t('zones.description')}
              />
              <label htmlFor="zone-description" className={`ff-label ff-label-with-icon ${form.description ? 'ff-label-float' : ''}`}>
                {t('zones.description')}
              </label>
            </div>
          </div>

          <div className="ff-group">
            <div className={`ff-wrap ${form.notes ? 'ff-focused' : ''}`}>
              <textarea
                id="zone-notes"
                value={form.notes}
                onChange={updateForm('notes')}
                rows={2}
                className="ff-input ff-textarea"
                placeholder={t('zones.notes')}
              />
              <label htmlFor="zone-notes" className={`ff-label ff-label-with-icon ${form.notes ? 'ff-label-float' : ''}`}>
                {t('zones.notes')}
              </label>
            </div>
          </div>

          <div className="flex flex-gap-sm mt">
            <RippleBtn type="submit" className="" disabled={saving} aria-label={t('common.submit')}>
              {saving ? '...' : (editZone ? t('zones.update') : t('zones.create'))}
            </RippleBtn>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost btn-sm" aria-label={t('common.cancel')}>{t('zones.cancel')}</button>
          </div>
        </form>
      </Modal>
      {ConfirmDialog}
    </motion.div>
    </PageTransition>
  )
}
