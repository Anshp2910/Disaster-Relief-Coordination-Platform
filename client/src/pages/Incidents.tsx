import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Plus, Edit, Trash2, MapPin, User, Activity, X } from 'lucide-react'
import L from 'leaflet'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'
import { clientApi } from '../api/client'
import { Modal, PageHeader, ErrorState, FilterBar, ModernSelect } from '../components/ui'
import { SkeletonList } from '../components/Skeleton'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useSocket, registerRefreshListener } from '../hooks/useSocket'
import { useDebounce } from '../hooks/useDebounce'
import { escapeHtml } from '../utils/escapeHtml'
import { useConfirm } from '../hooks/useConfirm'
import { useAuth } from '../context/AuthContext'
import EmptyState from '../components/EmptyState'
import { getErrorMessage } from '../utils/getErrorMessage'

interface Incident {
  _id: string
  name?: string
  description?: string
  disasterType?: string
  severity?: string
  status?: string
  affectedPopulation?: number
  centerLat?: number
  centerLng?: number
  stats?: { requestCount?: number; openRequests?: number; resourceCount?: number }
}

interface IncidentForm {
  name: string; description: string; disasterType: string; severity: string; status: string
  affectedPopulation: string; centerLat: string; centerLng: string
}

const DISASTER_ICONS: Record<string, string> = { Flood: 'FL', Earthquake: 'EQ', Cyclone: 'CY', Drought: 'DR', Fire: 'FR', Landslide: 'LS', Other: 'OT' }
const SEVERITY_COLORS: Record<string, string> = { Critical: 'var(--color-critical)', High: 'var(--color-high)', Medium: 'var(--color-medium)', Low: 'var(--color-low)' }
const STATUS_OPTIONS = ['All', 'Active', 'Monitoring', 'Resolved', 'Closed']
const DISASTER_OPTIONS = ['All', ...Object.keys(DISASTER_ICONS)]
const SEVERITY_OPTIONS = ['All', 'Critical', 'High', 'Medium', 'Low']

function buildIncidentPopup(inc: Incident, t: (k: string) => string) {
  const color = SEVERITY_COLORS[inc.severity || ''] || 'var(--text-muted)'
  const stats = inc.stats || {}
  return `<div style="font-family:var(--font);min-width:180px">
    <div style="font-weight:700;font-size:var(--text-sm);color:var(--accent);margin-bottom:var(--space-3xs)">${DISASTER_ICONS[inc.disasterType || ''] || ''} ${escapeHtml(inc.name || '')}</div>
    <div style="font-size:var(--text-xs);margin-bottom:var(--space-2xs)"><span style="color:${color};font-weight:600">${escapeHtml(inc.severity || '')}</span> &middot; ${escapeHtml(inc.status || '')}</div>
    <div style="font-size:var(--text-xs)">${t('requestDetail.allocateResources')}: <strong>${stats.requestCount || 0}</strong> (${stats.openRequests || 0} ${t('incidents.open')})</div>
    <div style="font-size:var(--text-xs)">${t('incidents.resources')}: <strong>${stats.resourceCount || 0}</strong></div></div>`
}

function buildIncidentIcon(inc: Incident) {
  const color = SEVERITY_COLORS[inc.severity || ''] || '#999'
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;background:${color};border:2px solid var(--bg-card);border-radius:50%;box-shadow:var(--shadow-md)"></div>`,
    iconSize: [28, 28], iconAnchor: [14, 14],
  })
}

const DEFAULT_FORM: IncidentForm = { name: '', description: '', disasterType: 'Other', severity: 'Medium', status: 'Active', affectedPopulation: '', centerLat: '20.5937', centerLng: '78.9629' }

