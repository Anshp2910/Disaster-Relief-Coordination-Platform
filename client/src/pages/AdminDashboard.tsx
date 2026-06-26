import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Users, Shield, Activity, BarChart3, AlertTriangle, Plus, Edit, Trash2, Search, X, CheckCircle, XCircle, Filter, ArrowLeft, Download } from 'lucide-react'
import { clientApi } from '../api/client'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { registerRefreshListener } from '../hooks/useSocket'
import { useToast } from '../components/Toast'
import { useConfirm } from '../hooks/useConfirm'
import { Modal, PageHeader, DataCard, ErrorState, FilterBar, DataList, Pagination } from '../components/ui'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import { SkeletonList } from '../components/Skeleton'

interface User {
  _id: string
  displayName?: string
  email?: string
  role: string
  createdAt?: string
}

interface Request {
  _id: string
  title?: string
  status?: string
  priority?: string
  category?: string
  locationName?: string
  createdBy?: {
    _id?: string
    displayName?: string
    email?: string
  }
}

interface DailyRequest {
  date?: string
  count?: number
}

interface Stats {
  totalUsers?: number
  totalRequests?: number
  byStatus?: Record<string, number>
  byCategory?: Record<string, number>
  byPriority?: Record<string, number>
  dailyRequests?: DailyRequest[]
}

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Open: { bg: 'var(--accent-soft)', border: 'rgba(59,130,246,0.25)', text: 'var(--color-open)' },
  'In Progress': { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', text: 'var(--color-progress)' },
  Resolved: { bg: 'var(--success-soft)', border: 'rgba(34,197,94,0.25)', text: 'var(--color-resolved)' },
  Fulfilled: { bg: 'rgba(52,211,153,.1)', border: 'rgba(52,211,153,.25)', text: 'var(--color-fulfilled)' },
}

const PRIORITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  Critical: { bg: 'var(--danger-soft)', border: 'rgba(239,68,68,0.25)', text: 'var(--color-critical)' },
  High: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', text: 'var(--color-high)' },
  Medium: { bg: 'rgba(234,179,8,.1)', border: 'rgba(234,179,8,.25)', text: 'var(--color-medium)' },
  Low: { bg: 'rgba(34,197,94,.1)', border: 'rgba(34,197,94,.25)', text: 'var(--color-low)' },
}

