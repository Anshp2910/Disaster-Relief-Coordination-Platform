import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import L from 'leaflet'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'
import { clientApi } from '../api/client'
import { SkeletonMap } from '../components/Skeleton'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useDebounce } from '../hooks/useDebounce'
import { escapeHtml } from '../utils/escapeHtml'

const SEVERITY_COLORS = {
  Critical: { fill: 'var(--severity-critical)', stroke: 'var(--severity-critical-stroke)', weight: 0.6 },
  High: { fill: 'var(--severity-high)', stroke: 'var(--severity-high-stroke)', weight: 0.5 },
  Medium: { fill: 'var(--severity-medium)', stroke: 'var(--severity-medium-stroke)', weight: 0.4 },
  Low: { fill: 'var(--severity-low)', stroke: 'var(--severity-low-stroke)', weight: 0.3 },
}

const DISASTER_ICONS = {
  Flood: '', Earthquake: '', Cyclone: '', Drought: '', Fire: '', Landslide: '', Other: '',
}

const COVERAGE_COLORS = {
  Covered: 'var(--coverage-covered)',
  Partial: 'var(--coverage-partial)',
  Gap: 'var(--coverage-gap)',
}

const DEFAULT_CENTER = [20.5937, 78.9629]

const SEVERITY_OPTIONS = ['All', 'Critical', 'High', 'Medium', 'Low']
const DISASTER_OPTIONS = ['All', ...Object.keys(DISASTER_ICONS)]
const STATUS_OPTIONS = ['All', 'Active', 'Monitoring', 'Resolved', 'Closed']

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

function buildPopup(zone, color) {
  const coverageColor = COVERAGE_COLORS[zone.coverageStatus] || '#999'
  return `
    <div style="font-family:Arial,sans-serif;min-width:200px">
      <div style="font-weight:700;font-size:14px;color:#3b82f6;margin-bottom:4px">
        ${DISASTER_ICONS[zone.disasterType] || ''} ${escapeHtml(zone.name)}
      </div>
      <div style="font-size:12px;margin-bottom:6px">
        <span style="color:${color.fill};font-weight:600">${escapeHtml(zone.severity)}</span> severity
        &middot; ${escapeHtml(zone.disasterType)}
      </div>
      <div style="font-size:12px;margin-bottom:4px">Radius: ${zone.radiusKm} km</div>
      ${zone.affectedPopulation > 0
        ? `<div style="font-size:12px;margin-bottom:4px">Affected: ${zone.affectedPopulation.toLocaleString()}</div>`
        : ''
      }
      <hr style="margin:6px 0;border:none;border-top:1px solid rgba(255,255,255,0.1)"/>
      <div style="font-size:12px">
        <div>Open requests: <strong style="color:#ef4444">${zone.openRequests}</strong></div>
        <div>Resources: <strong>${zone.totalResources}</strong> units</div>
        <div style="margin-top:4px">
          Coverage: <span style="background:${coverageColor};color:white;padding:1px 6px;border-radius:3px;font-size:11px">${escapeHtml(zone.coverageStatus)}</span>
        </div>
      </div>
      <div style="margin-top:8px">
        <button data-zone-id="${escapeHtml(zone._id)}" class="zone-view-btn" style="background:#3b82f6;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px">View Details</button>
      </div>
    </div>
  `
}

const DEFAULT_FORM = {
  name: '', description: '', centerLat: '20.5937', centerLng: '78.9629', radiusKm: '10',
  severity: 'Medium', status: 'Active', disasterType: 'Other', affectedPopulation: '', notes: '',
}

