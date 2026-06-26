import { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { BarChart3, Activity, ShieldCheck, AlertTriangle, MapPin, Box, FilePlus, LayoutDashboard, ArrowUpRight } from 'lucide-react'
import { clientApi } from '../api/client'
import { SkeletonList, SkeletonMap } from '../components/Skeleton'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useConfirm } from '../hooks/useConfirm'
import { registerRefreshListener } from '../hooks/useSocket'
import { escapeHtml } from '../utils/escapeHtml'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import SteppedProgress from '../components/SteppedProgress'
import ActivityFeed from '../components/ActivityFeed'
import { useSocket } from '../hooks/useSocket'
import L from 'leaflet'
import EmptyState from '../components/EmptyState'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'
import { STATUS_COLORS, PRIORITY_COLORS, CATEGORY_COLORS, MAP_MARKER_COLORS } from '../utils/constants'
import Badge from '../components/Badge'

interface ResourceSummary {
  _id: string
  totalQty?: number
}

interface Item {
  _id: string
  title?: string
  status?: string
  priority?: string
  category?: string
  description?: string
  locationName?: string
  lat?: number
  lng?: number
  createdBy?: {
    _id?: string
    displayName?: string
    email?: string
  }
  claimedBy?: {
    _id?: string
    displayName?: string
    email?: string
  }
  matchedResources?: unknown[]
}

interface OwnerActionsProps {
  id: string
  item: Item
  onChanged: () => void
}

