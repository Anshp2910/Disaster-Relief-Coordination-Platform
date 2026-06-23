import { useEffect, useState, useRef, useMemo, memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import L from 'leaflet'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'
import { clientApi } from '../api/client'
import { SkeletonMap } from '../components/Skeleton'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useDebounce } from '../hooks/useDebounce'
import { escapeHtml } from '../utils/escapeHtml'

const SEVERITY_COLORS = {
  Critical: { fill: '#cc0000', stroke: '#990000', weight: 0.6 },
  High: { fill: '#cc6600', stroke: '#994d00', weight: 0.5 },
  Medium: { fill: '#FF9933', stroke: '#cc7a00', weight: 0.4 },
  Low: { fill: '#138808', stroke: '#0d6e06', weight: 0.3 },
}

const DISASTER_ICONS = {
  Flood: '', Earthquake: '', Cyclone: '', Drought: '', Fire: '', Landslide: '', Other: '',
}

const COVERAGE_COLORS = {
  Covered: '#138808',
  Partial: '#FF9933',
  Gap: '#cc0000',
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
      <div style="font-weight:700;font-size:14px;color:#00d4ff;margin-bottom:4px">
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
      <hr style="margin:6px 0;border:none;border-top:1px solid #eee"/>
      <div style="font-size:12px">
        <div>Open requests: <strong style="color:#cc0000">${zone.openRequests}</strong></div>
        <div>Resources: <strong>${zone.totalResources}</strong> units</div>
        <div style="margin-top:4px">
          Coverage: <span style="background:${coverageColor};color:white;padding:1px 6px;border-radius:3px;font-size:11px">${escapeHtml(zone.coverageStatus)}</span>
        </div>
      </div>
      <div style="margin-top:8px">
        <button onclick="window.__selectZone('${escapeHtml(zone._id)}')" style="background:#00d4ff;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:11px">View Details</button>
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

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const circlesRef = useRef([])
  const zonesRef = useRef([])

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

    window.__selectZone = (id) => {
      const z = zonesRef.current.find((z) => z._id === id)
      if (z) setSelectedZone(z)
    }

    return () => {
      delete window.__selectZone
    }
  }, [zones])

  useEffect(() => {
    zonesRef.current = zones
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
            <h1 className="pageTitle" style={{ fontSize: 20 }}>{t('zones.title')}</h1>
            <div className="small" style={{ marginTop: 4 }}>
              {zones.length} zones &middot; {totalOpen} open requests &middot; {totalGap} coverage gaps &middot; {totalAffected.toLocaleString()} affected
            </div>
          </div>
          <div className="btnRow">
            {currentUser?.role === 'admin' && (
              <button className="btnPrimary" onClick={openCreate}>{t('zones.addZone')}</button>
            )}
          </div>
        </div>
        {error && <div className="errorText" style={{ marginTop: 8 }}>{error}</div>}

        <form onSubmit={(e) => { e.preventDefault(); load() }} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('zones.searchPlaceholder') || 'Search zones...'}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--gov-border)', borderRadius: 6, fontSize: 13 }}
          />
        </form>

        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setFilterStatus(s) }}
              className={`filter-pill ${filterStatus === s ? 'active' : ''}`}
              style={{ fontSize: 11 }}
            >
              {s}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {SEVERITY_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setFilterSeverity(s) }}
              className={`filter-pill ${filterSeverity === s ? 'active' : ''}`}
              style={{ fontSize: 11, ...(s !== 'All' && SEVERITY_COLORS[s] ? { borderLeft: `3px solid ${SEVERITY_COLORS[s].fill}` } : {}) }}
            >
              {s}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {DISASTER_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => { setFilterDisaster(d) }}
              className={`filter-pill ${filterDisaster === d ? 'active' : ''}`}
              style={{ fontSize: 11 }}
            >
              {d !== 'All' ? `${DISASTER_ICONS[d]} ` : ''}{d}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card" style={{ padding: 0, position: 'relative' }}>
            {loading && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 1000 }}>
                <SkeletonMap height="65vh" />
              </div>
            )}
            {!loading && zones.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
                <img src="/images/empty-map.svg" alt="No zones" style={{ width: 200, marginBottom: 16 }} />
                <div className="muted">{t('zones.noZones')}</div>
                {currentUser?.role === 'admin' && (
                  <button className="btnPrimary" onClick={openCreate} style={{ marginTop: 12 }}>{t('zones.createZone')}</button>
                )}
              </div>
            )}
            <div ref={mapRef} className="map-container-full" style={{ height: '65vh', width: '100%', maxWidth: '100%' }} />
          </div>

          <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
            {Object.entries(SEVERITY_COLORS).map(([sev, c]) => (
              <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: c.fill, border: `2px solid ${c.stroke}` }} />
                <span>{sev}</span>
              </div>
            ))}
            <span style={{ fontSize: 12, color: '#999' }}>&middot;</span>
            {Object.entries(COVERAGE_COLORS).map(([cov, c]) => (
              <div key={cov} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                <span>{cov}</span>
              </div>
            ))}
          </div>
        </div>

        {selectedZone && (
          <div className="card" style={{ width: 320, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, color: '#00d4ff' }}>
                  {DISASTER_ICONS[selectedZone.disasterType]} {selectedZone.name}
                </h3>
                <div style={{ fontSize: 12, marginTop: 4, color: '#666' }}>
                  {selectedZone.disasterType} &middot; {selectedZone.status}
                </div>
              </div>
              <button onClick={() => setSelectedZone(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 0 }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: SEVERITY_COLORS[selectedZone.severity]?.fill + '20', color: SEVERITY_COLORS[selectedZone.severity]?.fill, border: `1px solid ${SEVERITY_COLORS[selectedZone.severity]?.fill}40` }}>
                {selectedZone.severity}
              </span>
              <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: COVERAGE_COLORS[selectedZone.coverageStatus] + '20', color: COVERAGE_COLORS[selectedZone.coverageStatus], border: `1px solid ${COVERAGE_COLORS[selectedZone.coverageStatus]}40` }}>
                {selectedZone.coverageStatus} coverage
              </span>
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.8 }}>
              <div>{t('zones.radiusLabel')} <strong>{selectedZone.radiusKm} {t('zones.km')}</strong></div>
              {selectedZone.affectedPopulation > 0 && (
                <div>Affected: <strong>{selectedZone.affectedPopulation.toLocaleString()}</strong></div>
              )}
              <div>Open requests: <strong style={{ color: '#cc0000' }}>{selectedZone.openRequests}</strong></div>
              <div>{t('zones.totalResources')}: <strong>{selectedZone.totalResources}</strong> {t('zones.units')}</div>
            </div>

            {selectedZone.stats?.openRequests > 0 && (
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.06)', borderRadius: 6, fontSize: 12 }}>
                <strong style={{ color: '#cc0000' }}>{t('zones.coverageGap')}</strong> {selectedZone.stats.openRequests} {t('zones.requestsWithNoResources')}
              </div>
            )}

            {currentUser?.role === 'admin' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => openEdit(selectedZone)} style={{ fontSize: 12, padding: '4px 10px' }}>Edit</button>
                <button onClick={() => handleDelete(selectedZone._id)} className="btnDanger" style={{ fontSize: 12, padding: '4px 10px' }}>Delete</button>
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 500, maxHeight: '90vh', overflow: 'auto' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#00d4ff' }}>{editZone ? t('zones.editZoneTitle') : t('zones.addZoneTitle')}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8 }}>
              <input placeholder={t('zones.zoneNamePlaceholder')} value={form.name} onChange={updateForm('name')} required />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))', gap: 8 }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 8 }}>
                <input type="number" step="any" placeholder={t('zones.centerLat')} value={form.centerLat} onChange={updateForm('centerLat')} required />
                <input type="number" step="any" placeholder={t('zones.centerLng')} value={form.centerLng} onChange={updateForm('centerLng')} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 8 }}>
                <input type="number" placeholder={t('zones.radiusKm')} value={form.radiusKm} onChange={updateForm('radiusKm')} required min="1" />
                <input type="number" placeholder={t('zones.affectedPopulationPlaceholder')} value={form.affectedPopulation} onChange={updateForm('affectedPopulation')} min="0" />
              </div>

              <textarea placeholder={t('zones.description')} value={form.description} onChange={updateForm('description')} rows={2} />
              <textarea placeholder={t('zones.notes')} value={form.notes} onChange={updateForm('notes')} rows={2} />

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="submit" className="btnPrimary" disabled={saving}>{saving ? '...' : (editZone ? t('zones.update') : t('zones.create'))}</button>
                <button type="button" onClick={() => setShowForm(false)} style={{ color: '#666' }}>{t('zones.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
