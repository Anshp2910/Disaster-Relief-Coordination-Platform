import { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { SkeletonList, SkeletonMap } from '../components/Skeleton'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useDebounce } from '../hooks/useDebounce'
import { registerRefreshListener } from '../hooks/useSocket'
import { escapeHtml } from '../utils/escapeHtml'
import { useToast } from '../components/Toast'
import L from 'leaflet'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'

const STATUS_COLORS = {
  'Open': { bg: 'rgba(91,154,255,.1)', border: 'rgba(91,154,255,.25)', text: 'var(--color-open)' },
  'Pending': { bg: 'rgba(167,139,250,.1)', border: 'rgba(167,139,250,.25)', text: 'var(--color-pending)' },
  'In Progress': { bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.25)', text: 'var(--color-progress)' },
  'Resolved': { bg: 'rgba(63,185,80,.1)', border: 'rgba(63,185,80,.25)', text: 'var(--color-resolved)' },
  'Fulfilled': { bg: 'rgba(52,211,153,.1)', border: 'rgba(52,211,153,.25)', text: 'var(--color-fulfilled)' },
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
  'Shelter': { bg: 'rgba(91,154,255,.1)', border: 'rgba(91,154,255,.25)', text: 'var(--cat-shelter)' },
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
  const [viewMode, setViewMode] = useState('list')
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
  }, [page, filterStatus, filterPriority, filterCategory, sortBy, debouncedSearch, t])

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

  useEffect(() => { load() }, [page, filterStatus, filterPriority, filterCategory, sortBy, debouncedSearch])
  useEffect(() => { if (viewMode === 'map') loadMapItems() }, [viewMode, filterStatus, filterPriority, filterCategory, debouncedSearch])

  useAutoRefresh(load, { interval: 20000 })

  useEffect(() => {
    return registerRefreshListener(['request:created', 'request:updated', 'request:deleted', 'request:commented', 'resource:allocated'], load)
  }, [load])

  useEffect(() => {
    clientApi.getResources({ limit: 100 }).then((data) => {
      setResourceSummary(data.summary || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (viewMode !== 'map') return
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
  }, [viewMode])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || viewMode !== 'map') return
    markersRef.current.forEach((m) => map.removeLayer(m))
    markersRef.current = []
    const filtered = filterStatus === 'All' ? mapItems : mapItems.filter((i) => i.status === filterStatus)
    filtered.forEach((item) => {
      if (item.lat == null || item.lng == null) return
      const color = MAP_MARKER_COLORS[item.status] || 'var(--gov-muted)'
      const marker = L.circleMarker([item.lat, item.lng], { radius: 8, fillColor: color, color: 'var(--gov-white)', weight: 2, fillOpacity: 0.9 }).addTo(map)
      marker.bindPopup(`<div style="min-width:180px"><div style="font-weight:700;font-size:13px;margin-bottom:4px">${escapeHtml(item.title)}</div><div style="font-size:12px;color:var(--gov-muted);margin-bottom:4px">${escapeHtml(item.status)} | ${escapeHtml(item.priority)}</div><div style="font-size:12px;color:var(--gov-muted);margin-bottom:8px">${escapeHtml(item.locationName)}</div><a href="#/requests/${escapeHtml(item._id)}" style="display:inline-block;background:var(--gov-blue);color:#fff;text-decoration:none;padding:4px 10px;border-radius:4px;font-size:12px">View Details</a></div>`)
      markersRef.current.push(marker)
    })
    if (filtered.length > 0) {
      const bounds = L.latLngBounds(filtered.filter((i) => i.lat != null && i.lng != null).map((i) => [i.lat, i.lng]))
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [mapItems, filterStatus, viewMode])

  function handleSearch(e) {
    e.preventDefault()
    setPage(1)
  }

  const currentUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
  }, [])

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

  return (
    <div className="container">
      <div style={{ marginBottom: 20, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(91,154,255,0.1)', position: 'relative' }}>
        <img src="/images/hero-banner.svg" alt="Disaster Relief Coordination" loading="eager" fetchpriority="high" width="1200" height="300" style={{ width: '100%', height: 'auto', display: 'block', aspectRatio: '4/1' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(91,154,255,0.05), rgba(124,141,240,0.05))', pointerEvents: 'none' }} />
      </div>
      {resourceSummary.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--accent-blue)' }}>{t('dashboard.resourceInventory')}</h3>
            <button onClick={() => navigate('/resources')} style={{ fontSize: 12, padding: '5px 12px' }}>{t('dashboard.viewAll')}</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {resourceSummary.map((s) => (
              <div key={s._id} style={{ padding: '8px 14px', borderRadius: 10, fontSize: 12, background: 'rgba(91,154,255,0.06)', border: '1px solid rgba(91,154,255,0.12)', backdropFilter: 'blur(4px)' }}>
                <strong style={{ color: 'var(--accent-blue)' }}>{s._id}</strong>: {s.totalQty} units {s.lowCount > 0 && <span style={{ color: 'var(--accent-orange)' }}>({s.lowCount} low)</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="card">
        <div className="headerRow">
          <div>
            <h1 className="pageTitle" style={{ fontSize: 20 }}>{t('dashboard.title')}</h1>
            <div className="small" style={{ marginTop: 4 }}>{total} {t('dashboard.totalRequests')}</div>
          </div>
          <div className="btnRow">
            {currentUser?.role === 'admin' && (
              <button onClick={() => navigate('/admin')} style={{ color: 'var(--gov-blue)', borderColor: 'var(--gov-blue)' }}>{t('dashboard.admin')}</button>
            )}
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
              style={{ color: 'var(--gov-blue)', borderColor: viewMode === 'map' ? 'var(--gov-blue)' : 'var(--gov-border)', background: viewMode === 'map' ? 'rgba(0,0,128,0.08)' : undefined, fontWeight: viewMode === 'map' ? 600 : 400 }}
            >
              {viewMode === 'list' ? t('dashboard.mapView') : t('dashboard.listView')}
            </button>
            <button className="btnPrimary" onClick={() => navigate('/requests/new')}>{t('dashboard.newRequest')}</button>
          </div>
        </div>
        {error ? <div className="errorText">{error}</div> : null}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('admin.searchRequests')} style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--gov-border)', borderRadius: 6, fontSize: 13 }} />
          <button type="submit" className="btnPrimary" style={{ fontSize: 12, padding: '6px 16px' }}>{t('createRequest.search')}</button>
        </form>
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {filterOptions.map((f) => (
            <button key={f.key} onClick={() => { setFilterStatus(f.key); setPage(1) }} className={`filter-pill ${filterStatus === f.key ? 'active' : ''}`}>{f.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {priorityOptions.map((p) => (
            <button key={p.key} onClick={() => { setFilterPriority(p.key); setPage(1) }} className={`filter-pill ${filterPriority === p.key ? 'active' : ''}`} style={{ fontSize: 11 }}>{p.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1) }} style={{ padding: '6px 10px', border: '1px solid var(--gov-border)', borderRadius: 6, fontSize: 12 }}>
            {categoryOptions.map((c) => (
              <option key={c.key} value={c.key}>{c.key === 'All' ? t('dashboard.allCategories') : c.label}</option>
            ))}
          </select>
          <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1) }} style={{ padding: '6px 10px', border: '1px solid var(--gov-border)', borderRadius: 6, fontSize: 12 }}>
            {sortOptions.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </div>
        {viewMode === 'list' ? (
          <>
            {loading ? (
              <SkeletonList count={4} lines={3} />
            ) : (
              <div className="gridGap" style={{ marginTop: 16 }}>
                {items.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    <img src="/images/empty-requests.svg" alt="No requests" loading="lazy" width="200" height="150" style={{ width: 200, height: 'auto', margin: '0 auto 12px', display: 'block' }} />
                    <div className="muted">{t('dashboard.noRequests')}</div>
                  </div>
                ) : (
                  items.map((it) => (
                    <div key={it._id} className="listCard" style={{ cursor: 'pointer' }} onClick={() => navigate(`/requests/${it._id}`)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--accent-blue)' }}>{it.title}</div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                            <Badge label={t(`statuses.${it.status || 'Open'}`)} colors={STATUS_COLORS} colorKey={it.status || 'Open'} />
                            <Badge label={t(`priorities.${it.priority || 'Medium'}`)} colors={PRIORITY_COLORS} colorKey={it.priority || 'Medium'} />
                            <span className="govt-badge govt-badge-blue">{t(`categories.${it.category || 'Other'}`)}</span>
                          </div>
                          <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>{it.description?.length > 120 ? it.description.slice(0, 120) + '...' : it.description}</div>
                          <div className="small" style={{ marginTop: 8 }}>{it.locationName}</div>
                          {it.createdBy && <div className="small" style={{ marginTop: 4 }}>{t('dashboard.postedBy')} {it.createdBy.displayName || it.createdBy.email || t('dashboard.unknown')}</div>}
                          {it.claimedBy && <div className="small" style={{ marginTop: 2, color: 'var(--accent-orange)' }}>{t('dashboard.claimedBy')} {it.claimedBy.displayName || it.claimedBy.email}</div>}
                        </div>
                        <OwnerActions id={it._id} item={it} onChanged={load} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ fontSize: 12, padding: '6px 14px' }}>{t('dashboard.previous')}</button>
                <span style={{ fontSize: 13, padding: '6px 12px' }}>{page} / {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ fontSize: 12, padding: '6px 14px' }}>{t('dashboard.next')}</button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="card" style={{ padding: 0, position: 'relative', marginTop: 16 }}>
              {mapLoading && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.8)', zIndex: 1000 }}>
                  <div style={{ width: 24, height: 24, border: '3px solid var(--gov-border)', borderTopColor: 'var(--gov-blue)', borderRadius: '50%', animation: 'admin-spin 0.7s linear infinite' }} />
                </div>
              )}
              <div ref={mapRef} className="map-container-full" style={{ height: '70vh', width: '100%', maxWidth: '100%' }} />
              {!mapLoading && !error && mapItems.length === 0 && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.95)', zIndex: 1000 }}>
                  <img src="/images/empty-map.svg" alt="No locations" loading="lazy" width="260" height="180" style={{ width: 260, height: 'auto', marginBottom: 16 }} />
                  <div className="muted">{t('dashboard.noRequests')}</div>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              {Object.entries(MAP_MARKER_COLORS).map(([status, color]) => (
                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
                  <span>{t(`statuses.${status}`)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const OwnerActions = memo(function OwnerActions({ id, item, onChanged }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const toast = useToast()
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null } })()
  const [deleting, setDeleting] = useState(false)
  const isOwner = user?.id && item.createdBy && item.createdBy._id ? item.createdBy._id === user.id : user?.id && String(item.createdBy) === String(user.id)
  const canEdit = isOwner || user?.role === 'admin'

  async function del(e) {
    e.stopPropagation()
    if (!confirm(t('dashboard.deleteConfirm'))) return
    setDeleting(true)
    try { await clientApi.deleteRequest(id); onChanged() } catch (e) { toast.error(e.message || 'Failed to delete') } finally { setDeleting(false) }
  }

  function edit(e) { e.stopPropagation(); navigate(`/requests/${id}/edit`) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
      <button disabled={!canEdit} onClick={edit} className="btnPrimary" style={{ opacity: !canEdit ? 0.5 : 1, fontSize: 12, padding: '6px 12px' }}>{t('dashboard.edit')}</button>
      <button disabled={!canEdit || deleting} onClick={del} className="btnDanger" style={{ opacity: !canEdit ? 0.5 : 1, fontSize: 12, padding: '6px 12px' }}>{deleting ? t('dashboard.deleting') : t('dashboard.delete')}</button>
    </div>
  )
})
