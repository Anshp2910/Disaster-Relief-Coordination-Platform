import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import L from 'leaflet'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'
import { clientApi } from '../api/client'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { registerRefreshListener } from '../hooks/useSocket'
import { useDebounce } from '../hooks/useDebounce'
import { escapeHtml } from '../utils/escapeHtml'

const DISASTER_ICONS = {
  Flood: '', Earthquake: '', Cyclone: '', Drought: '', Fire: '', Landslide: '', Other: '',
}

const SEVERITY_COLORS = {
  Critical: 'var(--severity-critical)', High: 'var(--severity-high)', Medium: 'var(--severity-medium)', Low: 'var(--severity-low)',
}

const STATUS_OPTIONS = ['All', 'Active', 'Monitoring', 'Resolved', 'Closed']
const DISASTER_OPTIONS = ['All', ...Object.keys(DISASTER_ICONS)]
const SEVERITY_OPTIONS = ['All', 'Critical', 'High', 'Medium', 'Low']
const DEFAULT_CENTER = [20.5937, 78.9629]

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

function buildIncidentPopup(inc) {
  const color = SEVERITY_COLORS[inc.severity] || '#999'
  const stats = inc.stats || {}
  return `
    <div style="font-family:Arial,sans-serif;min-width:180px">
      <div style="font-weight:700;font-size:13px;color:#4a80c0;margin-bottom:4px">${DISASTER_ICONS[inc.disasterType] || ''} ${escapeHtml(inc.name)}</div>
      <div style="font-size:12px;margin-bottom:6px">
        <span style="color:${color};font-weight:600">${escapeHtml(inc.severity)}</span> &middot; ${escapeHtml(inc.status)}
      </div>
      <div style="font-size:12px">Requests: <strong>${stats.requestCount || 0}</strong> (${stats.openRequests || 0} open)</div>
      <div style="font-size:12px">Resources: <strong>${stats.resourceCount || 0}</strong></div>
    </div>
  `
}