export default function Dashboard() {
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterPriority, setFilterPriority] = useState('All')
  const [filterCategory, setFilterCategory] = useState('All')
  const [sortBy, setSortBy] = useState('-createdAt')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [resourceSummary, setResourceSummary] = useState<ResourceSummary[]>([])
  const navigate = useNavigate()
  const { t } = useTranslation()
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.CircleMarker[]>([])

  const [mapItems, setMapItems] = useState<Item[]>([])
  const [mapLoading, setMapLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string | number | undefined> = { page, limit: 12, sort: sortBy }
      if (filterStatus !== 'All') params.status = filterStatus
      if (filterPriority !== 'All') params.priority = filterPriority
      if (filterCategory !== 'All') params.category = filterCategory
      const data = await clientApi.getRequests(params) as { items?: Item[]; pages?: number; total?: number }
      setItems(data.items || [])
      setTotalPages(data.pages || 1)
      setTotal(data.total || 0)
    } catch (e) {
      setError((e as Error).message || t('dashboard.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus, filterPriority, filterCategory, sortBy])

  const loadMapItems = useCallback(async () => {
    setMapLoading(true)
    try {
      const params: Record<string, string | number | undefined> = { limit: 1000 }
      if (filterStatus !== 'All') params.status = filterStatus
      if (filterPriority !== 'All') params.priority = filterPriority
      if (filterCategory !== 'All') params.category = filterCategory
      const data = await clientApi.getRequests(params) as { items?: Item[] }
      setMapItems(data.items || [])
    } catch {
      setMapItems([])
    } finally {
      setMapLoading(false)
    }
  }, [filterStatus, filterPriority, filterCategory])

  const loadResources = useCallback(async () => {
    try {
      const data = await clientApi.getResources({ limit: '100' }) as { summary?: ResourceSummary[] }
      setResourceSummary(data.summary || [])
    } catch (e) {
      console.warn('Failed to load resource summary:', (e as Error).message)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadMapItems() }, [loadMapItems])

  useAutoRefresh(load, { interval: 20000 })

  useEffect(() => {
    return registerRefreshListener(['request:created', 'request:updated', 'request:deleted', 'request:commented', 'resource:allocated'], () => { load(); loadMapItems() })
  }, [load, loadMapItems])

  useEffect(() => { loadResources() }, [loadResources])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return
    const map = initLeafletMap(mapRef.current)
    mapInstanceRef.current = map
    const onResize = () => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize() }
    window.addEventListener('resize', onResize)
    if (window.visualViewport) (window.visualViewport as EventTarget).addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (window.visualViewport) (window.visualViewport as EventTarget).removeEventListener('resize', onResize)
      cleanupLeafletMap(map); mapInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return
    markersRef.current.forEach((m) => map.removeLayer(m))
    markersRef.current = []
    const filtered = filterStatus === 'All' ? mapItems : mapItems.filter((i) => i.status === filterStatus)
    filtered.forEach((item) => {
      if (item.lat == null || item.lng == null) return
      const color = MAP_MARKER_COLORS[item.status || 'Open'] || 'var(--gov-muted)'
      const marker = L.circleMarker([item.lat, item.lng], { radius: 8, fillColor: color, color: 'var(--gov-white)', weight: 2, fillOpacity: 0.9 }).addTo(map)
      marker.bindPopup(`<div style="min-width:180px"><div style="font-weight:700;font-size:13px;margin-bottom:4px">${escapeHtml(item.title || '')}</div><div style="font-size:12px;color:var(--gov-muted);margin-bottom:4px">${escapeHtml(item.status || '')} | ${escapeHtml(item.priority || '')}</div><div style="font-size:12px;color:var(--gov-muted);margin-bottom:8px">${escapeHtml(item.locationName || '')}</div><a href="#/requests/${escapeHtml(item._id)}" style="display:inline-block;background:var(--gov-blue);color:#fff;text-decoration:none;padding:4px 10px;border-radius:4px;font-size:12px">${t('common.viewDetails')}</a></div>`)
      markersRef.current.push(marker)
    })
    if (filtered.length > 0) {
      const bounds = L.latLngBounds(filtered.filter((i) => i.lat != null && i.lng != null).map((i) => [i.lat, i.lng] as [number, number]))
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [mapItems, filterStatus])

  const { user: currentUser } = useAuth()
  const { connected } = useSocket()

  const kpis = useMemo(() => {
    const open = items.filter((i) => i.status === 'Open').length
    const inProgress = items.filter((i) => i.status === 'In Progress').length
    const resolved = items.filter((i) => i.status === 'Resolved' || i.status === 'Fulfilled').length
    const critical = items.filter((i) => i.priority === 'Critical').length
    return { total: items.length, open, inProgress, resolved, critical }
  }, [items])

  const firstItem = items[0]

  const filterOptions = useMemo(() => [
    { key: 'All', label: t('dashboard.filterAll') },
    { key: 'Open', label: t('statuses.Open') },
    { key: 'Pending', label: t('statuses.Pending') },
    { key: 'In Progress', label: t('statuses.In Progress') },
    { key: 'Resolved', label: t('statuses.Resolved') },
    { key: 'Fulfilled', label: t('statuses.Fulfilled') },
  ], [t])

  const priorityOptions = useMemo(() => [
    { key: 'All', label: t('dashboard.filterAll') },
    { key: 'Critical', label: t('priorities.Critical') },
    { key: 'High', label: t('priorities.High') },
    { key: 'Medium', label: t('priorities.Medium') },
    { key: 'Low', label: t('priorities.Low') },
  ], [t])

  const categoryOptions = useMemo(() => [
    { key: 'All', label: t('dashboard.filterAll') },
    { key: 'Medical', label: t('categories.Medical') },
    { key: 'Food', label: t('categories.Food') },
    { key: 'Shelter', label: t('categories.Shelter') },
    { key: 'Water', label: t('categories.Water') },
    { key: 'Rescue', label: t('categories.Rescue') },
    { key: 'Supplies', label: t('categories.Supplies') },
    { key: 'Healthcare', label: t('categories.Healthcare') },
    { key: 'Sanitation', label: t('categories.Sanitation') },
    { key: 'Clothing', label: t('categories.Clothing') },
    { key: 'Transportation', label: t('categories.Transportation') },
    { key: 'Communication', label: t('categories.Communication') },
    { key: 'Power', label: t('categories.Power') },
    { key: 'Infrastructure', label: t('categories.Infrastructure') },
    { key: 'Other', label: t('categories.Other') },
  ], [t])

  const sortOptions = useMemo(() => [
    { key: '-createdAt', label: t('dashboard.sortNewest') },
    { key: 'createdAt', label: t('dashboard.sortOldest') },
    { key: '-priority', label: t('dashboard.sortPriorityDesc') },
    { key: 'priority', label: t('dashboard.sortPriorityAsc') },
    { key: 'title', label: t('dashboard.sortTitleAsc') },
    { key: '-title', label: t('dashboard.sortTitleDesc') },
  ], [t])

  const stagger = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } }
  }
  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } }
  }

  return (
    <motion.div className="container" variants={stagger} initial="hidden" animate="show">
      <motion.div className="flex-between mb-lg" variants={fadeUp}>
        <div>
          <h1 className="pageTitle text-2xl">{t('dashboard.title')}</h1>
          <div className="small mt-xs flex items-center gap-sm">
            <span>{total} {t('dashboard.totalRequests')}</span>
            <span className={`live-dot ${connected ? '' : 'live-dot--disconnected'}`}>{connected ? t('dashboard.live') : t('dashboard.offline')}</span>
          </div>
        </div>
        <div className="btnRow">
          {currentUser?.role === 'admin' && (
            <button onClick={() => navigate('/admin')} className="text-accent-blue border-gov" style={{ borderColor: 'var(--gov-blue)' }}>{t('dashboard.admin')}</button>
          )}
          <button className="btnPrimary" onClick={() => navigate('/requests/new')}>{t('dashboard.newRequest')}</button>
        </div>
      </motion.div>

      {/* KPI Row */}
      <motion.div className="bento-grid mb-lg" variants={fadeUp}>
        <motion.div className="bento-card" variants={fadeUp}>
          <div className="bento-header">
            <span className="bento-title">{t('dashboard.allRequests') || 'Total'}</span>
            <div className="bento-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><BarChart3 size={18} /></div>
          </div>
          <div className="bento-kpi-value">{total}</div>
          <div className="mt-sm" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{kpis.open} open · {kpis.inProgress} in progress</div>
        </motion.div>
        <motion.div className="bento-card" variants={fadeUp}>
          <div className="bento-header">
            <span className="bento-title">{t('statuses.Open')}</span>
            <div className="bento-icon" style={{ background: STATUS_COLORS.Open.bg, color: STATUS_COLORS.Open.text }}><Activity size={18} /></div>
          </div>
          <div className="bento-kpi-value" style={{ color: 'var(--color-open)' }}>{kpis.open}</div>
        </motion.div>
        <motion.div className="bento-card" variants={fadeUp}>
          <div className="bento-header">
            <span className="bento-title">{t('statuses.In Progress')}</span>
            <div className="bento-icon" style={{ background: STATUS_COLORS['In Progress'].bg, color: STATUS_COLORS['In Progress'].text }}><ArrowUpRight size={18} /></div>
          </div>
          <div className="bento-kpi-value" style={{ color: 'var(--color-progress)' }}>{kpis.inProgress}</div>
        </motion.div>
        <motion.div className="bento-card" variants={fadeUp}>
          <div className="bento-header">
            <span className="bento-title">{t('statuses.Resolved')}</span>
            <div className="bento-icon" style={{ background: STATUS_COLORS.Resolved.bg, color: STATUS_COLORS.Resolved.text }}><ShieldCheck size={18} /></div>
          </div>
          <div className="bento-kpi-value" style={{ color: 'var(--color-resolved)' }}>{kpis.resolved}</div>
        </motion.div>
        <motion.div className="bento-card" variants={fadeUp}>
          <div className="bento-header">
            <span className="bento-title">{t('priorities.Critical')}</span>
            <div className="bento-icon" style={{ background: PRIORITY_COLORS.Critical.bg, color: PRIORITY_COLORS.Critical.text }}><AlertTriangle size={18} /></div>
          </div>
          <div className="bento-kpi-value" style={{ color: 'var(--color-critical)' }}>{kpis.critical}</div>
        </motion.div>
        {resourceSummary.length > 0 && (
          <motion.div className="bento-card" variants={fadeUp}>
            <div className="bento-header">
              <span className="bento-title">{t('dashboard.resourceInventory')}</span>
              <div className="bento-icon" style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--cat-supplies)' }}><Box size={18} /></div>
            </div>
            <div className="bento-kpi-list">
              {resourceSummary.slice(0, 5).map((s) => (
                <div key={s._id} className="bento-kpi">
                  <span className="bento-kpi-label">{s._id}</span>
                  <span className="bento-kpi-value" style={{ fontSize: 'var(--text-base)' }}>{s.totalQty} <span className="text-xs" style={{ color: 'var(--text-muted)', fontWeight: 400 }}>units</span></span>
                </div>
              ))}
            </div>
            {resourceSummary.length > 5 && (
              <button onClick={() => navigate('/resources')} className="text-xs mt-sm" style={{ color: 'var(--accent)' }}>{t('dashboard.viewAll')}</button>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Quick Navigation */}
      <motion.div className="bento-grid mb-lg" variants={fadeUp}>
        <div className="bento-card bento--full">
          <div className="bento-header">
            <span className="bento-title">{t('dashboard.quickNav') || 'Quick Navigation'}</span>
          </div>
          <div className="flex flex-wrap flex-gap-sm mt-sm" style={{ gap: 'var(--space-sm)' }}>
            {[
              { path: '/map', label: t('nav.map') || 'Map', icon: <MapPin size={18} />, color: 'var(--accent-soft)' },
              { path: '/resources', label: t('nav.resources') || 'Resources', icon: <Box size={18} />, color: 'rgba(139,92,246,0.1)' },
              { path: '/incidents', label: t('nav.incidents') || 'Incidents', icon: <AlertTriangle size={18} />, color: 'rgba(248,81,73,0.1)' },
              { path: '/zones', label: t('nav.zones') || 'Zones', icon: <MapPin size={18} />, color: 'rgba(245,158,11,0.1)' },
              { path: '/schedules', label: t('nav.schedules') || 'Schedules', icon: <BarChart3 size={18} />, color: 'rgba(74,128,192,0.1)' },
              { path: '/geofencing', label: t('nav.geofencing') || 'Geofencing', icon: <MapPin size={18} />, color: 'rgba(6,182,212,0.1)' },
              ...(currentUser?.role === 'admin' ? [
                { path: '/bulk', label: t('nav.bulkImport') || 'Bulk Import', icon: <FilePlus size={18} />, color: 'rgba(234,179,8,0.1)' },
                { path: '/escalation', label: t('nav.escalation') || 'Escalation', icon: <AlertTriangle size={18} />, color: 'rgba(248,81,73,0.1)' },
              ] : []),
              { path: '/requests/new', label: t('dashboard.newRequest'), icon: <FilePlus size={18} />, color: 'rgba(34,197,94,0.1)' },
            ].map(({ path, label, icon, color }) => (
              <motion.button
                key={path}
                onClick={() => navigate(path)}
                className="nav-chip"
                style={{ background: color }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
              >
                <span style={{ display: 'flex', alignItems: 'center', lineHeight: 1 }}>{icon}</span>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text)' }}>{label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Main bento: Map + Activity + SteppedProgress + List */}
      <motion.div className="bento-grid" variants={fadeUp}>
        {/* Mini Map */}
        <div className="bento-card bento--wide">
          <div className="bento-header">
            <span className="bento-title">{t('dashboard.mapView')}</span>
            <button onClick={() => navigate('/map')} className="text-xs" style={{ color: 'var(--accent)' }}>{t('dashboard.viewAll')}</button>
          </div>
          <div className="relative dashboard-map">
            {mapLoading && (
              <div className="flex-center inset-0 z-100 bg-elevated" style={{ position: 'absolute' }}>
                <div className="loading-spinner" />
              </div>
            )}
            <div ref={mapRef} className="w-full h-full" />
          </div>
          {!mapLoading && mapItems.length === 0 && (
            <EmptyState icon='🗺️' title={t('dashboard.noRequests')} />
          )}
          <div className="flex flex-gap-sm mt-sm flex-wrap">
            {Object.entries(MAP_MARKER_COLORS).map(([status, color]) => (
              <div key={status} className="gap-row-xs text-xs">
                <div className="icon-12" style={{ background: color }} />
                <span>{t(`statuses.${status}`)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <motion.div className="bento-card bento--tall" style={{ padding: 0 }} variants={fadeUp}>
          <div className="bento-header" style={{ padding: 'var(--space-lg) var(--space-lg) 0' }}>
            <span className="bento-title">{t('dashboard.recentActivity') || 'Activity'}</span>
          </div>
            <ActivityFeed compact />
          </motion.div>
 
        {/* Stepped Progress (current request) */}
        {firstItem && (
          <motion.div className="bento-card bento--full" variants={fadeUp}>
            <div className="bento-header">
              <span className="bento-title">{t('dashboard.latestRequest') || 'Latest Request Status'}</span>
              <button onClick={() => navigate(`/requests/${firstItem._id}`)} className="text-xs" style={{ color: 'var(--accent)' }}>{t('common.viewDetails')}</button>
            </div>
            <h3 className="text-base mb-sm" style={{ fontWeight: 600, color: 'var(--text)' }}>{firstItem.title}</h3>
            <SteppedProgress currentStatus={firstItem.status || 'Open'} />
          </motion.div>
        )}
      </motion.div>

      {/* Filters & List */}
      <div className="card mt-lg">
        <div className="flex-between mb-md">
          <h2 className="text-lg text-bold m-0">{t('dashboard.allRequests')}</h2>
          <div className="flex flex-gap-sm">
            <button
              onClick={() => { loadMapItems() }}
              className="text-sm p-xs border-gov rounded-sm"
              style={{ color: 'var(--gov-blue)', borderColor: 'var(--gov-border)' }}
            >
              {t('dashboard.refresh') || 'Refresh'}
            </button>
          </div>
        </div>
        {error ? <div className="errorText">{error}</div> : null}
        <nav aria-label="Filters"><motion.div className="flex flex-gap-sm mt-md flex-wrap" variants={fadeUp}>
          {filterOptions.map((f) => (
            <motion.button key={f.key} onClick={() => { setFilterStatus(f.key); setPage(1) }} className={`filter-pill ${filterStatus === f.key ? 'active' : ''}`} aria-label={f.label} whileTap={{ scale: 0.95 }}>{f.label}</motion.button>
          ))}
        </motion.div>
        <motion.div className="flex flex-gap-sm mt-sm flex-wrap" variants={fadeUp}>
          {priorityOptions.map((p) => (
            <motion.button key={p.key} onClick={() => { setFilterPriority(p.key); setPage(1) }} className={`filter-pill ${filterPriority === p.key ? 'active' : ''} text-xs`} aria-label={p.label} whileTap={{ scale: 0.95 }}>{p.label}</motion.button>
          ))}
        </motion.div>
          <div className="flex flex-wrap flex-gap-sm mt-sm items-center">
          <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1) }} className="rounded-sm text-sm border-gov p-xs">
            {categoryOptions.map((c) => (
              <option key={c.key} value={c.key}>{c.key === 'All' ? t('dashboard.allCategories') : c.label}</option>
            ))}
          </select>
          <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1) }} className="rounded-sm text-sm border-gov p-xs">
            {sortOptions.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div></nav>
        <section aria-label={t('dashboard.title')} role="region" aria-live="polite">
          {loading ? (
            <SkeletonList count={4} lines={3} />
          ) : (
            <>
              <motion.div className="gridGap mt-lg" variants={fadeUp}>
                {items.length === 0 ? (
                  <EmptyState icon='📋' title={t('dashboard.noRequests')} description={t('dashboard.noRequestsDesc') || 'No requests match your filters'} />
                ) : (
                  items.map((it) => (
                    <motion.div key={it._id} className="listCard cursor-pointer" role="button" tabIndex={0} onClick={() => navigate(`/requests/${it._id}`)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/requests/${it._id}`) } }} whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
                      <div className="flex-between flex-gap-sm">
                        <div className="flex-1 min-w-0">
                          <div className="text-bold text-accent-blue text-15">{it.title}</div>
                          <div className="flex flex-gap-sm mt-sm flex-wrap">
                            <Badge label={t(`statuses.${it.status || 'Open'}`)} colors={STATUS_COLORS} colorKey={it.status || 'Open'} />
                            <Badge label={t(`priorities.${it.priority || 'Medium'}`)} colors={PRIORITY_COLORS} colorKey={it.priority || 'Medium'} />
                            <span className="govt-badge govt-badge-blue">{t(`categories.${it.category || 'Other'}`)}</span>
                            {it.matchedResources && it.matchedResources.length > 0 && (
                              <span className="govt-badge govt-badge-green" title={`${it.matchedResources.length} matched resources`}>
                                {it.matchedResources.length} Match{it.matchedResources.length > 1 ? 'es' : ''}
                              </span>
                            )}
                          </div>
                          <div className="muted mt-sm text-base">{it.description && it.description.length > 120 ? it.description.slice(0, 120) + '...' : it.description}</div>
                          <div className="small mt-sm">{it.locationName}</div>
                          {it.createdBy && <div className="small mt-xs">{t('dashboard.postedBy')} {it.createdBy.displayName || it.createdBy.email || t('dashboard.unknown')}</div>}
                          {it.claimedBy && <div className="small mt-xs text-accent-orange">{t('dashboard.claimedBy')} {it.claimedBy.displayName || it.claimedBy.email}</div>}
                        </div>
                        <OwnerActions id={it._id} item={it} onChanged={load} />
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
              {totalPages > 1 && (
                <div className="flex flex-center flex-gap-sm mt-lg">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="text-sm p-xs" aria-label={t('dashboard.previous')}>{t('dashboard.previous')}</button>
                  <span className="text-sm p-xs">{page} / {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="text-sm p-xs" aria-label={t('dashboard.next')}>{t('dashboard.next')}</button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </motion.div>
  )
}

const OwnerActions = memo(function OwnerActions({ id, item, onChanged }: OwnerActionsProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const [deleting, setDeleting] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()
  const isOwner = user?.id && item.createdBy && item.createdBy._id ? item.createdBy._id === user.id : user?.id && String(item.createdBy) === String(user.id)
  const canEdit = isOwner || user?.role === 'admin'

  async function del(e: React.MouseEvent) {
    e.stopPropagation()
    const ok = await confirm({ message: t('dashboard.deleteConfirm'), confirmText: t('dashboard.delete'), danger: true })
    if (!ok) return
    setDeleting(true)
    try { await clientApi.deleteRequest(id); onChanged() } catch (e) { toast.error((e as Error).message || 'Failed to delete') } finally { setDeleting(false) }
  }

  function edit(e: React.MouseEvent) { e.stopPropagation(); navigate(`/requests/${id}/edit`) }

  return (
    <div className="flex flex-col flex-gap-sm items-end">
      <button disabled={!canEdit} onClick={edit} className="btnPrimary text-sm p-xs" aria-label={t('dashboard.edit')}>{t('dashboard.edit')}</button>
      <button disabled={!canEdit || deleting} onClick={del} className="btnDanger text-sm p-xs" aria-label={deleting ? t('dashboard.deleting') : t('dashboard.delete')}>{deleting ? t('dashboard.deleting') : t('dashboard.delete')}</button>
      {ConfirmDialog}
    </div>
  )
})
