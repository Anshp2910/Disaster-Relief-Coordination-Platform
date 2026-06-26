import { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import {
  BarChart3, Activity, ShieldCheck, AlertTriangle, MapPin, Box, FilePlus,
  LayoutDashboard, ArrowUpRight, Radio, Users, Cloud, Sun, Moon, Clock,
  CalendarDays, Thermometer, Droplets, Wind, Map as MapIcon,
  ListChecks, Waypoints, Siren, UserCheck, UserPlus, Handshake,
  TrendingUp, TrendingDown, ChevronRight, Bell, Zap,
} from 'lucide-react'
import { clientApi } from '../api/client'
import { SkeletonList } from '../components/Skeleton'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useConfirm } from '../hooks/useConfirm'
import { registerRefreshListener } from '../hooks/useSocket'
import { escapeHtml } from '../utils/escapeHtml'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import ActivityFeed from '../components/ActivityFeed'
import { useSocket } from '../hooks/useSocket'
import L from 'leaflet'
import EmptyState from '../components/EmptyState'
import { initLeafletMap, cleanupLeafletMap } from '../utils/mapInit'
import { STATUS_COLORS, PRIORITY_COLORS, MAP_MARKER_COLORS } from '../utils/constants'
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
  createdAt?: string
  createdBy?: { _id?: string; displayName?: string; email?: string }
  claimedBy?: { _id?: string; displayName?: string; email?: string }
  matchedResources?: unknown[]
}

interface OwnerActionsProps {
  id: string
  item: Item
  onChanged: () => void
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 18) return 'Good Afternoon'
  return 'Good Evening'
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

const MOCK_KPIS = [
  { id: 'resources', label: 'Resources', value: 1283, icon: Box, color: '#0ea5e9', trend: 8 },
  { id: 'incidents', label: 'Incidents', value: 47, icon: AlertTriangle, color: '#ef4444', trend: 12 },
  { id: 'volunteers', label: 'Volunteers', value: 856, icon: UserCheck, color: '#22c55e', trend: 4 },
  { id: 'ngos', label: 'NGOs', value: 34, icon: Handshake, color: '#8b5cf6', trend: -2 },
  { id: 'pending', label: 'Pending Requests', value: 129, icon: ListChecks, color: '#f97316', trend: 6 },
]

const MOCK_WEATHER = {
  temp: 32, condition: 'Partly Cloudy', humidity: 68, wind: '14 km/h',
}

const MOCK_RISK = { level: 'Moderate', score: 62, color: '#f97316' }

const MOCK_TASKS = [
  { id: 1, title: 'Review pending evacuation requests', due: 'Today', priority: 'High' },
  { id: 2, title: 'Restock medical supplies at Zone 4', due: 'Tomorrow', priority: 'Medium' },
  { id: 3, title: 'Coordinate with NDMA for airlift', due: 'Jun 28', priority: 'Critical' },
  { id: 4, title: 'Update resource inventory database', due: 'Jun 29', priority: 'Low' },
]