function buildIncidentIcon(inc) {
  const color = SEVERITY_COLORS[inc.severity] || '#999'
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

const DEFAULT_FORM = {
  name: '', description: '', disasterType: 'Other', severity: 'Medium', status: 'Active',
  affectedPopulation: '', centerLat: '20.5937', centerLng: '78.9629',
}

export default function Incidents() {
  const { t } = useTranslation()
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterSeverity, setFilterSeverity] = useState('All')
  const [filterDisaster, setFilterDisaster] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editIncident, setEditIncident] = useState(null)
  const [form, setForm] = useState(DEFAULT_FORM)

  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])

  const currentUser = getCurrentUser()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, limit: 20 }
      if (filterSeverity !== 'All') params.severity = filterSeverity
      if (filterDisaster !== 'All') params.disasterType = filterDisaster
      if (filterStatus !== 'All') params.status = filterStatus
      if (debouncedSearch) params.search = debouncedSearch
      const data = await clientApi.getIncidents(params)
      setIncidents(data.items || [])
      setTotalPages(data.pages || 1)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, filterSeverity, filterDisaster, filterStatus, debouncedSearch])

  useEffect(() => { load() }, [page, filterSeverity, filterDisaster, filterStatus, debouncedSearch])

  useAutoRefresh(load, { interval: 20000 })

  useEffect(() => {
    return registerRefreshListener(['request:created', 'request:updated', 'request:deleted'], load)
  }, [load])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
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
  }, [])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    markersRef.current.forEach((m) => map.removeLayer(m))
    markersRef.current = []

    incidents.forEach((inc) => {
      if (!inc.centerLat || !inc.centerLng) return
      const marker = L.marker([inc.centerLat, inc.centerLng], { icon: buildIncidentIcon(inc) }).addTo(map)
      marker.bindPopup(buildIncidentPopup(inc))
      marker.on('click', () => setSelectedIncident(inc))
      markersRef.current.push(marker)
    })
  }, [incidents])

  function openCreate() {
    setEditIncident(null)
    setForm(DEFAULT_FORM)
    setShowForm(true)
  }

  function openEdit(inc) {
    setEditIncident(inc)
    setForm({
      name: inc.name,
      description: inc.description || '',
      disasterType: inc.disasterType,
      severity: inc.severity,
      status: inc.status,
      affectedPopulation: String(inc.affectedPopulation || ''),
      centerLat: String(inc.centerLat || ''),
      centerLng: String(inc.centerLng || ''),
    })
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        ...form,
        affectedPopulation: Number(form.affectedPopulation) || 0,
        centerLat: Number(form.centerLat),
        centerLng: Number(form.centerLng),
      }
      if (editIncident) {
        await clientApi.updateIncident(editIncident._id, payload)
      } else {
        await clientApi.createIncident(payload)
      }
      setShowForm(false)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm(t('incidents.deleteConfirm'))) return
    try {
      await clientApi.deleteIncident(id)
      setSelectedIncident(null)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const updateForm = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="container">
      <div className="card">
        <div className="headerRow">
          <div>
            <h2 className="pageTitle" style={{ fontSize: 20 }}>{t('nav.incidents') || 'Incident Grouping'}</h2>
            <div className="small" style={{ marginTop: 4 }}>{incidents.length} {t('incidents.incidentsTracked')}</div>
          </div>
          {currentUser?.role === 'admin' && (
            <button className="btnPrimary" onClick={openCreate}>{t('incidents.createIncident')}</button>
          )}
        </div>

        {error && <div className="errorText" style={{ marginTop: 8 }}>{error}</div>}

        <form onSubmit={(e) => { e.preventDefault(); setPage(1); load() }} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('incidents.searchPlaceholder')}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--gov-border)', borderRadius: 6, fontSize: 13 }}
          />
          <button type="submit" className="btnPrimary" style={{ fontSize: 12, padding: '6px 16px' }}>{t('incidents.search')}</button>
        </form>

        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setFilterStatus(s); setPage(1) }}
              className={`filter-pill ${filterStatus === s ? 'active' : ''}`}
            >
              {s}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {SEVERITY_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setFilterSeverity(s); setPage(1) }}
              className={`filter-pill ${filterSeverity === s ? 'active' : ''}`}
              style={{ fontSize: 11, ...(s !== 'All' ? { borderLeft: `3px solid ${SEVERITY_COLORS[s] || '#999'}` } : {}) }}
            >
              {s}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {DISASTER_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => { setFilterDisaster(d); setPage(1) }}
              className={`filter-pill ${filterDisaster === d ? 'active' : ''}`}
              style={{ fontSize: 11 }}
            >
              {d !== 'All' ? `${DISASTER_ICONS[d]} ` : ''}{d}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 0', minWidth: 0 }}>
          <div className="card" style={{ padding: 0 }}>
            <div ref={mapRef} className="map-container-full" style={{ height: '55vh', width: '100%', maxWidth: '100%' }} />
          </div>
        </div>

        {selectedIncident && (
          <div className="card" style={{ width: 320, flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3 style={{ margin: 0, fontSize: 15, color: 'var(--gov-blue)' }}>
                {DISASTER_ICONS[selectedIncident.disasterType]} {selectedIncident.name}
              </h3>
              <button onClick={() => setSelectedIncident(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>&times;</button>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: SEVERITY_COLORS[selectedIncident.severity] + '20', color: SEVERITY_COLORS[selectedIncident.severity], border: `1px solid ${SEVERITY_COLORS[selectedIncident.severity]}40` }}>
                {selectedIncident.severity}
              </span>
              <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: 'rgba(91,154,255,.1)', color: '#4a80c0', border: '1px solid rgba(91,154,255,.25)' }}>
                {selectedIncident.status}
              </span>
            </div>

            {selectedIncident.description && (
              <div style={{ fontSize: 13, marginBottom: 8, lineHeight: 1.5 }}>{selectedIncident.description}</div>
            )}

            <div style={{ fontSize: 13, lineHeight: 1.8 }}>
              <div>{t('incidents.type')}: <strong>{selectedIncident.disasterType}</strong></div>
              {selectedIncident.affectedPopulation > 0 && (
                <div>Affected: <strong>{selectedIncident.affectedPopulation.toLocaleString()}</strong></div>
              )}
              {selectedIncident.stats && (
                <>
                  <div>{t('incidents.requests')}: <strong>{selectedIncident.stats.requestCount || 0}</strong> ({selectedIncident.stats.openRequests || 0} {t('incidents.open')})</div>
                  <div>{t('incidents.resourcesNearby')}: <strong>{selectedIncident.stats.resourceCount || 0}</strong></div>
                </>
              )}
            </div>

            {currentUser?.role === 'admin' && (
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button onClick={() => openEdit(selectedIncident)} style={{ fontSize: 12, padding: '4px 10px' }}>Edit</button>
                <button onClick={() => handleDelete(selectedIncident._id)} className="btnDanger" style={{ fontSize: 12, padding: '4px 10px' }}>Delete</button>
              </div>
            )}
          </div>
        )}
      </div>

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 500, maxHeight: '90vh', overflow: 'auto' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--gov-blue)' }}>
              {editIncident ? t('incidents.editIncident') : t('incidents.createIncident')}
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8 }}>
              <input placeholder={t('incidents.incidentName')} value={form.name} onChange={updateForm('name')} required />

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
                  {STATUS_OPTIONS.slice(1).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 8 }}>
                <input type="number" step="any" placeholder="Center Latitude" value={form.centerLat} onChange={updateForm('centerLat')} required />
                <input type="number" step="any" placeholder="Center Longitude" value={form.centerLng} onChange={updateForm('centerLng')} required />
              </div>

              <input type="number" placeholder="Affected population" value={form.affectedPopulation} onChange={updateForm('affectedPopulation')} min="0" />
              <textarea placeholder="Description" value={form.description} onChange={updateForm('description')} rows={3} />

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="submit" className="btnPrimary">{editIncident ? t('incidents.update') : t('incidents.create')}</button>
                <button type="button" onClick={() => setShowForm(false)} style={{ color: 'var(--gov-muted)' }}>{t('incidents.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ fontSize: 12, padding: '6px 14px' }}>Previous</button>
          <span style={{ fontSize: 13, padding: '6px 12px' }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ fontSize: 12, padding: '6px 14px' }}>Next</button>
        </div>
      )}
    </div>
  )
}
