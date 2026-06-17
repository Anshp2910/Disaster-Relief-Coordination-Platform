import { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { SkeletonList, SkeletonMap } from '../components/Skeleton'
import L from 'leaflet'

const STATUS_COLORS = {
  'Open': { bg: 'rgba(0,0,128,.1)', border: 'rgba(0,0,128,.3)', text: '#000080' },
  'Pending': { bg: 'rgba(128,128,128,.1)', border: 'rgba(128,128,128,.3)', text: '#666' },
  'In Progress': { bg: 'rgba(255,153,51,.12)', border: 'rgba(255,153,51,.35)', text: '#cc7a00' },
  'Resolved': { bg: 'rgba(19,136,8,.1)', border: 'rgba(19,136,8,.3)', text: '#138808' },
  'Fulfilled': { bg: 'rgba(19,136,8,.15)', border: 'rgba(19,136,8,.4)', text: '#0d6e06' },
}

const MAP_MARKER_COLORS = { 'Open': '#000080', 'Pending': '#666', 'In Progress': '#cc7a00', 'Resolved': '#138808', 'Fulfilled': '#0d6e06' }

const PRIORITY_COLORS = {
  'Critical': { bg: 'rgba(204,0,0,.1)', border: 'rgba(204,0,0,.3)', text: '#cc0000' },
  'High': { bg: 'rgba(204,102,0,.1)', border: 'rgba(204,102,0,.3)', text: '#cc6600' },
  'Medium': { bg: 'rgba(255,153,51,.12)', border: 'rgba(255,153,51,.35)', text: '#cc7a00' },
  'Low': { bg: 'rgba(19,136,8,.1)', border: 'rgba(19,136,8,.3)', text: '#138808' },
}

const Badge = memo(function Badge({ label, colors, colorKey }) {
  const c = colors[colorKey || label] || { bg: 'rgba(128,128,128,.1)', border: 'rgba(128,128,128,.3)', text: '#666' }
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
  const [search, setSearch] = useState('')
  const [searchTrigger, setSearchTrigger] = useState(0)
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
      const params = { page, limit: 12 }
      if (filterStatus !== 'All') params.status = filterStatus
      if (search) params.search = search
      const data = await clientApi.getRequests(params)
      setItems(data.items || [])
      setTotalPages(data.pages || 1)
      setTotal(data.total || 0)
    } catch (e) {
      setError(e.message || t('dashboard.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus, search, searchTrigger, t])

  const loadMapItems = useCallback(async () => {
    setMapLoading(true)
    try {
      const params = { limit: 1000 }
      if (filterStatus !== 'All') params.status = filterStatus
      if (search) params.search = search
      const data = await clientApi.getRequests(params)
      setMapItems(data.items || [])
    } catch (e) {
      setMapItems([])
    } finally {
      setMapLoading(false)
    }
  }, [filterStatus, search])

  useEffect(() => { load() }, [page, filterStatus, searchTrigger])
  useEffect(() => { if (viewMode === 'map') loadMapItems() }, [viewMode, filterStatus, searchTrigger])

  useEffect(() => {
    clientApi.getResources({ limit: 100 }).then((data) => {
      setResourceSummary(data.summary || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (viewMode !== 'map') return
    if (!mapRef.current || mapInstanceRef.current) return
    const map = L.map(mapRef.current).setView([20.5937, 78.9629], 5)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
    mapInstanceRef.current = map
    setTimeout(() => map.invalidateSize(), 100)
    return () => { map.remove(); mapInstanceRef.current = null }
  }, [viewMode])

  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || viewMode !== 'map') return
    markersRef.current.forEach((m) => map.removeLayer(m))
    markersRef.current = []
    const filtered = filterStatus === 'All' ? mapItems : mapItems.filter((i) => i.status === filterStatus)
    filtered.forEach((item) => {
      if (item.lat == null || item.lng == null) return
      const color = MAP_MARKER_COLORS[item.status] || '#000080'
      const marker = L.circleMarker([item.lat, item.lng], { radius: 8, fillColor: color, color: '#fff', weight: 2, fillOpacity: 0.9 }).addTo(map)
      marker.bindPopup(`<div style="min-width:180px"><div style="font-weight:700;font-size:13px;margin-bottom:4px">${item.title}</div><div style="font-size:12px;color:#666;margin-bottom:4px">${item.status} | ${item.priority}</div><div style="font-size:12px;color:#666;margin-bottom:8px">${item.locationName}</div><a href="/requests/${item._id}" style="display:inline-block;background:#000080;color:#fff;text-decoration:none;padding:4px 10px;border-radius:4px;font-size:12px">View Details</a></div>`)
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
    setSearchTrigger((t) => t + 1)
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

  return (
    <div className="container">
      <div style={{ marginBottom: 16, borderRadius: 12, overflow: 'hidden', background: 'rgba(0,0,128,0.03)' }}>
        <img src="/images/hero-banner.svg" alt="Disaster Relief Coordination" loading="eager" fetchpriority="high" width="1200" height="300" style={{ width: '100%', height: 'auto', display: 'block', aspectRatio: '4/1' }} />
      </div>
      {resourceSummary.length > 0 && (
        <div className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: 14, color: 'var(--gov-blue)' }}>{t('dashboard.resourceInventory')}</h3>
            <button onClick={() => navigate('/resources')} style={{ fontSize: 12, padding: '4px 10px' }}>{t('dashboard.viewAll')}</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {resourceSummary.map((s) => (
              <div key={s._id} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, background: 'rgba(0,0,128,0.05)', border: '1px solid rgba(0,0,128,0.1)' }}>
                <strong>{s._id}</strong>: {s.totalQty} units {s.lowCount > 0 && <span style={{ color: '#cc7a00' }}>({s.lowCount} low)</span>}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="card">
        <div className="headerRow">
          <div>
            <h2 className="pageTitle" style={{ fontSize: 20 }}>{t('dashboard.title')}</h2>
            <div className="small" style={{ marginTop: 4 }}>{total} {t('dashboard.totalRequests')}</div>
          </div>
          <div className="btnRow">
            {currentUser?.role === 'admin' && (
              <button onClick={() => navigate('/admin')} style={{ color: '#000080', borderColor: '#000080' }}>{t('dashboard.admin')}</button>
            )}
            <button
              onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
              style={{ color: '#000080', borderColor: viewMode === 'map' ? '#000080' : 'var(--gov-border)', background: viewMode === 'map' ? 'rgba(0,0,128,0.08)' : undefined, fontWeight: viewMode === 'map' ? 600 : 400 }}
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
                          <div style={{ fontWeight: 700, fontSize: 15, color: '#000080' }}>{it.title}</div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                            <Badge label={t(`statuses.${it.status || 'Open'}`)} colors={STATUS_COLORS} colorKey={it.status || 'Open'} />
                            <Badge label={t(`priorities.${it.priority || 'Medium'}`)} colors={PRIORITY_COLORS} colorKey={it.priority || 'Medium'} />
                            <span className="govt-badge govt-badge-blue">{t(`categories.${it.category || 'Other'}`)}</span>
                          </div>
                          <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>{it.description?.length > 120 ? it.description.slice(0, 120) + '...' : it.description}</div>
                          <div className="small" style={{ marginTop: 8 }}>{it.locationName}</div>
                          {it.createdBy && <div className="small" style={{ marginTop: 4 }}>{t('dashboard.postedBy')} {it.createdBy.displayName || it.createdBy.email || t('dashboard.unknown')}</div>}
                          {it.claimedBy && <div className="small" style={{ marginTop: 2, color: '#cc7a00' }}>{t('dashboard.claimedBy')} {it.claimedBy.displayName || it.claimedBy.email}</div>}
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
            <div className="card" style={{ padding: 0, overflow: 'hidden', position: 'relative', marginTop: 16 }}>
              {mapLoading && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.8)', zIndex: 1000 }}>
                  <div style={{ width: 24, height: 24, border: '3px solid #ccc', borderTopColor: '#000080', borderRadius: '50%', animation: 'admin-spin 0.7s linear infinite' }} />
                </div>
              )}
              <div ref={mapRef} style={{ height: '70vh', width: '100%' }} />
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
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null } })()
  const [deleting, setDeleting] = useState(false)
  const isOwner = user?.id && item.createdBy && item.createdBy._id ? item.createdBy._id === user.id : user?.id && String(item.createdBy) === String(user.id)
  const canEdit = isOwner || user?.role === 'admin'

  async function del(e) {
    e.stopPropagation()
    if (!confirm(t('dashboard.deleteConfirm'))) return
    setDeleting(true)
    try { await clientApi.deleteRequest(id); onChanged() } catch (e) { alert(e.message || 'Failed to delete') } finally { setDeleting(false) }
  }

  function edit(e) { e.stopPropagation(); navigate(`/requests/${id}/edit`) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
      <button disabled={!canEdit} onClick={edit} className="btnPrimary" style={{ opacity: !canEdit ? 0.5 : 1, fontSize: 12, padding: '6px 12px' }}>{t('dashboard.edit')}</button>
      <button disabled={!canEdit || deleting} onClick={del} className="btnDanger" style={{ opacity: !canEdit ? 0.5 : 1, fontSize: 12, padding: '6px 12px' }}>{deleting ? t('dashboard.deleting') : t('dashboard.delete')}</button>
    </div>
  )
})