const BREAKDOWN_COLORS = ['var(--color-open)', 'var(--accent-indigo)', 'var(--color-resolved)', 'var(--color-critical)', 'var(--accent-purple)', 'var(--color-high)']

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const } },
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`
}

interface MiniBarChartProps {
  data?: DailyRequest[]
}

function MiniBarChart({ data }: MiniBarChartProps) {
  const safeData = Array.isArray(data) ? data : []
  const containerRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; count: number; date: string } | null>(null)

  if (!safeData.length) return null

  const values = safeData.map((d) => typeof d.count === 'number' ? d.count : 0)
  const max = Math.max(...values, 1)
  const n = safeData.length

  const PADDING_LEFT = 40
  const PADDING_BOTTOM = 28
  const PADDING_TOP = 16
  const PADDING_RIGHT = 8
  const SVG_W = 600
  const SVG_H = 220
  const chartW = SVG_W - PADDING_LEFT - PADDING_RIGHT
  const chartH = SVG_H - PADDING_TOP - PADDING_BOTTOM
  const barGap = Math.max(2, Math.min(6, chartW / n * 0.2))
  const barW = Math.max(4, (chartW - barGap * (n - 1)) / n)

  const gridLines = [0, 0.25, 0.5, 0.75, 1]

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', display: 'block' }} role="img" aria-label="Daily requests bar chart">
        {gridLines.map((ratio) => {
          const y = PADDING_TOP + chartH * (1 - ratio)
          return (
            <g key={ratio}>
              <line x1={PADDING_LEFT} y1={y} x2={SVG_W - PADDING_RIGHT} y2={y} stroke="var(--border)" strokeWidth={1} />
              <text x={PADDING_LEFT - 6} y={y + 4} textAnchor="end" fill="var(--gov-muted)" fontSize={10}>
                {Math.round(max * ratio)}
              </text>
            </g>
          )
        })}
        {safeData.map((d, idx) => {
          const count = values[idx]
          const barH = (count / max) * chartH
          const x = PADDING_LEFT + idx * (barW + barGap)
          const y = PADDING_TOP + chartH - barH
          const showLabel = n <= 15 || idx % Math.ceil(n / 10) === 0 || idx === n - 1
          return (
            <g key={d.date || idx}>
              <motion.rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(barH, 2)}
                fill="var(--accent)"
                fillOpacity={0.6}
                rx={2}
                initial={{ height: 0, y: PADDING_TOP + chartH }}
                animate={{ height: Math.max(barH, 2), y }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: idx * 0.02 }}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  const rect = (e.target as SVGRectElement).getBoundingClientRect()
                  const container = containerRef.current
                  if (container) {
                    const cr = container.getBoundingClientRect()
                    setTooltip({
                      x: rect.left - cr.left + rect.width / 2,
                      y: rect.top - cr.top,
                      count,
                      date: formatDate(d.date || ''),
                    })
                  }
                }}
                onMouseLeave={() => setTooltip(null)}
              />
              {showLabel && (
                <text x={x + barW / 2} y={SVG_H - PADDING_BOTTOM + 16} textAnchor="middle" fill="var(--gov-muted)" fontSize={9}>
                  {formatDate(d.date || '')}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: 'translate(-50%, -100%)',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}
        >
          {tooltip.count} — {tooltip.date}
        </div>
      )}
    </div>
  )
}

interface BreakdownCardProps {
  title: string
  data?: Record<string, number>
  total?: number
  type: string
}

function BreakdownCard({ title, data, total, type }: BreakdownCardProps) {
  const { t } = useTranslation()
  const safeData = data || {}
  const safeTotal = total || 0
  if (Object.keys(safeData).length === 0) return null

  return (
    <motion.div className="admin-breakdown-card" variants={itemVariants}>
      <div className="admin-breakdown-header">{title}</div>
      {Object.entries(safeData).map(([key, count], i) => {
        const numCount = typeof count === 'number' ? count : 0
        const pct = safeTotal > 0 ? Math.round((numCount / safeTotal) * 100) : 0
        const color = BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length]
        return (
          <div key={key} className="admin-breakdown-row">
            <span className="text-medium">{t(`${type}.${key}`) || key || 'Unknown'}</span>
            <div className="admin-breakdown-bar">
              <motion.div
                className="admin-breakdown-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
                style={{ background: color }}
              />
            </div>
            <span className="text-bold min-w-40 text-right" style={{ color }}>{numCount}</span>
          </div>
        )
      })}
    </motion.div>
  )
}

interface StatsPanelProps {
  stats?: Stats | null
}

function StatsPanel({ stats }: StatsPanelProps) {
  const { t } = useTranslation()
  if (!stats) return null

  const safeStats = stats || {}
  const byStatus = safeStats.byStatus || {}
  const totalAll = Object.values(byStatus).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0)

  const summaryCards = [
    { label: t('admin.totalUsers'), value: safeStats.totalUsers || 0, icon: <Users size={20} />, color: 'var(--color-open)' },
    { label: t('admin.totalRequests'), value: safeStats.totalRequests || 0, icon: <BarChart3 size={20} />, color: 'var(--accent-indigo)' },
    { label: t('admin.openRequests'), value: byStatus.Open || 0, icon: <Activity size={20} />, color: 'var(--color-open)' },
    {
      label: t('admin.resolved'),
      value: (byStatus.Resolved || 0) + (byStatus.Fulfilled || 0),
      icon: <CheckCircle size={20} />,
      color: 'var(--color-resolved)',
    },
  ]

  return (
    <motion.div className="card" variants={containerVariants} initial="hidden" animate="show">
      <h3 className="m-0 text-bold text-accent-blue text-15">{t('admin.platformOverview')}</h3>

      <section aria-label="Statistics">
        <div className="admin-stats-grid">
          {summaryCards.map((c) => (
            <motion.div key={c.label} variants={itemVariants}>
              <DataCard title={c.label} value={c.value} icon={c.icon} color={c.color} />
            </motion.div>
          ))}
        </div>
      </section>

      {stats.dailyRequests && stats.dailyRequests.length > 0 && (
        <motion.div className="mt-xl" variants={itemVariants}>
          <div className="text-semi mb-xs text-accent-blue text-13">{t('admin.requestsOverTime')}</div>
          <MiniBarChart data={stats.dailyRequests} />
        </motion.div>
      )}

      <div className="admin-breakdown-grid">
        <BreakdownCard title={t('admin.byStatus')} data={stats.byStatus} total={totalAll} type="statuses" />
        <BreakdownCard title={t('admin.byCategory')} data={stats.byCategory} total={stats.totalRequests} type="categories" />
        <BreakdownCard title={t('admin.byPriority')} data={stats.byPriority} total={stats.totalRequests} type="priorities" />
      </div>
    </motion.div>
  )
}

interface UsersPanelProps {
  users: User[]
  onChangeRole: (userId: string, newRole: string) => void
  onDelete: (userId: string) => void
}

function UsersPanel({ users, onChangeRole, onDelete }: UsersPanelProps) {
  const [search, setSearch] = useState('')
  const { t } = useTranslation()

  const safeUsers = Array.isArray(users) ? users : []

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return safeUsers
    return safeUsers.filter(
      (u) =>
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
    )
  }, [safeUsers, search])

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { volunteer: 0, ngo: 0, admin: 0 }
    safeUsers.forEach((u) => {
      if (counts[u.role] !== undefined) counts[u.role]++
    })
    return counts
  }, [safeUsers])

  return (
    <section aria-label="User Management">
      <motion.div className="card" variants={containerVariants} initial="hidden" animate="show">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('admin.searchUsers')}
          filters={[]}
        />

        <motion.div className="flex flex-gap-sm text-sm text-muted mb-md" variants={itemVariants}>
          <span className="govt-badge govt-badge-blue">
            <Users size={12} /> {roleCounts.volunteer} {t('auth.volunteer')}{roleCounts.volunteer !== 1 ? 's' : ''}
          </span>
          <span className="govt-badge govt-badge-saffron">
            <Shield size={12} /> {roleCounts.ngo} {t('auth.ngo')}{roleCounts.ngo !== 1 ? 's' : ''}
          </span>
          <span className="govt-badge govt-badge-green">
            <Shield size={12} /> {roleCounts.admin} {t('nav.admin')}{roleCounts.admin !== 1 ? 's' : ''}
          </span>
        </motion.div>

        {filtered.length === 0 ? (
          <motion.div variants={itemVariants}>
            <EmptyState icon="👥" title={search ? t('admin.noUsersMatch') : t('admin.noUsers')} description={search ? t('admin.tryDifferentSearch') || 'Try a different search' : t('admin.noUsersDesc') || 'No users registered yet'} />
          </motion.div>
        ) : (
          <motion.div className="admin-table-wrapper border-none mt-md" variants={itemVariants}>
            <table className="data-table admin-table" aria-label={t('admin.tabUsers')}>
              <thead>
                <tr>
                  <th scope="col">{t('admin.userHeader')}</th>
                  <th scope="col">{t('admin.roleHeader')}</th>
                  <th scope="col">{t('admin.joinedHeader')}</th>
                  <th scope="col" className="text-right">{t('admin.actionsHeader')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <motion.tr
                    key={u._id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: i * 0.03 }}
                  >
                    <td>
                      <div className="admin-user-name">{u.displayName}</div>
                      <div className="admin-user-email">{u.email}</div>
                    </td>
                    <td>
                      <select
                        value={u.role}
                        onChange={(e) => onChangeRole(u._id, e.target.value)}
                        className="admin-role-select"
                        aria-label={`${t('admin.roleHeader')} for ${u.displayName || u.email || u._id}`}
                      >
                        <option value="volunteer">{t('auth.volunteer')}</option>
                        <option value="ngo">{t('auth.ngo')}</option>
                        <option value="admin">{t('nav.admin')}</option>
                      </select>
                    </td>
                    <td>
                      <span className="small">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '\u2014'}</span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => onDelete(u._id)}
                        className="admin-action-btn btnDanger"
                        aria-label={`${t('admin.delete')} ${u.displayName || u.email || u._id}`}
                      >
                        <Trash2 size={14} /> {t('admin.delete')}
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </motion.div>
    </section>
  )
}

interface RequestsPanelProps {
  requests: Request[]
  onDelete: (requestId: string) => void
}

function RequestsPanel({ requests, onDelete }: RequestsPanelProps) {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const { t } = useTranslation()
  const navigate = useNavigate()

  const safeRequests = Array.isArray(requests) ? requests : []

  const filtered = useMemo(() => {
    let items = safeRequests
    if (filterStatus !== 'All') items = items.filter((r) => r.status === filterStatus)
    const q = search.toLowerCase().trim()
    if (q) {
      items = items.filter(
        (r) =>
          (r.title || '').toLowerCase().includes(q) ||
          (r.category || '').toLowerCase().includes(q) ||
          (r.locationName || '').toLowerCase().includes(q) ||
          (r.createdBy?.displayName || '').toLowerCase().includes(q)
      )
    }
    return items
  }, [safeRequests, search, filterStatus])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: safeRequests.length }
    safeRequests.forEach((r) => {
      const s = r.status || 'Open'
      counts[s] = (counts[s] || 0) + 1
    })
    return counts
  }, [safeRequests])

  const filterOptions = [
    { key: 'All', label: `${t('dashboard.filterAll')} (${statusCounts.All || 0})` },
    { key: 'Open', label: `${t('statuses.Open')} (${statusCounts.Open || 0})` },
    { key: 'Pending', label: `${t('statuses.Pending')} (${statusCounts.Pending || 0})` },
    { key: 'In Progress', label: `${t('statuses.In Progress')} (${statusCounts['In Progress'] || 0})` },
    { key: 'Resolved', label: `${t('statuses.Resolved')} (${statusCounts.Resolved || 0})` },
    { key: 'Fulfilled', label: `${t('statuses.Fulfilled')} (${statusCounts.Fulfilled || 0})` },
  ]

  return (
    <section aria-label="Request Management">
      <motion.div className="card" variants={containerVariants} initial="hidden" animate="show">
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('admin.searchRequests')}
          filters={[
            {
              key: 'status',
              label: t('admin.statusHeader'),
              options: filterOptions,
              value: filterStatus,
              onChange: setFilterStatus,
            },
          ]}
        />

        {filtered.length === 0 ? (
          <motion.div variants={itemVariants}>
            <EmptyState icon="📋" title={search || filterStatus !== 'All' ? t('admin.noRequestsMatch') : t('admin.noRequests')} description={t('admin.noRequestsDesc') || 'No requests created yet'} />
          </motion.div>
        ) : (
          <motion.div className="admin-table-wrapper border-none mt-md" variants={itemVariants}>
            <table className="data-table admin-table" aria-label={t('admin.tabRequests')}>
              <thead>
                <tr>
                  <th scope="col">{t('admin.requestHeader')}</th>
                  <th scope="col">{t('admin.statusHeader')}</th>
                  <th scope="col">{t('admin.priorityHeader')}</th>
                  <th scope="col">{t('admin.categoryHeader')}</th>
                  <th scope="col">{t('admin.postedByHeader')}</th>
                  <th scope="col" className="text-right">{t('admin.actionsHeader')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <motion.tr
                    key={r._id}
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/requests/${r._id}`)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/requests/${r._id}`) } }}
                    variants={itemVariants}
                    initial="hidden"
                    animate="show"
                    transition={{ delay: i * 0.03 }}
                  >
                    <td className="max-w-280">
                      <div className="admin-request-title">{r.title}</div>
                      <div className="admin-request-location">{r.locationName || t('admin.noLocation')}</div>
                    </td>
                    <td>
                      <Badge
                        label={t(`statuses.${r.status || 'Open'}`)}
                        colors={STATUS_COLORS}
                        colorKey={r.status || 'Open'}
                      />
                    </td>
                    <td>
                      <Badge
                        label={t(`priorities.${r.priority || 'Medium'}`)}
                        colors={PRIORITY_COLORS}
                        colorKey={r.priority || 'Medium'}
                      />
                    </td>
                    <td>
                      <span className="govt-badge govt-badge-blue">{t(`categories.${r.category || 'Other'}`)}</span>
                    </td>
                    <td>
                      <span className="small">{r.createdBy?.displayName || r.createdBy?.email || t('dashboard.unknown')}</span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDelete(r._id)
                        }}
                        className="admin-action-btn btnDanger"
                        aria-label={`${t('admin.delete')} ${r.title || r._id}`}
                      >
                        <Trash2 size={14} /> {t('admin.delete')}
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </motion.div>
    </section>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [activeTab, setActiveTab] = useState('stats')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { t } = useTranslation()
  const toast = useToast()

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [s, u, r] = await Promise.all([
        clientApi.adminStats(),
        clientApi.adminUsers(),
        clientApi.adminRequests({ limit: '100' }),
      ]) as unknown as [Stats, { users: User[] }, { items: Request[] }]
      setStats(s)
      setUsers(u.users || [])
      setRequests(r.items || [])
    } catch (e) {
      setError((e as Error).message || 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useAutoRefresh(loadData, { interval: 20000 })

  useEffect(() => {
    return registerRefreshListener(['request:created', 'request:updated', 'request:deleted', 'resource:created', 'resource:allocated'], loadData)
  }, [loadData])

  const changeRole = useCallback(async (userId: string, newRole: string) => {
    try {
      await clientApi.adminUpdateUserRole(userId, newRole)
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)))
      toast.success(t('admin.roleUpdated'))
    } catch (e) {
      toast.error((e as Error).message || 'Failed to update role')
    }
  }, [toast, t])

  const delConfirm = useConfirm()

  const deleteUser = useCallback(async (userId: string) => {
    const ok = await delConfirm.confirm({ message: t('admin.deleteUserConfirm'), danger: true })
    if (!ok) return
    try {
      await clientApi.adminDeleteUser(userId)
      setUsers((prev) => prev.filter((u) => u._id !== userId))
      toast.success(t('admin.userDeleted'))
    } catch (e) {
      toast.error((e as Error).message || 'Failed to delete user')
    }
  }, [toast, t])

  const deleteRequest = useCallback(async (requestId: string) => {
    const ok = await delConfirm.confirm({ message: t('admin.deleteRequestConfirm'), danger: true })
    if (!ok) return
    try {
      await clientApi.adminDeleteRequest(requestId)
      setRequests((prev) => prev.filter((r) => r._id !== requestId))
      toast.success(t('admin.requestDeleted'))
    } catch (e) {
      toast.error((e as Error).message || 'Failed to delete request')
    }
  }, [toast, t])

  function handleExport(format: string) {
    clientApi.adminExportRequests(format)
      .then((data: unknown) => {
        if (format === 'csv') {
          const blob = new Blob([data as BlobPart], { type: 'text/csv' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'requests-export.csv'
          a.click()
          URL.revokeObjectURL(url)
        } else {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'requests-export.json'
          a.click()
          URL.revokeObjectURL(url)
        }
      })
      .catch((e: Error) => { toast?.error?.(e.message || 'Export failed') })
  }

  const tabs = [
    { id: 'stats', label: t('admin.tabOverview') },
    { id: 'users', label: t('admin.tabUsers'), count: users.length },
    { id: 'requests', label: t('admin.tabRequests'), count: requests.length },
  ]

  return (
    <div className="container">
      <PageHeader
        title={t('admin.title')}
        subtitle={t('admin.subtitle')}
        actions={
          <div className="flex gap-sm">
            <button onClick={() => navigate('/dashboard')} className="btn-ghost btn-sm" aria-label={t('admin.backToDashboard')}>
              <ArrowLeft size={16} /> {t('admin.backToDashboard')}
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="btn-ghost btn-sm"
              style={{ color: 'var(--success)', borderColor: 'rgba(34,197,94,0.3)' }}
              aria-label={t('common.exportCSV')}
            >
              <Download size={14} /> {t('common.exportCSV')}
            </button>
          </div>
        }
      />

      {error && (
        <motion.div className="mb-md" variants={fadeUp} initial="hidden" animate="show">
          <ErrorState message={error} onRetry={loadData} />
        </motion.div>
      )}

      <motion.div className="card mb-xl" variants={fadeUp} initial="hidden" animate="show">
        <nav aria-label={t('admin.title')}>
          <div className="flex flex-gap-xs overflow-x-auto border-bottom" style={{ WebkitOverflowScrolling: 'touch' }} role="tablist">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-semi tab-btn ${isActive ? 'active' : ''}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`admin-panel-${tab.id}`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`text-bold tab-count ${isActive ? 'active' : 'inactive'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </nav>
      </motion.div>

      {loading ? (
        <motion.div className="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <SkeletonList count={6} lines={2} />
        </motion.div>
      ) : (
        <motion.div
          key={activeTab}
          variants={containerVariants}
          initial="hidden"
          animate="show"
          role="tabpanel"
          id={`admin-panel-${activeTab}`}
          aria-label={tabs.find((t) => t.id === activeTab)?.label || activeTab}
        >
          {activeTab === 'stats' ? (
            <StatsPanel stats={stats} />
          ) : activeTab === 'users' ? (
            <UsersPanel users={users} onChangeRole={changeRole} onDelete={deleteUser} />
          ) : (
            <RequestsPanel requests={requests} onDelete={deleteRequest} />
          )}
        </motion.div>
      )}
      {delConfirm.ConfirmDialog}
    </div>
  )
}
