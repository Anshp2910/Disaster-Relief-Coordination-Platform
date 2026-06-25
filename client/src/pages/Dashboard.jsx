import { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { SkeletonList, SkeletonMap } from '../components/Skeleton'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useDebounce } from '../hooks/useDebounce'
import { useConfirm } from '../hooks/useConfirm'
import { registerRefreshListener } from '../hooks/useSocket'
import { escapeHtml } from '../utils/escapeHtml'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import SteppedProgress from '../components/SteppedProgress'
import ActivityFeed from '../components/ActivityFeed'
import { useSocket } from '../hooks/useSocket'
import L from 'leaflet'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'

const STATUS_COLORS = {
  'Open': { bg: 'var(--accent-soft)', border: 'rgba(59,130,246,0.25)', text: 'var(--color-open)' },
  'Pending': { bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)', text: 'var(--color-pending)' },
  'In Progress': { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', text: 'var(--color-progress)' },
  'Resolved': { bg: 'var(--success-soft)', border: 'rgba(34,197,94,0.25)', text: 'var(--color-resolved)' },
  'Fulfilled': { bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)', text: 'var(--color-fulfilled)' },
}

const MAP_MARKER_COLORS = { 'Open': 'var(--color-open)', 'Pending': 'var(--color-pending)', 'In Progress': 'var(--color-progress)', 'Resolved': 'var(--color-resolved)', 'Fulfilled': 'var(--color-fulfilled)' }

const PRIORITY_COLORS = {
  'Critical': { bg: 'rgba(248,81,73,.1)', border: 'rgba(248,81,73,.25)', text: 'var(--color-critical)' },
  'High': { bg: 'rgba(218,157,66,.1)', border: 'rgba(218,157,66,.25)', text: 'var(--color-high)' },
  'Medium': { bg: 'rgba(234,179,8,.1)', border: 'rgba(234,179,8,.25)', text: 'var(--color-medium)' },
  'Low': { bg: 'rgba(34,197,94,.1)', border: 'rgba(34,197,94,.25)', text: 'var(--color-low)' },
}

const CATEGORY_COLORS = {
  'Medical': { bg: 'rgba(248,81,73,.1)', border: 'rgba(248,81,73,.25)', text: 'var(--cat-medical)' },
  'Food': { bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.25)', text: 'var(--cat-food)' },
  'Shelter': { bg: 'rgba(74,128,192,.1)', border: 'rgba(74,128,192,.25)', text: 'var(--cat-shelter)' },
  'Water': { bg: 'rgba(6,182,212,.1)', border: 'rgba(6,182,212,.25)', text: 'var(--cat-water)' },
  'Rescue': { bg: 'rgba(218,157,66,.1)', border: 'rgba(218,157,66,.25)', text: 'var(--cat-rescue)' },
  'Supplies': { bg: 'rgba(139,92,246,.1)', border: 'rgba(139,92,246,.25)', text: 'var(--cat-supplies)' },
  'Healthcare': { bg: 'rgba(236,72,153,.1)', border: 'rgba(236,72,153,.25)', text: 'var(--cat-healthcare)' },
  'Sanitation': { bg: 'rgba(20,184,166,.1)', border: 'rgba(20,184,166,.25)', text: 'var(--cat-sanitation)' },
  'Clothing': { bg: 'rgba(168,85,247,.1)', border: 'rgba(168,85,247,.25)', text: 'var(--cat-clothing)' },
  'Transportation': { bg: 'rgba(99,102,241,.1)', border: 'rgba(99,102,241,.25)', text: 'var(--cat-transportation)' },
  'Communication': { bg: 'rgba(14,165,233,.1)', border: 'rgba(14,165,233,.25)', text: 'var(--cat-communication)' },
  'Power': { bg: 'rgba(234,179,8,.1)', border: 'rgba(234,179,8,.25)', text: 'var(--cat-power)' },
  'Infrastructure': { bg: 'rgba(100,116,139,.1)', border: 'rgba(100,116,139,.25)', text: 'var(--cat-infrastructure)' },
  'Other': { bg: 'rgba(156,163,175,.1)', border: 'rgba(156,163,175,.25)', text: 'var(--cat-other)' },
}

const Badge = memo(function Badge({ label, colors, colorKey }) {
  const c = colors[colorKey || label] || { bg: 'rgba(128,128,128,.1)', border: 'rgba(128,128,128,.3)', text: 'var(--gov-muted)' }
  return (
    <span className="govt-badge" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {label}
    </span>
  )
})

export default function Dashboard() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterPriority, setFilterPriority] = useState('All')
  const [filterCategory, setFilterCategory] = useState('All')
  const [sortBy, setSortBy] = useState('-createdAt')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [resourceSummary, setResourceSummary] = useState([])
  const navigate = useNavigate()
  const { t } = useTranslation()
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])

  const [mapItems, setMapItems] = useState([])
  const [mapLoading, setMapLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, limit: 12, sort: sortBy }
      if (filterStatus !== 'All') params.status = filterStatus
      if (filterPriority !== 'All') params.priority = filterPriority
      if (filterCategory !== 'All') params.category = filterCategory
      if (debouncedSearch) params.search = debouncedSearch
      const data = await clientApi.getRequests(params)
      setItems(data.items || [])
      setTotalPages(data.pages || 1)
      setTotal(data.total || 0)
    } catch (e) {
      setError(e.message || t('dashboard.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus, filterPriority, filterCategory, sortBy, debouncedSearch])

  const loadMapItems = useCallback(async () => {
    setMapLoading(true)
    try {
      const params = { limit: 1000 }
      if (filterStatus !== 'All') params.status = filterStatus
      if (filterPriority !== 'All') params.priority = filterPriority
      if (filterCategory !== 'All') params.category = filterCategory
      if (debouncedSearch) params.search = debouncedSearch
      const data = await clientApi.getRequests(params)
      setMapItems(data.items || [])
    } catch (e) {
      setMapItems([])
    } finally {
      setMapLoading(false)
    }
  }, [filterStatus, filterPriority, filterCategory, debouncedSearch])

  const loadResources = useCallback(async () => {
    try {
      const data = await clientApi.getResources({ limit: 100 })
      setResourceSummary(data.summary || [])
    } catch {
      // silent fail
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
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize)
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
      const color = MAP_MARKER_COLORS[item.status] || 'var(--gov-muted)'
      const marker = L.circleMarker([item.lat, item.lng], { radius: 8, fillColor: color, color: 'var(--gov-white)', weight: 2, fillOpacity: 0.9 }).addTo(map)
      marker.bindPopup(`<div style="min-width:180px"><div style="font-weight:700;font-size:13px;margin-bottom:4px">${escapeHtml(item.title)}</div><div style="font-size:12px;color:var(--gov-muted);margin-bottom:4px">${escapeHtml(item.status)} | ${escapeHtml(item.priority)}</div><div style="font-size:12px;color:var(--gov-muted);margin-bottom:8px">${escapeHtml(item.locationName)}</div><a href="#/requests/${escapeHtml(item._id)}" style="display:inline-block;background:var(--gov-blue);color:#fff;text-decoration:none;padding:4px 10px;border-radius:4px;font-size:12px">${t('common.viewDetails')}</a></div>`)
      markersRef.current.push(marker)
    })
    if (filtered.length > 0) {
      const bounds = L.latLngBounds(filtered.filter((i) => i.lat != null && i.lng != null).map((i) => [i.lat, i.lng]))
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [mapItems, filterStatus])

  function handleSearch(e) {
    e.preventDefault()
    setPage(1)
  }

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
  ], [])

  const priorityOptions = useMemo(() => [
    { key: 'All', label: t('dashboard.filterAll') },
    { key: 'Critical', label: t('priorities.Critical') },
    { key: 'High', label: t('priorities.High') },
    { key: 'Medium', label: t('priorities.Medium') },
    { key: 'Low', label: t('priorities.Low') },
  ], [])

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
  ], [])

  const sortOptions = useMemo(() => [
    { key: '-createdAt', label: t('dashboard.sortNewest') },
    { key: 'createdAt', label: t('dashboard.sortOldest') },
    { key: '-priority', label: t('dashboard.sortPriorityDesc') },
    { key: 'priority', label: t('dashboard.sortPriorityAsc') },
    { key: 'title', label: t('dashboard.sortTitleAsc') },
    { key: '-title', label: t('dashboard.sortTitleDesc') },
  ], [])

  return (
    <div className="container">
      <div className="flex-between mb-lg">
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
      </div>

      {/* KPI Row */}
      <div className="bento-grid mb-lg">
        <div className="bento-card">
          <div className="bento-header">
            <span className="bento-title">{t('dashboard.allRequests') || 'Total'}</span>
            <div className="bento-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>📊</div>
          </div>
          <div className="bento-kpi-value">{total}</div>
          <div className="mt-sm" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{kpis.open} open · {kpis.inProgress} in progress</div>
        </div>
        <div className="bento-card">
          <div className="bento-header">
            <span className="bento-title">{t('statuses.Open')}</span>
            <div className="bento-icon" style={{ background: STATUS_COLORS.Open.bg, color: STATUS_COLORS.Open.text }}>🟦</div>
          </div>
          <div className="bento-kpi-value" style={{ color: 'var(--color-open)' }}>{kpis.open}</div>
        </div>
        <div className="bento-card">
          <div className="bento-header">
            <span className="bento-title">{t('statuses.In Progress')}</span>
            <div className="bento-icon" style={{ background: STATUS_COLORS['In Progress'].bg, color: STATUS_COLORS['In Progress'].text }}>🟧</div>
          </div>
          <div className="bento-kpi-value" style={{ color: 'var(--color-progress)' }}>{kpis.inProgress}</div>
        </div>
        <div className="bento-card">
          <div className="bento-header">
            <span className="bento-title">{t('statuses.Resolved')}</span>
            <div className="bento-icon" style={{ background: STATUS_COLORS.Resolved.bg, color: STATUS_COLORS.Resolved.text }}>🟩</div>
          </div>
          <div className="bento-kpi-value" style={{ color: 'var(--color-resolved)' }}>{kpis.resolved}</div>
        </div>
        <div className="bento-card">
          <div className="bento-header">
            <span className="bento-title">{t('priorities.Critical')}</span>
            <div className="bento-icon" style={{ background: PRIORITY_COLORS.Critical.bg, color: PRIORITY_COLORS.Critical.text }}>🔴</div>
          </div>
          <div className="bento-kpi-value" style={{ color: 'var(--color-critical)' }}>{kpis.critical}</div>
        </div>
        {resourceSummary.length > 0 && (
          <div className="bento-card">
            <div className="bento-header">
              <span className="bento-title">{t('dashboard.resourceInventory')}</span>
              <div className="bento-icon" style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--cat-supplies)' }}>📦</div>
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
          </div>
        )}
      </div>

      {/* Main bento: Map + Activity + SteppedProgress + List */}
      <div className="bento-grid">
        {/* Mini Map */}
        <div className="bento-card bento--wide">
          <div className="bento-header">
            <span className="bento-title">{t('dashboard.mapView')}</span>
            <button onClick={() => navigate('/map')} className="text-xs" style={{ color: 'var(--accent)' }}>{t('dashboard.viewAll')}</button>
          </div>
          <div className="relative" style={{ height: 240, borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
            {mapLoading && (
              <div className="flex-center inset-0 z-100 bg-elevated" style={{ position: 'absolute' }}>
                <div className="loading-spinner" />
              </div>
            )}
            <div ref={mapRef} className="w-full h-full" />
          </div>
          {!mapLoading && mapItems.length === 0 && (
            <div className="text-center text-sm muted mt-sm">{t('dashboard.noRequests')}</div>
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
        <div className="bento-card bento--tall" style={{ padding: 0 }}>
          <div className="bento-header" style={{ padding: 'var(--space-lg) var(--space-lg) 0' }}>
            <span className="bento-title">{t('dashboard.recentActivity') || 'Activity'}</span>
          </div>
          <ActivityFeed compact />
        </div>

        {/* Stepped Progress (current request) */}
        {firstItem && (
          <div className="bento-card bento--full">
            <div className="bento-header">
              <span className="bento-title">{t('dashboard.latestRequest') || 'Latest Request Status'}</span>
              <button onClick={() => navigate(`/requests/${firstItem._id}`)} className="text-xs" style={{ color: 'var(--accent)' }}>{t('common.viewDetails')}</button>
            </div>
            <h3 className="text-base mb-sm" style={{ fontWeight: 600, color: 'var(--text)' }}>{firstItem.title}</h3>
            <SteppedProgress currentStatus={firstItem.status} />
          </div>
        )}
      </div>

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
        <form onSubmit={handleSearch} className="flex flex-gap-sm">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('admin.searchRequests')} className="flex-1 input-pill" />
          <button type="submit" className="btnPrimary text-sm p-sm">{t('createRequest.search')}</button>
        </form>
        <nav aria-label="Filters"><div className="flex flex-gap-sm mt-md flex-wrap">
          {filterOptions.map((f) => (
            <button key={f.key} onClick={() => { setFilterStatus(f.key); setPage(1) }} className={`filter-pill ${filterStatus === f.key ? 'active' : ''}`} aria-label={f.label}>{f.label}</button>
          ))}
        </div>
        <div className="flex flex-gap-sm mt-sm flex-wrap">
          {priorityOptions.map((p) => (
            <button key={p.key} onClick={() => { setFilterPriority(p.key); setPage(1) }} className={`filter-pill ${filterPriority === p.key ? 'active' : ''} text-xs`} aria-label={p.label}>{p.label}</button>
          ))}
        </div>
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
              <div className="gridGap mt-lg">
                {items.length === 0 ? (
                  <div className="text-center p-lg">
                    <img src="/images/empty-requests.svg" alt="No requests" loading="lazy" width="200" height="150" className="h-auto block mt-0 mx-auto mb" />
                    <div className="muted">{t('dashboard.noRequests')}</div>
                  </div>
                ) : (
                  items.map((it) => (
                    <div key={it._id} className="listCard cursor-pointer" role="button" tabIndex={0} onClick={() => navigate(`/requests/${it._id}`)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/requests/${it._id}`) } }}>
                      <div className="flex-between flex-gap-sm">
                        <div className="flex-1 min-w-0">
                          <div className="text-bold text-accent-blue text-15">{it.title}</div>
                          <div className="flex flex-gap-sm mt-sm flex-wrap">
                            <Badge label={t(`statuses.${it.status || 'Open'}`)} colors={STATUS_COLORS} colorKey={it.status || 'Open'} />
                            <Badge label={t(`priorities.${it.priority || 'Medium'}`)} colors={PRIORITY_COLORS} colorKey={it.priority || 'Medium'} />
                            <span className="govt-badge govt-badge-blue">{t(`categories.${it.category || 'Other'}`)}</span>
                            {it.matchedResources?.length > 0 && (
                              <span className="govt-badge govt-badge-green" title={`${it.matchedResources.length} matched resources`}>
                                {it.matchedResources.length} Match{it.matchedResources.length > 1 ? 'es' : ''}
                              </span>
                            )}
                          </div>
                          <div className="muted mt-sm text-base">{it.description?.length > 120 ? it.description.slice(0, 120) + '...' : it.description}</div>
                          <div className="small mt-sm">{it.locationName}</div>
                          {it.createdBy && <div className="small mt-xs">{t('dashboard.postedBy')} {it.createdBy.displayName || it.createdBy.email || t('dashboard.unknown')}</div>}
                          {it.claimedBy && <div className="small mt-xs text-accent-orange">{t('dashboard.claimedBy')} {it.claimedBy.displayName || it.claimedBy.email}</div>}
                        </div>
                        <OwnerActions id={it._id} item={it} onChanged={load} />
                      </div>
                    </div>
                  ))
                )}
              </div>
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
    </div>
  )
}

const OwnerActions = memo(function OwnerActions({ id, item, onChanged }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const [deleting, setDeleting] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()
  const isOwner = user?.id && item.createdBy && item.createdBy._id ? item.createdBy._id === user.id : user?.id && String(item.createdBy) === String(user.id)
  const canEdit = isOwner || user?.role === 'admin'

  async function del(e) {
    e.stopPropagation()
    const ok = await confirm({ message: t('dashboard.deleteConfirm'), confirmText: t('dashboard.delete'), danger: true })
    if (!ok) return
    setDeleting(true)
    try { await clientApi.deleteRequest(id); onChanged() } catch (e) { toast.error(e.message || 'Failed to delete') } finally { setDeleting(false) }
  }

  function edit(e) { e.stopPropagation(); navigate(`/requests/${id}/edit`) }

  return (
    <div className="flex flex-col flex-gap-sm items-end">
      <button disabled={!canEdit} onClick={edit} className="btnPrimary text-sm p-xs" aria-label={t('dashboard.edit')}>{t('dashboard.edit')}</button>
      <button disabled={!canEdit || deleting} onClick={del} className="btnDanger text-sm p-xs" aria-label={deleting ? t('dashboard.deleting') : t('dashboard.delete')}>{deleting ? t('dashboard.deleting') : t('dashboard.delete')}</button>
      {ConfirmDialog}
    </div>
  )
})
