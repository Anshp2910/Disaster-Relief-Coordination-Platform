import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { AlertTriangle, Plus, Edit, Trash2, Search, Filter, MapPin, Clock, User, CheckCircle, XCircle, Activity } from 'lucide-react'
import L from 'leaflet'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'
import { clientApi } from '../api/client'
import { Modal, PageHeader, ErrorState, FilterBar, DataList, DataCard } from '../components/ui'
import { SkeletonList } from '../components/Skeleton'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useSocket, registerRefreshListener } from '../hooks/useSocket'
import { useToast } from '../components/Toast'
import { useDebounce } from '../hooks/useDebounce'
import { escapeHtml } from '../utils/escapeHtml'
import { useConfirm } from '../hooks/useConfirm'
import { useAuth } from '../context/AuthContext'
import EmptyState from '../components/EmptyState'

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
  stats?: {
    requestCount?: number
    openRequests?: number
    resourceCount?: number
  }
}

interface IncidentForm {
  name: string
  description: string
  disasterType: string
  severity: string
  status: string
  affectedPopulation: string
  centerLat: string
  centerLng: string
}

const DISASTER_ICONS: Record<string, string> = {
  Flood: '\u{1F327}', Earthquake: '\u{1F30A}', Cyclone: '\u{1F300}', Drought: '\u2600', Fire: '\u{1F525}', Landslide: '\u26F0', Other: '\u{1F4CC}',
}

const SEVERITY_COLORS: Record<string, string> = {
  Critical: 'var(--severity-critical)', High: 'var(--severity-high)', Medium: 'var(--severity-medium)', Low: 'var(--severity-low)',
}

const STATUS_OPTIONS = ['All', 'Active', 'Monitoring', 'Resolved', 'Closed']
const DISASTER_OPTIONS = ['All', ...Object.keys(DISASTER_ICONS)]
const SEVERITY_OPTIONS = ['All', 'Critical', 'High', 'Medium', 'Low']
const DEFAULT_CENTER: [number, number] = [20.5937, 78.9629]