export default function Incidents() {
  useEffect(() => { document.title = 'Disaster Relief - Incidents' }, [])
  const { t } = useTranslation()
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterSeverity, setFilterSeverity] = useState('All')
  const [filterDisaster, setFilterDisaster] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editIncident, setEditIncident] = useState<Incident | null>(null)
  const [form, setForm] = useState<IncidentForm>(DEFAULT_FORM)
  const { confirm, ConfirmDialog } = useConfirm()
  const { user: currentUser } = useAuth()
  const { socket } = useSocket()
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params: Record<string, string | number | undefined> = { page, limit: 20 }
      if (filterSeverity !== 'All') params.severity = filterSeverity
      if (filterDisaster !== 'All') params.disasterType = filterDisaster
      if (filterStatus !== 'All') params.status = filterStatus
      if (debouncedSearch) params.search = debouncedSearch
      const data = await clientApi.getIncidents(params) as { items?: Incident[]; pages?: number }
      setIncidents(data.items || []); setTotalPages(data.pages || 1)
    } catch (e) { setError(getErrorMessage(e)) }
    finally { setLoading(false) }
  }, [page, filterSeverity, filterDisaster, filterStatus, debouncedSearch])

  useEffect(() => { load() }, [load])
  useAutoRefresh(load, { interval: 20000 })
  useEffect(() => { return registerRefreshListener(['request:created', 'request:updated', 'request:deleted'], load) }, [load])
  useEffect(() => {
    if (!socket) return
    const onCreated = () => load(); const onUpdated = () => load(); const onDeleted = () => load()
    socket.on('incident:created', onCreated); socket.on('incident:updated', onUpdated); socket.on('incident:deleted', onDeleted)
    return () => { socket.off('incident:created', onCreated); socket.off('incident:updated', onUpdated); socket.off('incident:deleted', onDeleted) }
  }, [socket, load])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    const map = initLeafletMap(mapRef.current)
    if (!map) return
    mapInstanceRef.current = map
    const onResize = () => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize() }
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize); const m = mapInstanceRef.current; if (m) { cleanupLeafletMap(m); mapInstanceRef.current = null } }
  }, [loading])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    markersRef.current.forEach((m) => map.removeLayer(m))
    markersRef.current = []
    incidents.forEach((inc) => {
      if (!inc.centerLat || !inc.centerLng) return
      const marker = L.marker([inc.centerLat, inc.centerLng], { icon: buildIncidentIcon(inc) }).addTo(map)
      marker.bindPopup(buildIncidentPopup(inc, t))
      marker.on('click', () => setSelectedIncident(inc))
      markersRef.current.push(marker)
    })
  }, [incidents, t])

  function openCreate() { setEditIncident(null); setForm(DEFAULT_FORM); setShowForm(true) }
  function openEdit(inc: Incident) { setEditIncident(inc); setForm({ name: inc.name || '', description: inc.description || '', disasterType: inc.disasterType || 'Other', severity: inc.severity || 'Medium', status: inc.status || 'Active', affectedPopulation: String(inc.affectedPopulation || ''), centerLat: String(inc.centerLat || ''), centerLng: String(inc.centerLng || '') }); setShowForm(true) }
  const updateForm = (field: keyof IncidentForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    try {
      const payload = { ...form, affectedPopulation: Number(form.affectedPopulation) || 0, centerLat: Number(form.centerLat), centerLng: Number(form.centerLng) }
      if (editIncident) { await clientApi.updateIncident(editIncident._id, payload) }
      else { await clientApi.createIncident(payload) }
      setShowForm(false); load()
    } catch (e) { setError(getErrorMessage(e)) }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ message: t('incidents.deleteConfirm'), danger: true })
    if (!ok) return
    try { await clientApi.deleteIncident(id); setSelectedIncident(null); load() }
    catch (e) { setError(getErrorMessage(e)) }
  }

  const disasterTypeOptions = useMemo(() => Object.keys(DISASTER_ICONS).map((d) => ({ label: d, value: d })), [])

  return (
    <div className="container">
      <PageHeader
        title={t('nav.incidents') || 'Incident Grouping'}
        subtitle={`${incidents.length} ${t('incidents.incidentsTracked')}`}
        actions={currentUser?.role === 'admin' ? <button className="btn-primary btn-sm" onClick={openCreate}><Plus size={16} /> {t('incidents.createIncident')}</button> : undefined}
      />
      {error && <ErrorState message={error} onRetry={load} />}

      <FilterBar
        search={search} onSearchChange={(v) => { setSearch(v); setPage(1) }} searchPlaceholder={t('incidents.searchPlaceholder')}
        filters={[
          { key: 'status', label: t('incidents.status') || 'Status', options: STATUS_OPTIONS.map((s) => ({ key: s, label: s === 'All' ? t('dashboard.filterAll') : s })), value: filterStatus, onChange: (v) => { setFilterStatus(v); setPage(1) } },
          { key: 'severity', label: t('incidents.severity') || 'Severity', options: SEVERITY_OPTIONS.map((s) => ({ key: s, label: s === 'All' ? t('dashboard.filterAll') : s })), value: filterSeverity, onChange: (v) => { setFilterSeverity(v); setPage(1) } },
          { key: 'disaster', label: t('incidents.disasterType') || 'Disaster Type', options: DISASTER_OPTIONS.map((d) => ({ key: d, label: d === 'All' ? t('dashboard.filterAll') : d })), value: filterDisaster, onChange: (v) => { setFilterDisaster(v); setPage(1) } },
        ]}
      />

      {loading ? (
        <SkeletonList count={3} lines={2} />
      ) : incidents.length === 0 ? (
        <EmptyState icon={<AlertTriangle size={32} />} title={t('incidents.noIncidents') || 'No incidents found'} description={t('incidents.noIncidentsDesc') || 'No incidents match your filters'} />
      ) : (
        <div className="flex gap-md flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="card p-0">
              <div ref={mapRef} className="map-container-full w-full" style={{ minHeight: '55vh' }} />
            </div>
          </div>

          {selectedIncident && (
            <div className="card w-320">
              <div className="flex-between mb-sm">
                <h3 className="m-0 text-accent flex items-center gap-xs"><AlertTriangle size={16} /> {selectedIncident.name}</h3>
                <button onClick={() => setSelectedIncident(null)} className="bg-none border-none cursor-pointer"><X size={18} /></button>
              </div>
              <div className="flex gap-sm mb-sm flex-wrap">
                <span className="status-badge" style={{ color: SEVERITY_COLORS[selectedIncident.severity || ''] || 'var(--text-muted)', background: 'var(--bg-subtle)' }}>{selectedIncident.severity}</span>
                <span className="status-badge" style={{ background: 'var(--bg-subtle)', color: 'var(--accent)' }}>{selectedIncident.status}</span>
              </div>
              {selectedIncident.description && <div className="mb-sm text-base">{selectedIncident.description}</div>}
              <div className="text-sm" style={{ lineHeight: 2 }}>
                <div><MapPin size={14} className="inline-block" /> {t('incidents.type')}: <strong>{selectedIncident.disasterType}</strong></div>
                {(selectedIncident.affectedPopulation ?? 0) > 0 && <div><User size={14} className="inline-block" /> {t('incidents.affectedPopulation') || 'Affected'}: <strong>{(selectedIncident.affectedPopulation ?? 0).toLocaleString()}</strong></div>}
                {selectedIncident.stats && (
                  <>
                    <div><Activity size={14} className="inline-block" /> {t('incidents.requests')}: <strong>{selectedIncident.stats.requestCount || 0}</strong></div>
                    <div><MapPin size={14} className="inline-block" /> {t('incidents.resourcesNearby')}: <strong>{selectedIncident.stats.resourceCount || 0}</strong></div>
                  </>
                )}
              </div>
              {currentUser?.role === 'admin' && (
                <div className="flex gap-sm mt-md">
                  <button onClick={() => openEdit(selectedIncident)} className="btn-ghost btn-sm"><Edit size={14} /> {t('common.edit')}</button>
                  <button onClick={() => handleDelete(selectedIncident._id)} className="btn-danger btn-sm"><Trash2 size={14} /> {t('common.delete')}</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editIncident ? t('incidents.editIncident') : t('incidents.createIncident')}>
        <form onSubmit={handleSubmit}>
          <div className="ff-group">
            <div className={`ff-wrap ${form.name ? 'ff-focused' : ''}`}>
              <input id="inc-name" type="text" value={form.name} onChange={updateForm('name')} required maxLength={100} className={`ff-input ${form.name ? 'ff-input-filled' : ''}`} placeholder={t('incidents.incidentName')} />
              <label htmlFor="inc-name" className={`ff-label ${form.name ? 'ff-label-float' : ''}`}>{t('incidents.incidentName')}</label>
            </div>
          </div>
          <div className="flex gap-sm">
            <div className="ff-group flex-1">
              <ModernSelect label={t('incidents.disasterType') || 'Disaster type'} options={disasterTypeOptions} value={form.disasterType} onChange={(v) => setForm((prev) => ({ ...prev, disasterType: v }))} />
            </div>
            <div className="ff-group flex-1">
              <ModernSelect label={t('incidents.severity') || 'Severity'} options={Object.keys(SEVERITY_COLORS).map((s) => ({ label: s, value: s }))} value={form.severity} onChange={(v) => setForm((prev) => ({ ...prev, severity: v }))} />
            </div>
            <div className="ff-group flex-1">
              <ModernSelect label={t('incidents.status') || 'Status'} options={STATUS_OPTIONS.slice(1).map((s) => ({ label: s, value: s }))} value={form.status} onChange={(v) => setForm((prev) => ({ ...prev, status: v }))} />
            </div>
          </div>
          <div className="flex gap-sm">
            <div className="ff-group flex-1">
              <div className={`ff-wrap ${form.centerLat ? 'ff-focused' : ''}`}>
                <input id="inc-centerlat" type="number" step="any" value={form.centerLat} onChange={updateForm('centerLat')} required className={`ff-input ${form.centerLat ? 'ff-input-filled' : ''}`} placeholder="Lat" />
                <label htmlFor="inc-centerlat" className={`ff-label ${form.centerLat ? 'ff-label-float' : ''}`}>Lat</label>
              </div>
            </div>
            <div className="ff-group flex-1">
              <div className={`ff-wrap ${form.centerLng ? 'ff-focused' : ''}`}>
                <input id="inc-centerlng" type="number" step="any" value={form.centerLng} onChange={updateForm('centerLng')} required className={`ff-input ${form.centerLng ? 'ff-input-filled' : ''}`} placeholder="Lng" />
                <label htmlFor="inc-centerlng" className={`ff-label ${form.centerLng ? 'ff-label-float' : ''}`}>Lng</label>
              </div>
            </div>
            <div className="ff-group flex-1">
              <div className={`ff-wrap ${form.affectedPopulation ? 'ff-focused' : ''}`}>
                <input id="inc-population" type="number" step="any" value={form.affectedPopulation} onChange={updateForm('affectedPopulation')} className={`ff-input ${form.affectedPopulation ? 'ff-input-filled' : ''}`} placeholder={t('incidents.affectedPopulation') || 'Population'} />
                <label htmlFor="inc-population" className={`ff-label ${form.affectedPopulation ? 'ff-label-float' : ''}`}>{t('incidents.affectedPopulation') || 'Population'}</label>
              </div>
            </div>
          </div>
          <div className="ff-group">
            <div className={`ff-wrap ${form.description ? 'ff-focused' : ''}`}>
              <textarea id="inc-description" value={form.description} onChange={updateForm('description')} rows={3} maxLength={5000} className="ff-input ff-textarea" placeholder={t('incidents.descriptionPlaceholder') || 'Description'} />
              <label htmlFor="inc-description" className={`ff-label ${form.description ? 'ff-label-float' : ''}`}>{t('incidents.descriptionPlaceholder') || 'Description'}</label>
            </div>
          </div>
          <div className="flex gap-sm mt-sm">
            <button type="submit" className="btn-primary btn-sm">{editIncident ? t('incidents.update') : t('incidents.create')}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost btn-sm">{t('incidents.cancel')}</button>
          </div>
        </form>
      </Modal>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-sm mt-lg">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost btn-sm">{t('common.previous')}</button>
          <span className="text-sm text-muted">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="btn-ghost btn-sm">{t('common.next')}</button>
        </div>
      )}
      {ConfirmDialog}
    </div>
  )
}