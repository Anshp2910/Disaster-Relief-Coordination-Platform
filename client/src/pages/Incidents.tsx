import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { createStagger, createListItem } from '../utils/animations'
import { AlertTriangle, Plus, Edit, Trash2, MapPin, User, Activity } from 'lucide-react'
import L from 'leaflet'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'
import { clientApi } from '../api/client'
import { Modal, PageHeader, ErrorState, FilterBar, ModernSelect, RippleBtn, PageTransition } from '../components/ui'
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

const containerVariants = createStagger(0.05)
const itemVariants = createListItem(10, 0.3)

function buildIncidentPopup(inc: Incident, t: (k: string) => string) {
  const color = SEVERITY_COLORS[inc.severity || ''] || 'var(--text-muted)'
  const stats = inc.stats || {}
  return `
    <div style="font-family:var(--font);min-width:180px">
      <div style="font-weight:700;font-size:var(--text-sm);color:var(--pri-500);margin-bottom:var(--space-3xs)">${DISASTER_ICONS[inc.disasterType || ''] || ''} ${escapeHtml(inc.name || '')}</div>
      <div style="font-size:var(--text-xs);margin-bottom:var(--space-2xs)">
        <span style="color:${color};font-weight:600">${escapeHtml(inc.severity || '')}</span> &middot; ${escapeHtml(inc.status || '')}
      </div>
      <div style="font-size:var(--text-xs)">${t('requestDetail.allocateResources')}: <strong>${stats.requestCount || 0}</strong> (${stats.openRequests || 0} ${t('incidents.open')})</div>
      <div style="font-size:var(--text-xs)">${t('incidents.resources')}: <strong>${stats.resourceCount || 0}</strong></div>
    </div>
  `
}