const containerVariants = {
  hidden: { opacity: 0 },
  show: { transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

function buildIncidentPopup(inc: Incident) {
  const color = SEVERITY_COLORS[inc.severity || ''] || 'var(--text-muted)'
  const stats = inc.stats || {}
  return `
    <div style="font-family:Arial,sans-serif;min-width:180px">
      <div style="font-weight:700;font-size:13px;color:var(--pri-500);margin-bottom:4px">${DISASTER_ICONS[inc.disasterType || ''] || ''} ${escapeHtml(inc.name || '')}</div>
      <div style="font-size:12px;margin-bottom:6px">
        <span style="color:${color};font-weight:600">${escapeHtml(inc.severity || '')}</span> &middot; ${escapeHtml(inc.status || '')}
      </div>
      <div style="font-size:12px">Requests: <strong>${stats.requestCount || 0}</strong> (${stats.openRequests || 0} open)</div>
      <div style="font-size:12px">Resources: <strong>${stats.resourceCount || 0}</strong></div>
    </div>
  `
}

function buildIncidentIcon(inc: Incident) {
  const color = SEVERITY_COLORS[inc.severity || ''] || '#999'
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

const DEFAULT_FORM: IncidentForm = {
  name: '', description: '', disasterType: 'Other', severity: 'Medium', status: 'Active',
  affectedPopulation: '', centerLat: '20.5937', centerLng: '78.9629',
}

export default function Incidents() {
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

  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.Marker[]>([])

  const { user: currentUser } = useAuth()
  const { socket } = useSocket()
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string | number | undefined> = { page, limit: 20 }
      if (filterSeverity !== 'All') params.severity = filterSeverity
      if (filterDisaster !== 'All') params.disasterType = filterDisaster
      if (filterStatus !== 'All') params.status = filterStatus
      if (debouncedSearch) params.search = debouncedSearch
      const data = await clientApi.getIncidents(params) as { items?: Incident[]; pages?: number }
      setIncidents(data.items || [])
      setTotalPages(data.pages || 1)
    } catch (e) {
      setError((e as Error).message)
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
    if (!socket) return

    function onIncidentCreated(data: unknown) {
      const d = data as Record<string, unknown>
      const item = d.item as Record<string, unknown> | undefined
      toast.info(`Incident "${item?.name || 'New'}" created`)
      load()
    }
    function onIncidentUpdated(data: unknown) {
      const d = data as Record<string, unknown>
      const item = d.item as Record<string, unknown> | undefined
      toast.info(`Incident "${item?.name || 'Updated'}" updated`)
      load()
    }
    function onIncidentDeleted() {
      toast.info('Incident removed')
      load()
    }

    socket.on('incident:created', onIncidentCreated)
    socket.on('incident:updated', onIncidentUpdated)
    socket.on('incident:deleted', onIncidentDeleted)
    return () => {
      socket.off('incident:created', onIncidentCreated)
      socket.off('incident:updated', onIncidentUpdated)
      socket.off('incident:deleted', onIncidentDeleted)
    }
  }, [socket, load, toast])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    try {
      const map = initLeafletMap(mapRef.current)
      if (!map) return
      mapInstanceRef.current = map
    } catch { return }
    const onResize = () => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize() }
    window.addEventListener('resize', onResize)
    if (window.visualViewport) (window.visualViewport as EventTarget).addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (window.visualViewport) (window.visualViewport as EventTarget).removeEventListener('resize', onResize)
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

  function openEdit(inc: Incident) {
    setEditIncident(inc)
    setForm({
      name: inc.name || '',
      description: inc.description || '',
      disasterType: inc.disasterType || 'Other',
      severity: inc.severity || 'Medium',
      status: inc.status || 'Active',
      affectedPopulation: String(inc.affectedPopulation || ''),
      centerLat: String(inc.centerLat || ''),
      centerLng: String(inc.centerLng || ''),
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
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
      setError((e as Error).message)
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ message: t('incidents.deleteConfirm'), danger: true })
    if (!ok) return
    try {
      await clientApi.deleteIncident(id)
      setSelectedIncident(null)
      load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const updateForm = (field: keyof IncidentForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <motion.div className="container" variants={containerVariants} initial="hidden" animate="show">
      <PageHeader
        title={t('nav.incidents') || 'Incident Grouping'}
        subtitle={`${incidents.length} ${t('incidents.incidentsTracked')}`}
        actions={
          currentUser?.role === 'admin' ? (
            <button className="btnPrimary" onClick={openCreate}>
              <Plus size={16} />
              <span className="ml-xs">{t('incidents.createIncident')}</span>
            </button>
          ) : undefined
        }
      />

      {error && <ErrorState message={error} onRetry={load} />}

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder={t('incidents.searchPlaceholder')}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: STATUS_OPTIONS.map((s) => ({ key: s, label: s })),
            value: filterStatus,
            onChange: (v) => { setFilterStatus(v); setPage(1) },
          },
          {
            key: 'severity',
            label: 'Severity',
            options: SEVERITY_OPTIONS.map((s) => ({ key: s, label: s })),
            value: filterSeverity,
            onChange: (v) => { setFilterSeverity(v); setPage(1) },
          },
          {
            key: 'disaster',
            label: 'Disaster Type',
            options: DISASTER_OPTIONS.map((d) => ({ key: d, label: d })),
            value: filterDisaster,
            onChange: (v) => { setFilterDisaster(v); setPage(1) },
          },
        ]}
      />

      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="show"
        aria-label={t('nav.incidents')}
      >
        {loading ? (
          <motion.div variants={itemVariants} key="loading">
            <SkeletonList count={3} lines={2} />
          </motion.div>
        ) : incidents.length === 0 ? (
          <motion.div variants={itemVariants} key="empty">
            <EmptyState icon=' ' title={t('incidents.noIncidents') || 'No incidents found'} description={t('incidents.noIncidentsDesc') || 'No incidents match your filters'} />
          </motion.div>
        ) : (
          <motion.div className="flex flex-wrap gap-12" variants={itemVariants} key="content">
            <div className="flex-1">
              <div className="card p-0">
                <div ref={mapRef} className="map-container-full w-full h-55vh" />
              </div>
            </div>

            {selectedIncident && (
              <div className="card flex-shrink-0 w-320">
                <div className="flex-between mb-sm">
                  <h3 className="m-0 text-accent-blue text-15 flex items-center gap-xs">
                    <AlertTriangle size={16} />
                    {selectedIncident.name}
                  </h3>
                  <button onClick={() => setSelectedIncident(null)} className="bg-none border-none cursor-pointer text-xl" aria-label={t('common.close')}>&times;</button>
                </div>

                <div className="flex flex-gap-sm mb-sm flex-wrap">
                  <span className="text-xs text-semi severity-badge" data-severity={selectedIncident.severity}>
                    {selectedIncident.severity}
                  </span>
                  <span className="text-xs text-semi rounded-sm p-xs bg-accent-soft text-accent-blue">
                    {selectedIncident.status}
                  </span>
                </div>

                {selectedIncident.description && (
                  <div className="mb-sm text-13 leading-normal">{selectedIncident.description}</div>
                )}

                <div className="text-13 leading-lg">
                  <div className="flex items-center gap-xs">
                    <MapPin size={14} />
                    <span>{t('incidents.type')}: <strong>{selectedIncident.disasterType}</strong></span>
                  </div>
                  {(selectedIncident.affectedPopulation ?? 0) > 0 && (
                    <div className="flex items-center gap-xs">
                      <User size={14} />
                      <span>Affected: <strong>{(selectedIncident.affectedPopulation ?? 0).toLocaleString()}</strong></span>
                    </div>
                  )}
                  {selectedIncident.stats && (
                    <>
                      <div className="flex items-center gap-xs">
                        <Activity size={14} />
                        <span>{t('incidents.requests')}: <strong>{selectedIncident.stats.requestCount || 0}</strong> ({selectedIncident.stats.openRequests || 0} {t('incidents.open')})</span>
                      </div>
                      <div className="flex items-center gap-xs">
                        <MapPin size={14} />
                        <span>{t('incidents.resourcesNearby')}: <strong>{selectedIncident.stats.resourceCount || 0}</strong></span>
                      </div>
                    </>
                  )}
                </div>

                {currentUser?.role === 'admin' && (
                  <div className="flex flex-gap-sm mt-md">
                    <button onClick={() => openEdit(selectedIncident)} className="text-sm p-xs flex items-center gap-xs" aria-label={t('common.edit')}>
                      <Edit size={14} />
                      {t('common.edit')}
                    </button>
                    <button onClick={() => handleDelete(selectedIncident._id)} className="btnDanger text-sm p-xs flex items-center gap-xs" aria-label={t('common.delete')}>
                      <Trash2 size={14} />
                      {t('common.delete')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </motion.section>

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editIncident ? t('incidents.editIncident') : t('incidents.createIncident')}
      >
        <form onSubmit={handleSubmit} className="grid grid-gap-sm">
          <label htmlFor="inc-name" className="sr-only">{t('incidents.incidentName')}</label>
          <input id="inc-name" placeholder={t('incidents.incidentName')} value={form.name} onChange={updateForm('name')} required />

          <div className="grid-3-responsive">
            <label htmlFor="inc-disastertype" className="sr-only">Disaster type</label>
            <select id="inc-disastertype" value={form.disasterType} onChange={updateForm('disasterType')}>
              {Object.keys(DISASTER_ICONS).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <label htmlFor="inc-severity" className="sr-only">Severity</label>
            <select id="inc-severity" value={form.severity} onChange={updateForm('severity')}>
              {Object.keys(SEVERITY_COLORS).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <label htmlFor="inc-status" className="sr-only">Status</label>
            <select id="inc-status" value={form.status} onChange={updateForm('status')}>
              {STATUS_OPTIONS.slice(1).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="grid-3-responsive">
            <label htmlFor="inc-centerlat" className="sr-only">Center Latitude</label>
            <input id="inc-centerlat" type="number" step="any" placeholder="Center Latitude" value={form.centerLat} onChange={updateForm('centerLat')} required />
            <label htmlFor="inc-centerlng" className="sr-only">Center Longitude</label>
            <input id="inc-centerlng" type="number" step="any" placeholder="Center Longitude" value={form.centerLng} onChange={updateForm('centerLng')} required />
          </div>

          <label htmlFor="inc-population" className="sr-only">Affected population</label>
          <input id="inc-population" type="number" placeholder="Affected population" value={form.affectedPopulation} onChange={updateForm('affectedPopulation')} min="0" />
          <label htmlFor="inc-description" className="sr-only">Description</label>
          <textarea id="inc-description" placeholder="Description" value={form.description} onChange={updateForm('description')} rows={3} />

          <div className="flex flex-gap-sm mt-xs">
            <button type="submit" className="btnPrimary">{editIncident ? t('incidents.update') : t('incidents.create')}</button>
            <button type="button" onClick={() => setShowForm(false)} className="text-muted" aria-label={t('incidents.cancel')}>{t('incidents.cancel')}</button>
          </div>
        </form>
      </Modal>

      {totalPages > 1 && (
        <div className="flex flex-center flex-gap-sm mt-lg">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="text-sm p-xs" aria-label={t('common.previous')}>{t('common.previous')}</button>
          <span className="text-sm p-xs">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="text-sm p-xs" aria-label={t('common.next')}>{t('common.next')}</button>
        </div>
      )}
      {ConfirmDialog}
    </motion.div>
  )
}