export default function ZoneHeatMap() {
  const { t } = useTranslation()
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedZone, setSelectedZone] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editZone, setEditZone] = useState(null)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('All')
  const [filterDisaster, setFilterDisaster] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const [weather, setWeather] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(false)

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const circlesRef = useRef([])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { limit: 100 }
      if (filterSeverity !== 'All') params.severity = filterSeverity
      if (filterDisaster !== 'All') params.disasterType = filterDisaster
      if (filterStatus !== 'All') params.status = filterStatus
      if (debouncedSearch) params.search = debouncedSearch
      const data = await clientApi.getZones(params)
      setZones(data.items || [])
    } catch (e) {
      setError(e.message || 'Failed to load zones')
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
      const data = await clientApi.getWeatherCurrent(center.lat.toFixed(4), center.lng.toFixed(4))
      setWeather(data)
    } catch {
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
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize)
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
      const color = SEVERITY_COLORS[zone.severity] || SEVERITY_COLORS.Medium
      const circle = L.circle([zone.centerLat, zone.centerLng], {
        radius: zone.radiusKm * 1000,
        fillColor: color.fill,
        fillOpacity: color.weight,
        color: color.stroke,
        weight: 2,
      }).addTo(map)

      circle.bindPopup(buildPopup(zone, color))
      circle.on('click', () => setSelectedZone(zone))
      circlesRef.current.push(circle)
    })

    const clickHandler = (e) => {
      const btn = e.target.closest('.zone-view-btn')
      if (!btn) return
      const zoneId = btn.getAttribute('data-zone-id')
      const z = zones.find((z) => z._id === zoneId)
      if (z) setSelectedZone(z)
    }

    function onPopupOpen(e) {
      const popupEl = e.popup.getElement()
      popupEl.addEventListener('click', clickHandler)
    }

    function onPopupClose(e) {
      const popupEl = e.popup.getElement()
      popupEl.removeEventListener('click', clickHandler)
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

  function openEdit(zone) {
    setEditZone(zone)
    setForm({
      name: zone.name,
      description: zone.description || '',
      centerLat: String(zone.centerLat),
      centerLng: String(zone.centerLng),
      radiusKm: String(zone.radiusKm),
      severity: zone.severity,
      status: zone.status,
      disasterType: zone.disasterType,
      affectedPopulation: String(zone.affectedPopulation || ''),
      notes: zone.notes || '',
    })
    setShowForm(true)
  }

  async function handleSubmit(e) {
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
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm(t('zones.deleteConfirm'))) return
    try {
      await clientApi.deleteZone(id)
      setSelectedZone(null)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const currentUser = getCurrentUser()
  const totalOpen = useMemo(() => zones.reduce((s, z) => s + z.openRequests, 0), [zones])
  const totalGap = useMemo(() => zones.filter((z) => z.coverageStatus === 'Gap').length, [zones])
  const totalAffected = useMemo(() => zones.reduce((s, z) => s + (z.affectedPopulation || 0), 0), [zones])

  const updateForm = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="container">
      <div className="card">
        <div className="headerRow">
          <div>
            <h1 className="pageTitle">{t('zones.title')}</h1>
            <div className="small mt-xs">
              {zones.length} zones &middot; {totalOpen} open requests &middot; {totalGap} coverage gaps &middot; {totalAffected.toLocaleString()} affected
            </div>
          </div>
          <div className="btnRow">
            {currentUser?.role === 'admin' && (
              <button className="btnPrimary" onClick={openCreate} aria-label="Add zone">{t('zones.addZone')}</button>
            )}
            <button className="btnSecondary text-sm" onClick={fetchWeather} disabled={weatherLoading}>
              {weatherLoading ? '...' : '🌤 ' + (t('zones.weather') || 'Weather')}
            </button>
          </div>
        </div>
        {error && <div className="errorText mt-sm">{error}</div>}

        <form onSubmit={(e) => { e.preventDefault(); load() }} className="flex flex-gap-sm mt-md">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('zones.searchPlaceholder') || 'Search zones...'}
            className="flex-1"
          />
        </form>

        <div className="flex flex-gap-xs mt-sm flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setFilterStatus(s) }}
              className={`filter-pill text-xs ${filterStatus === s ? 'active' : ''}`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex flex-gap-xs mt-xs flex-wrap">
          {SEVERITY_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setFilterSeverity(s) }}
              className={`filter-pill text-xs ${filterSeverity === s ? 'active' : ''}`}
              style={s !== 'All' && SEVERITY_COLORS[s] ? { borderLeft: `3px solid ${SEVERITY_COLORS[s].fill}` } : {}}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex flex-gap-xs mt-xs flex-wrap">
          {DISASTER_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => { setFilterDisaster(d) }}
              className={`filter-pill text-xs ${filterDisaster === d ? 'active' : ''}`}
            >
              {d !== 'All' ? `${DISASTER_ICONS[d]} ` : ''}{d}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-gap mt-md flex-wrap">
        <div className="flex-1">
          <div className="card p-0 relative">
            {loading && (
              <div className="absolute z-100" style={{ inset: 0 }}>
                <SkeletonMap height="65vh" />
              </div>
            )}
            {!loading && zones.length === 0 && (
              <div className="flex flex-col flex-center p-2xl">
                <img src="/images/empty-map.svg" alt="No zones" style={{ width: 200, marginBottom: 16 }} />
                <div className="muted">{t('zones.noZones')}</div>
                {currentUser?.role === 'admin' && (
                  <button className="btnPrimary mt-md" onClick={openCreate} aria-label="Create zone">{t('zones.createZone')}</button>
                )}
              </div>
            )}
            <div ref={mapRef} className="map-container-full" style={{ height: '65vh', width: '100%', maxWidth: '100%' }} />
          </div>

          <div className="flex flex-gap-lg mt-sm flex-wrap">
            {Object.entries(SEVERITY_COLORS).map(([sev, c]) => (
              <div key={sev} className="gap-row-xs text-sm">
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: c.fill, border: `2px solid ${c.stroke}` }} />
                <span>{sev}</span>
              </div>
            ))}
            <span className="text-sm text-muted">&middot;</span>
            {Object.entries(COVERAGE_COLORS).map(([cov, c]) => (
              <div key={cov} className="gap-row-xs text-sm">
                <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                <span>{cov}</span>
              </div>
            ))}
          </div>
        </div>

        {selectedZone && (
          <div className="card flex-shrink-0" style={{ width: 320 }}>
            <div className="flex flex-between mb-sm">
              <div>
                <h3 className="m-0 text-lg">
                  {DISASTER_ICONS[selectedZone.disasterType]} {selectedZone.name}
                </h3>
                <div className="text-sm mt-xs text-muted">
                  {selectedZone.disasterType} &middot; {selectedZone.status}
                </div>
              </div>
              <button onClick={() => setSelectedZone(null)} className="bg-none border-none cursor-pointer text-xl p-0" aria-label="Close">&times;</button>
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
              <div>{t('zones.radiusLabel')} <strong>{selectedZone.radiusKm} {t('zones.km')}</strong></div>
              {selectedZone.affectedPopulation > 0 && (
                <div>Affected: <strong>{selectedZone.affectedPopulation.toLocaleString()}</strong></div>
              )}
              <div>Open requests: <strong style={{ color: 'var(--gov-danger)' }}>{selectedZone.openRequests}</strong></div>
              <div>{t('zones.totalResources')}: <strong>{selectedZone.totalResources}</strong> {t('zones.units')}</div>
            </div>

            {selectedZone.stats?.openRequests > 0 && (
              <div className="mt-md rounded-sm text-sm" style={{ padding: '8px 12px', background: 'rgba(248,81,73,0.06)' }}>
                <strong style={{ color: 'var(--gov-danger)' }}>{t('zones.coverageGap')}</strong> {selectedZone.stats.openRequests} {t('zones.requestsWithNoResources')}
              </div>
            )}

            {currentUser?.role === 'admin' && (
              <div className="flex flex-gap-sm mt-md">
                <button onClick={() => openEdit(selectedZone)} className="text-sm p-xs" aria-label="Edit zone">Edit</button>
                <button onClick={() => handleDelete(selectedZone._id)} className="btnDanger text-sm p-xs" aria-label="Delete zone">Delete</button>
              </div>
            )}
          </div>
        )}

        {weather && (
          <div className="card flex-shrink-0" style={{ width: 280 }}>
            <div className="flex flex-between mb-sm">
              <h4 className="m-0 text-sm" style={{ color: 'var(--gov-blue)' }}>{t('zones.weather')}</h4>
              <button onClick={() => setWeather(null)} className="bg-none border-none cursor-pointer p-0" aria-label="Close">&times;</button>
            </div>
            <div className="text-lg text-bold">{weather.temperature != null ? `${weather.temperature}°C` : '--'}</div>
            <div className="text-sm text-muted mb-sm">{weather.conditions} {weather.feelsLike != null ? `(feels ${weather.feelsLike}°C)` : ''}</div>
            <div className="text-sm" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
              {weather.humidity != null && <><span className="text-muted">Humidity</span><span>{weather.humidity}%</span></>}
              {weather.windSpeed != null && <><span className="text-muted">Wind</span><span>{weather.windSpeed} km/h{weather.windGusts ? ` (gust ${weather.windGusts})` : ''}</span></>}
              {weather.precipitation != null && <><span className="text-muted">Precip</span><span>{weather.precipitation} mm</span></>}
              {weather.dailyPrecipitation != null && <><span className="text-muted">24h total</span><span>{weather.dailyPrecipitation} mm</span></>}
            </div>
            <button onClick={fetchWeather} className="text-xs mt-sm" disabled={weatherLoading} style={{ padding: '3px 10px' }}>
              {weatherLoading ? '...' : t('zones.refreshWeather') || 'Refresh'}
            </button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="card overflow-auto" style={{ width: 500, maxHeight: '90vh' }}>
            <h3 className="m-0 mb text-lg">{editZone ? t('zones.editZoneTitle') : t('zones.addZoneTitle')}</h3>
            <form onSubmit={handleSubmit} className="grid flex-gap-sm">
              <input placeholder={t('zones.zoneNamePlaceholder')} value={form.name} onChange={updateForm('name')} required />

              <div className="grid-3-responsive">
                <select value={form.disasterType} onChange={updateForm('disasterType')}>
                  {Object.keys(DISASTER_ICONS).map((d) => (
                    <option key={d} value={d}>{DISASTER_ICONS[d]} {d}</option>
                  ))}
                </select>
                <select value={form.severity} onChange={updateForm('severity')}>
                  {Object.keys(SEVERITY_COLORS).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select value={form.status} onChange={updateForm('status')}>
                  {['Active', 'Monitoring', 'Resolved', 'Closed'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="grid-3-responsive">
                <input type="number" step="any" placeholder={t('zones.centerLat')} value={form.centerLat} onChange={updateForm('centerLat')} required />
                <input type="number" step="any" placeholder={t('zones.centerLng')} value={form.centerLng} onChange={updateForm('centerLng')} required />
              </div>

              <div className="grid-3-responsive">
                <input type="number" placeholder={t('zones.radiusKm')} value={form.radiusKm} onChange={updateForm('radiusKm')} required min="1" />
                <input type="number" placeholder={t('zones.affectedPopulationPlaceholder')} value={form.affectedPopulation} onChange={updateForm('affectedPopulation')} min="0" />
              </div>

              <textarea placeholder={t('zones.description')} value={form.description} onChange={updateForm('description')} rows={2} />
              <textarea placeholder={t('zones.notes')} value={form.notes} onChange={updateForm('notes')} rows={2} />

              <div className="flex flex-gap-sm mt-xs">
                <button type="submit" className="btnPrimary" disabled={saving} aria-label="Submit">{saving ? '...' : (editZone ? t('zones.update') : t('zones.create'))}</button>
                <button type="button" onClick={() => setShowForm(false)} className="text-muted" aria-label="Cancel">{t('zones.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