const MOCK_VOLUNTEER_STATUS = [
  { status: 'Active', count: 412, color: '#22c55e' },
  { status: 'Standby', count: 178, color: '#f97316' },
  { status: 'Off-duty', count: 266, color: '#64748b' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
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
  const navigate = useNavigate()
  const { t } = useTranslation()
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.CircleMarker[]>([])
  const [mapItems, setMapItems] = useState<Item[]>([])
  const [mapLoading, setMapLoading] = useState(false)
  const [greeting] = useState(getGreeting)
  const [currentDate] = useState(formatDate)

  const { user: currentUser } = useAuth()
  const { connected } = useSocket()

  const displayName = currentUser?.displayName || currentUser?.email || 'User'

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

  useEffect(() => { load() }, [load])
  useEffect(() => { loadMapItems() }, [loadMapItems])
  useAutoRefresh(load, { interval: 20000 })

  useEffect(() => {
    return registerRefreshListener(
      ['request:created', 'request:updated', 'request:deleted', 'request:commented', 'resource:allocated'],
      () => { load(); loadMapItems() }
    )
  }, [load, loadMapItems])

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

  const kpis = useMemo(() => {
    const open = items.filter((i) => i.status === 'Open').length
    const inProgress = items.filter((i) => i.status === 'In Progress').length
    const resolved = items.filter((i) => i.status === 'Resolved' || i.status === 'Fulfilled').length
    const critical = items.filter((i) => i.priority === 'Critical').length
    return { total: items.length, open, inProgress, resolved, critical }
  }, [items])

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {}
    items.forEach((i) => {
      const d = i.createdAt ? new Date(i.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown'
      counts[d] = (counts[d] || 0) + 1
    })
    return Object.entries(counts).slice(-14).map(([date, count]) => ({ date, count }))
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

  return (
    <motion.div className="container" variants={containerVariants} initial="hidden" animate="show">
      {/* ── HERO SECTION: Greeting + Weather + Risk ── */}
      <motion.div className="grid-3 mb-lg" variants={fadeUp}>
        {/* Greeting Card */}
        <motion.div className="bento-card" variants={itemVariants}>
          <div className="flex items-center gap-sm mb-sm">
            <div className="bento-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <Sun size={20} />
            </div>
            <div>
              <div className="text-base" style={{ fontWeight: 700, color: 'var(--text)' }}>{greeting}, {displayName.split(' ')[0]}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{currentDate}</div>
            </div>
          </div>
          <div className="flex items-center gap-sm">
            <span className={`live-dot ${connected ? '' : 'live-dot--disconnected'}`}>
              {connected ? t('dashboard.live') : t('dashboard.offline')}
            </span>
            {total > 0 && (
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{total} {t('dashboard.totalRequests')}</span>
            )}
          </div>
        </motion.div>

        {/* Weather Card */}
        <motion.div className="bento-card" variants={itemVariants}>
          <div className="flex-between mb-sm">
            <span className="bento-title">{t('commandCenter.weather') || 'Weather'}</span>
            {MOCK_WEATHER.condition.includes('Cloud') ? <Cloud size={18} style={{ color: '#0ea5e9' }} /> :
             MOCK_WEATHER.condition.includes('Sun') ? <Sun size={18} style={{ color: '#f97316' }} /> :
             <Cloud size={18} style={{ color: '#0ea5e9' }} />}
          </div>
          <div className="flex items-end gap-sm">
            <span className="text-3xl font-extrabold" style={{ letterSpacing: 'var(--tracking-tight)' }}>{MOCK_WEATHER.temp}°C</span>
            <span className="text-sm mb-xs" style={{ color: 'var(--text-muted)' }}>{MOCK_WEATHER.condition}</span>
          </div>
          <div className="flex gap-md mt-sm" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-xs"><Droplets size={12} /> {MOCK_WEATHER.humidity}%</span>
            <span className="flex items-center gap-xs"><Wind size={12} /> {MOCK_WEATHER.wind}</span>
          </div>
        </motion.div>

        {/* Disaster Risk Card */}
        <motion.div className="bento-card" variants={itemVariants}>
          <div className="flex-between mb-sm">
            <span className="bento-title">Disaster Risk</span>
            <AlertTriangle size={18} style={{ color: MOCK_RISK.color }} />
          </div>
          <div className="flex items-center gap-sm">
            <span className="text-3xl font-extrabold" style={{ color: MOCK_RISK.color, letterSpacing: 'var(--tracking-tight)' }}>{MOCK_RISK.score}%</span>
            <span className="text-sm" style={{ color: MOCK_RISK.color }}>{MOCK_RISK.level}</span>
          </div>
          <div className="mt-sm" style={{ background: 'var(--border)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${MOCK_RISK.score}%` }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: '100%', background: MOCK_RISK.color, borderRadius: 4 }}
            />
          </div>
        </motion.div>
      </motion.div>

      {/* ── KPI CARDS ── */}
      <motion.div className="kpi-grid mb-lg" variants={fadeUp}>
        {MOCK_KPIS.map((kpi) => {
          const Icon = kpi.icon
          return (
            <motion.div key={kpi.id} className="kpi-card" variants={itemVariants}>
              <div className="kpi-header">
                <span className="kpi-label">{kpi.label}</span>
                <Icon size={18} style={{ color: kpi.color }} />
              </div>
              <div className="kpi-value" style={{ color: kpi.color }}>{kpi.value.toLocaleString()}</div>
              <div className="kpi-change" style={{ color: kpi.trend >= 0 ? '#22c55e' : '#ef4444' }}>
                {kpi.trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                <span style={{ marginLeft: 4 }}>{Math.abs(kpi.trend)}% vs last week</span>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* ── INTERACTIVE INDIA MAP ── */}
      <motion.div className="bento-grid mb-lg" variants={fadeUp}>
        <div className="bento-card bento--wide">
          <div className="bento-header">
            <span className="bento-title"><MapIcon size={14} /> {t('dashboard.mapView')}</span>
            <div className="flex gap-sm">
              <button onClick={() => navigate('/map')} className="text-xs" style={{ color: 'var(--accent)' }}>{t('dashboard.viewAll')}</button>
            </div>
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
            <EmptyState icon="🗺️" title={t('dashboard.noRequests')} />
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
      </motion.div>

      {/* ── BOTTOM GRID: Charts + Activity + Tasks + Quick Actions ── */}
      <motion.div className="grid-2 mb-lg" variants={fadeUp}>
        {/* Left Column */}
        <motion.div variants={itemVariants}>
          {/* Charts */}
          <motion.div className="bento-card mb-md" variants={itemVariants}>
            <div className="bento-header">
              <span className="bento-title"><BarChart3 size={14} /> Requests Over Time</span>
            </div>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--gov-muted)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--gov-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }} />
                  <Bar dataKey="count" fill="var(--accent)" fillOpacity={0.6} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm" style={{ color: 'var(--text-muted)', padding: 24, textAlign: 'center' }}>No request data available</div>
            )}
          </motion.div>

          {/* Recent Activities */}
          <motion.div className="bento-card" variants={itemVariants}>
            <div className="bento-header">
              <span className="bento-title"><Bell size={14} /> Recent Activities</span>
            </div>
            <ActivityFeed compact />
          </motion.div>
        </motion.div>

        {/* Right Column */}
        <motion.div variants={itemVariants}>
          {/* Upcoming Tasks */}
          <motion.div className="bento-card mb-md" variants={itemVariants}>
            <div className="bento-header">
              <span className="bento-title"><ListChecks size={14} /> Upcoming Tasks</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {MOCK_TASKS.map((task) => (
                <motion.div
                  key={task.id}
                  className="listCard"
                  whileHover={{ scale: 1.01 }}
                  style={{ padding: 'var(--space-sm) var(--space-md)', cursor: 'default' }}
                >
                  <div className="flex-between gap-sm">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-bold">{task.title}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{task.due}</div>
                    </div>
                    <Badge
                      label={task.priority}
                      colors={PRIORITY_COLORS as unknown as Record<string, { bg: string; border: string; text: string }>}
                      colorKey={task.priority}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Volunteer Status */}
          <motion.div className="bento-card mb-md" variants={itemVariants}>
            <div className="bento-header">
              <span className="bento-title"><UserCheck size={14} /> Volunteer Status</span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {MOCK_VOLUNTEER_STATUS.map((v) => (
                <motion.div
                  key={v.status}
                  className="flex-1 text-center"
                  style={{ background: 'var(--bg)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}
                  whileHover={{ scale: 1.03 }}
                >
                  <div className="text-xl font-extrabold" style={{ color: v.color }}>{v.count}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{v.status}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div className="bento-card" variants={itemVariants}>
            <div className="bento-header">
              <span className="bento-title"><Zap size={14} /> Quick Actions</span>
            </div>
            <div className="flex flex-wrap gap-sm" style={{ gap: 'var(--space-sm)' }}>
              {[
                { path: '/requests/new', label: t('dashboard.newRequest'), icon: FilePlus, color: '#22c55e' },
                { path: '/map', label: t('dashboard.mapView'), icon: MapIcon, color: '#0ea5e9' },
                { path: '/resources', label: t('nav.resources') || 'Resources', icon: Box, color: '#8b5cf6' },
                { path: '/incidents', label: t('nav.incidents') || 'Incidents', icon: AlertTriangle, color: '#ef4444' },
                { path: '/command-center', label: t('nav.commandCenter') || 'Command Center', icon: Radio, color: '#0ea5e9' },
                { path: '/zones', label: t('nav.zones') || 'Zones', icon: MapPin, color: '#f97316' },
                ...(currentUser?.role === 'admin' ? [
                  { path: '/admin', label: t('nav.admin') || 'Admin', icon: ShieldCheck, color: '#f59e0b' },
                ] : []),
              ].map((action) => {
                const Icon = action.icon
                return (
                  <motion.button
                    key={action.path}
                    onClick={() => navigate(action.path)}
                    className="nav-chip"
                    style={{ background: `${action.color}15`, borderColor: `${action.color}30` }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <Icon size={14} style={{ color: action.color }} />
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 500, color: 'var(--text)' }}>{action.label}</span>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ── REQUESTS LIST ── */}
      <motion.div className="card mt-lg" variants={fadeUp}>
        <div className="flex-between mb-md">
          <h2 className="text-lg text-bold m-0">{t('dashboard.allRequests')}</h2>
          <div className="flex flex-gap-sm">
            <button onClick={loadMapItems} className="text-sm p-xs border-gov rounded-sm" style={{ color: 'var(--gov-blue)', borderColor: 'var(--gov-border)' }}>
              {t('dashboard.refresh') || 'Refresh'}
            </button>
          </div>
        </div>
        {error ? <div className="errorText">{error}</div> : null}
        <nav aria-label="Filters">
          <motion.div className="flex flex-gap-sm mt-md flex-wrap" variants={fadeUp}>
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
          </div>
        </nav>
        <section aria-label={t('dashboard.title')} role="region" aria-live="polite">
          {loading ? (
            <SkeletonList count={4} lines={3} />
          ) : (
            <>
              <motion.div className="gridGap mt-lg" variants={fadeUp}>
                {items.length === 0 ? (
                  <EmptyState icon="📋" title={t('dashboard.noRequests')} description={t('dashboard.noRequestsDesc') || 'No requests match your filters'} />
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
      </motion.div>
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