function buildIncidentIcon(inc: Incident) {
  const color = SEVERITY_COLORS[inc.severity || ''] || '#999'
  const pulseClass = 'marker-pulse' + (inc.severity === 'Critical' ? ' marker-pulse-danger' : inc.severity === 'High' ? ' marker-pulse-warning' : '')
  return L.divIcon({
    className: pulseClass,
    html: `<div style="width:28px;height:28px;background:${color};border:2px solid var(--bg-card);border-radius:50%;box-shadow:var(--shadow-md)"></div>`,
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
      setError(getErrorMessage(e))
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

    function onIncidentCreated() {
      load()
    }
    function onIncidentUpdated() {
      load()
    }
    function onIncidentDeleted() {
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
  }, [socket, load])

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
      marker.bindPopup(buildIncidentPopup(inc, t))
      marker.on('click', () => setSelectedIncident(inc))
      markersRef.current.push(marker)
    })
  }, [incidents, t])

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
      setError(getErrorMessage(e))
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
      setError(getErrorMessage(e))
    }
  }

  const updateForm = (field: keyof IncidentForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const disasterTypeOptions = useMemo(() => Object.keys(DISASTER_ICONS).map((d) => ({ label: d, value: d })), [])
  const severityOptions = useMemo(() => Object.keys(SEVERITY_COLORS).map((s) => ({ label: s, value: s })), [])
  const statusFormOptions = useMemo(() => STATUS_OPTIONS.slice(1).map((s) => ({ label: s, value: s })), [])

  return (
    <PageTransition>
      <motion.div className="container" variants={containerVariants} initial="hidden" animate="visible">
      <PageHeader
        title={t('nav.incidents') || 'Incident Grouping'}
        subtitle={`${incidents.length} ${t('incidents.incidentsTracked')}`}
        actions={
          currentUser?.role === 'admin' ? (
            <RippleBtn className="" onClick={openCreate}>
              <Plus size={16} />
              <span className="ml-xs">{t('incidents.createIncident')}</span>
            </RippleBtn>
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
            label: t('incidents.status') || 'Status',
            options: STATUS_OPTIONS.map((s) => ({ key: s, label: s === 'All' ? t('dashboard.filterAll') : s })),
            value: filterStatus,
            onChange: (v) => { setFilterStatus(v); setPage(1) },
          },
          {
            key: 'severity',
            label: t('incidents.severity') || 'Severity',
            options: SEVERITY_OPTIONS.map((s) => ({ key: s, label: s === 'All' ? t('dashboard.filterAll') : s })),
            value: filterSeverity,
            onChange: (v) => { setFilterSeverity(v); setPage(1) },
          },
          {
            key: 'disaster',
            label: t('incidents.disasterType') || 'Disaster Type',
            options: DISASTER_OPTIONS.map((d) => ({ key: d, label: d === 'All' ? t('dashboard.filterAll') : d })),
            value: filterDisaster,
            onChange: (v) => { setFilterDisaster(v); setPage(1) },
          },
        ]}
      />

      <motion.section
        variants={containerVariants}
        initial="hidden"
        animate="visible"
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
                      <span>{t('incidents.affectedPopulation') || 'Affected'}: <strong>{(selectedIncident.affectedPopulation ?? 0).toLocaleString()}</strong></span>
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
                    <button onClick={() => handleDelete(selectedIncident._id)} className="btn-danger text-sm p-xs flex items-center gap-xs" aria-label={t('common.delete')}>
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
        <form onSubmit={handleSubmit}>
          <div className="ff-group">
            <div className={`ff-wrap ${form.name ? 'ff-focused' : ''}`}>
              <input
                id="inc-name"
                type="text"
                value={form.name}
                onChange={updateForm('name')}
                required
                maxLength={100}
                className={`ff-input ${form.name ? 'ff-input-filled' : ''}`}
                placeholder={t('incidents.incidentName')}
              />
              <label htmlFor="inc-name" className={`ff-label ${form.name ? 'ff-label-float' : ''}`}>
                {t('incidents.incidentName')}
              </label>
            </div>
          </div>

          <div className="flex flex-gap-sm">
            <div className="ff-group flex-1">
              <ModernSelect
                label={t('incidents.disasterType') || 'Disaster type'}
                options={disasterTypeOptions}
                value={form.disasterType}
                onChange={(v) => setForm((prev) => ({ ...prev, disasterType: v }))}
              />
            </div>
            <div className="ff-group flex-1">
              <ModernSelect
                label={t('incidents.severity') || 'Severity'}
                options={severityOptions}
                value={form.severity}
                onChange={(v) => setForm((prev) => ({ ...prev, severity: v }))}
              />
            </div>
            <div className="ff-group flex-1">
              <ModernSelect
                label={t('incidents.status') || 'Status'}
                options={statusFormOptions}
                value={form.status}
                onChange={(v) => setForm((prev) => ({ ...prev, status: v }))}
              />
            </div>
          </div>

          <div className="flex flex-gap-sm">
            <div className="ff-group flex-1">
              <div className={`ff-wrap ${form.centerLat ? 'ff-focused' : ''}`}>
                <input
                  id="inc-centerlat"
                  type="number"
                  step="any"
                  value={form.centerLat}
                  onChange={updateForm('centerLat')}
                  required
                  className={`ff-input ${form.centerLat ? 'ff-input-filled' : ''}`}
                  placeholder={t('incidents.latitude') || 'Center Latitude'}
                />
                <label htmlFor="inc-centerlat" className={`ff-label ${form.centerLat ? 'ff-label-float' : ''}`}>
                  {t('incidents.latitude') || 'Center Latitude'}
                </label>
              </div>
            </div>
            <div className="ff-group flex-1">
              <div className={`ff-wrap ${form.centerLng ? 'ff-focused' : ''}`}>
                <input
                  id="inc-centerlng"
                  type="number"
                  step="any"
                  value={form.centerLng}
                  onChange={updateForm('centerLng')}
                  required
                  className={`ff-input ${form.centerLng ? 'ff-input-filled' : ''}`}
                  placeholder={t('incidents.longitude') || 'Center Longitude'}
                />
                <label htmlFor="inc-centerlng" className={`ff-label ${form.centerLng ? 'ff-label-float' : ''}`}>
                  {t('incidents.longitude') || 'Center Longitude'}
                </label>
              </div>
            </div>
            <div className="ff-group flex-1">
              <div className={`ff-wrap ${form.affectedPopulation ? 'ff-focused' : ''}`}>
                <input
                  id="inc-population"
                  type="number"
                  step="any"
                  value={form.affectedPopulation}
                  onChange={updateForm('affectedPopulation')}
                  className={`ff-input ${form.affectedPopulation ? 'ff-input-filled' : ''}`}
                  placeholder={t('incidents.affectedPopulation') || 'Affected population'}
                />
                <label htmlFor="inc-population" className={`ff-label ${form.affectedPopulation ? 'ff-label-float' : ''}`}>
                  {t('incidents.affectedPopulation') || 'Affected population'}
                </label>
              </div>
            </div>
          </div>

          <div className="ff-group">
            <div className={`ff-wrap ${form.description ? 'ff-focused' : ''}`}>
              <textarea
                id="inc-description"
                value={form.description}
                onChange={updateForm('description')}
                rows={3}
                maxLength={5000}
                className="ff-input ff-textarea"
                placeholder={t('incidents.descriptionPlaceholder') || 'Description'}
              />
              <label htmlFor="inc-description" className={`ff-label ff-label-with-icon ${form.description ? 'ff-label-float' : ''}`}>
                {t('incidents.descriptionPlaceholder') || 'Description'}
              </label>
            </div>
          </div>

          <div className="flex flex-gap-sm mt">
            <RippleBtn type="submit" className="">{editIncident ? t('incidents.update') : t('incidents.create')}</RippleBtn>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost btn-sm" aria-label={t('incidents.cancel')}>{t('incidents.cancel')}</button>
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
    </PageTransition>
  )
}
