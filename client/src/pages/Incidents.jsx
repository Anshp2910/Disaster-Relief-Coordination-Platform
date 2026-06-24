import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import L from 'leaflet'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'
import { clientApi } from '../api/client'
import { SkeletonList } from '../components/Skeleton'
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
      <div style="font-weight:700;font-size:13px;color:#3b82f6;margin-bottom:4px">${DISASTER_ICONS[inc.disasterType] || ''} ${escapeHtml(inc.name)}</div>
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

  useEffect(() => { load() }, [load])

  useAutoRefresh(load, { interval: 20000 })

  useEffect(() => {
    return registerRefreshListener(['request:created', 'request:updated', 'request:deleted'], load)
  }, [load])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    try {
      const map = initLeafletMap(mapRef.current)
      if (!map) return
      mapInstanceRef.current = map
    } catch (_) { return }
    const onResize = () => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize() }
    window.addEventListener('resize', onResize)
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize)
      const m = mapInstanceRef.current; if (m) { cleanupLeafletMap(m); mapInstanceRef.current = null }
    }
  }, [loading])

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
            <h2 className="pageTitle text-2xl">{t('nav.incidents') || 'Incident Grouping'}</h2>
            <div className="small mt-xs">{incidents.length} {t('incidents.incidentsTracked')}</div>
          </div>
          {currentUser?.role === 'admin' && (
            <button className="btnPrimary" onClick={openCreate}>{t('incidents.createIncident')}</button>
          )}
        </div>

        {error && <div className="errorText mt-sm">{error}</div>}

        <form onSubmit={(e) => { e.preventDefault(); setPage(1); load() }} className="flex flex-gap-sm mt-md">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('incidents.searchPlaceholder')}
            className="flex-1 rounded-sm"
            style={{ padding: '8px 12px', border: '1px solid var(--gov-border)', fontSize: 13 }}
          />
          <button type="submit" className="btnPrimary text-sm" style={{ padding: '6px 16px' }}>{t('incidents.search')}</button>
        </form>

        <div className="flex flex-gap-sm mt-md flex-wrap">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setFilterStatus(s); setPage(1) }}
              className={`filter-pill ${filterStatus === s ? 'active' : ''}`}
              aria-label={s}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex flex-gap-sm mt-sm flex-wrap">
          {SEVERITY_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setFilterSeverity(s); setPage(1) }}
              className={`filter-pill ${filterSeverity === s ? 'active' : ''} text-xs`}
              style={{ ...(s !== 'All' ? { borderLeft: `3px solid ${SEVERITY_COLORS[s] || '#999'}` } : {}) }}
              aria-label={s}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex flex-gap-sm mt-sm flex-wrap">
          {DISASTER_OPTIONS.map((d) => (
            <button
              key={d}
              onClick={() => { setFilterDisaster(d); setPage(1) }}
              className={`filter-pill ${filterDisaster === d ? 'active' : ''} text-xs`}
              aria-label={d}
            >
              {d !== 'All' ? `${DISASTER_ICONS[d]} ` : ''}{d}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="mt-md">
          <SkeletonList count={3} lines={2} />
        </div>
      ) : (
      <div className="flex flex-wrap mt-md" style={{ gap: 12 }}>
        <div className="flex-1" style={{ minWidth: 0 }}>
          <div className="card p-0">
            <div ref={mapRef} className="map-container-full w-full" style={{ height: '55vh' }} />
          </div>
        </div>

        {selectedIncident && (
          <div className="card flex-shrink-0" style={{ width: 320 }}>
            <div className="flex-between mb-sm">
              <h3 className="m-0 text-accent-blue" style={{ fontSize: 15 }}>
                {DISASTER_ICONS[selectedIncident.disasterType]} {selectedIncident.name}
              </h3>
              <button onClick={() => setSelectedIncident(null)} className="bg-none border-none cursor-pointer text-xl" aria-label="Close">&times;</button>
            </div>

            <div className="flex flex-gap-sm mb-sm flex-wrap">
              <span className="text-xs text-semi" style={{ padding: '2px 8px', borderRadius: 4, background: (SEVERITY_COLORS[selectedIncident.severity] || '#999') + '20', color: SEVERITY_COLORS[selectedIncident.severity] || '#999', border: `1px solid ${(SEVERITY_COLORS[selectedIncident.severity] || '#999')}40` }}>
                {selectedIncident.severity}
              </span>
              <span className="text-xs text-semi" style={{ padding: '2px 8px', borderRadius: 4, background: 'var(--accent-soft)', color: 'var(--accent-blue)', border: '1px solid rgba(59,130,246,.25)' }}>
                {selectedIncident.status}
              </span>
            </div>

            {selectedIncident.description && (
              <div className="mb-sm" style={{ fontSize: 13, lineHeight: 1.5 }}>{selectedIncident.description}</div>
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
              <div className="flex flex-gap-sm mt-md">
                <button onClick={() => openEdit(selectedIncident)} className="text-sm" style={{ padding: '4px 10px' }} aria-label="Edit">Edit</button>
                <button onClick={() => handleDelete(selectedIncident._id)} className="btnDanger text-sm" style={{ padding: '4px 10px' }} aria-label="Delete">Delete</button>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {showForm && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="card" style={{ width: 500, maxHeight: '90vh', overflow: 'auto' }}>
            <h3 className="m-0 mb-md text-lg text-accent-blue">
              {editIncident ? t('incidents.editIncident') : t('incidents.createIncident')}
            </h3>
            <form onSubmit={handleSubmit} className="grid grid-gap-sm">
              <input placeholder={t('incidents.incidentName')} value={form.name} onChange={updateForm('name')} required />

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
                  {STATUS_OPTIONS.slice(1).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="grid-3-responsive">
                <input type="number" step="any" placeholder="Center Latitude" value={form.centerLat} onChange={updateForm('centerLat')} required />
                <input type="number" step="any" placeholder="Center Longitude" value={form.centerLng} onChange={updateForm('centerLng')} required />
              </div>

              <input type="number" placeholder="Affected population" value={form.affectedPopulation} onChange={updateForm('affectedPopulation')} min="0" />
              <textarea placeholder="Description" value={form.description} onChange={updateForm('description')} rows={3} />

              <div className="flex flex-gap-sm mt-xs">
                <button type="submit" className="btnPrimary">{editIncident ? t('incidents.update') : t('incidents.create')}</button>
                <button type="button" onClick={() => setShowForm(false)} className="text-muted" aria-label={t('incidents.cancel')}>{t('incidents.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-center flex-gap-sm mt-lg">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="text-sm" style={{ padding: '6px 14px' }} aria-label="Previous">Previous</button>
          <span className="text-sm" style={{ padding: '6px 12px' }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="text-sm" style={{ padding: '6px 14px' }} aria-label="Next">Next</button>
        </div>
      )}
    </div>
  )
}
