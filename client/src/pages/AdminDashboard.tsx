import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { createStagger, createListItem } from '../utils/animations'
import { Users, FileText, Activity, CheckCircle, Shield, Trash2, Download, ArrowLeft } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { clientApi } from '../api/client'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { registerRefreshListener } from '../hooks/useSocket'
import { useToast } from '../components/Toast'
import { useConfirm } from '../hooks/useConfirm'
import { PageHeader, ErrorState, DataTable, PageTransition, AnimatedCounter } from '../components/ui'
import type { ColumnDef } from '../components/ui/DataTable'
import Badge from '../components/Badge'
import { STATUS_COLORS, PRIORITY_COLORS } from '../utils/constants'
import { SkeletonList } from '../components/Skeleton'
import { getErrorMessage } from '../utils/getErrorMessage'



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

const BREAKDOWN_COLORS = ['var(--color-open)', 'var(--accent-indigo)', 'var(--color-resolved)', 'var(--color-critical)', 'var(--accent-purple)', 'var(--color-high)']

const PIE_COLORS_STATUS = ['var(--color-open)', 'var(--color-progress)', 'var(--color-resolved)', 'var(--color-fulfilled)', 'var(--color-critical)']

const PIE_COLORS_PRIORITY = ['var(--color-critical)', 'var(--color-high)', 'var(--color-medium)', 'var(--color-low)']

const containerVariants = createStagger(0.05)
const itemVariants = createListItem(12, 0.3)
const fadeUp = createListItem(16, 0.3)

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`
}

function DailyRequestsChart({ data }: { data?: DailyRequest[] }) {
  const safeData = Array.isArray(data) ? data : []
  if (!safeData.length) return null

  const chartData = safeData.map((d) => ({
    date: formatDate(d.date || ''),
    count: typeof d.count === 'number' ? d.count : 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--gov-muted)' }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: 'var(--gov-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
          labelStyle={{ fontWeight: 600, marginBottom: 4 }}
        />
        <Bar dataKey="count" fill="var(--accent)" fillOpacity={0.6} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function StatusPieChart({ data }: { data?: Record<string, number> }) {
  const { t } = useTranslation()
  const safeData = data || {}
  const entries = Object.entries(safeData)
  if (!entries.length) return null

  const chartData = entries.map(([key, value]) => ({
    name: t(`statuses.${key}`) || key,
    value: typeof value === 'number' ? value : 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
          {chartData.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS_STATUS[i % PIE_COLORS_STATUS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function PriorityPieChart({ data }: { data?: Record<string, number> }) {
  const { t } = useTranslation()
  const safeData = data || {}
  const entries = Object.entries(safeData)
  if (!entries.length) return null

  const chartData = entries.map(([key, value]) => ({
    name: t(`priorities.${key}`) || key,
    value: typeof value === 'number' ? value : 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
          {chartData.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS_PRIORITY[i % PIE_COLORS_PRIORITY.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function CategoryBarChart({ data, total: _total }: { data?: Record<string, number>; total?: number }) {
  const { t } = useTranslation()
  const safeData = data || {}
  const entries = Object.entries(safeData)
  if (!entries.length) return null

  const chartData = entries.map(([key, value]) => ({
    name: t(`categories.${key}`) || key,
    count: typeof value === 'number' ? value : 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={Math.max(140, chartData.length * 32)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--gov-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--gov-muted)' }} axisLine={false} tickLine={false} width={80} />
        <Tooltip
          contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
        />
        <Bar dataKey="count" fill="var(--accent-indigo)" fillOpacity={0.7} radius={[0, 2, 2, 0]} />
      </BarChart>
    </ResponsiveContainer>
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
            <span className="text-medium">{t(`${type}.${key}`) || key || t('common.unknown')}</span>
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

  const byStatus = stats.byStatus || {}
  const byPriority = stats.byPriority || {}
  const summaryCards = [
    {
      label: t('admin.totalUsers'), value: stats.totalUsers || 0,
      icon: <Users size={20} />, color: 'var(--color-open)',
      subtitle: t('admin.registeredUsers'),
    },
    {
      label: t('admin.totalRequests'), value: stats.totalRequests || 0,
      icon: <FileText size={20} />, color: 'var(--accent-indigo)',
      subtitle: t('admin.totalRequestsDesc'),
    },
    {
      label: t('admin.openRequests'), value: byStatus.Open || 0,
      icon: <Activity size={20} />, color: 'var(--color-open)',
      subtitle: t('admin.needsAttention'),
    },
    {
      label: t('admin.resolved'),
      value: (byStatus.Resolved || 0) + (byStatus.Fulfilled || 0),
      icon: <CheckCircle size={20} />, color: 'var(--color-resolved)',
      subtitle: t('admin.completed'),
    },
  ]

  return (
    <motion.div className="card" variants={containerVariants} initial="hidden" animate="visible">
      <h3 className="m-0 text-bold text-accent-blue text-15">{t('admin.platformOverview')}</h3>

      <section aria-label={t('admin.statisticsLabel')}>
        <div className="admin-stats-grid">
          {summaryCards.map((c) => (
            <motion.div key={c.label} className="bento-card" variants={itemVariants}>
              <div className="bento-header">
                <span className="bento-title">{c.label}</span>
                <div className="bento-icon" style={{ background: `${c.color}20`, color: c.color } as React.CSSProperties}>
                  {c.icon}
                </div>
              </div>
              <div className="bento-kpi-value">
                <AnimatedCounter to={c.value} duration={1.8} />
              </div>
              {c.subtitle && <div className="mt-sm text-xs text-muted">{c.subtitle}</div>}
            </motion.div>
          ))}
        </div>
      </section>

      <div className="admin-charts-grid">
        <motion.div className="admin-chart-card" variants={itemVariants}>
          <div className="text-semi mb-xs text-accent-blue text-13">{t('admin.requestsOverTime')}</div>
          <DailyRequestsChart data={stats.dailyRequests} />
        </motion.div>
        <motion.div className="admin-chart-card" variants={itemVariants}>
          <div className="text-semi mb-xs text-accent-blue text-13">{t('admin.byStatus')}</div>
          <StatusPieChart data={stats.byStatus} />
        </motion.div>
        <motion.div className="admin-chart-card" variants={itemVariants}>
          <div className="text-semi mb-xs text-accent-blue text-13">{t('admin.byPriority')}</div>
          <PriorityPieChart data={stats.byPriority} />
        </motion.div>
        <motion.div className="admin-chart-card admin-chart-card--wide" variants={itemVariants}>
          <div className="text-semi mb-xs text-accent-blue text-13">{t('admin.byCategory')}</div>
          <CategoryBarChart data={stats.byCategory} total={stats.totalRequests} />
        </motion.div>
      </div>

      {byPriority && Object.keys(byPriority).length > 0 && (
        <motion.div className="mt-xl" variants={itemVariants}>
          <BreakdownCard title={t('admin.byPriority')} data={stats.byPriority} total={stats.totalRequests} type="priorities" />
        </motion.div>
      )}
    </motion.div>
  )
}

interface UsersPanelProps {
  users: User[]
  onChangeRole: (userId: string, newRole: string) => void
  onDelete: (userId: string) => void
}

function UsersPanel({ users, onChangeRole, onDelete }: UsersPanelProps) {
  const { t } = useTranslation()

  const safeUsers = Array.isArray(users) ? users : []

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { volunteer: 0, ngo: 0, admin: 0 }
    safeUsers.forEach((u) => {
      if (counts[u.role] !== undefined) counts[u.role]++
    })
    return counts
  }, [safeUsers])

  const renderTop = (
    <motion.div className="flex flex-gap-sm text-sm mb-md px-md" variants={itemVariants}>
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
  )

  const columns: ColumnDef<User>[] = [
    {
      id: 'user',
      header: t('admin.userHeader'),
      accessor: 'displayName',
      sortable: true,
      render: (_, u) => (
        <div>
          <div className="admin-user-name">{u.displayName || '\u2014'}</div>
          <div className="admin-user-email">{u.email || ''}</div>
        </div>
      ),
    },
    {
      id: 'role',
      header: t('admin.roleHeader'),
      accessor: 'role',
      sortable: true,
      filterable: true,
      render: (_, u) => (
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
      ),
    },
    {
      id: 'joined',
      header: t('admin.joinedHeader'),
      accessor: (u) => u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '\u2014',
      sortable: true,
    },
    {
      id: 'actions',
      header: t('admin.actionsHeader'),
      accessor: () => '',
      width: '100px',
      render: (_, u) => (
        <button
          onClick={() => onDelete(u._id)}
          className="admin-action-btn btn-danger"
          aria-label={`${t('admin.delete')} ${u.displayName || u.email || u._id}`}
        >
          <Trash2 size={14} /> {t('admin.delete')}
        </button>
      ),
    },
  ]

  return (
    <section aria-label={t('admin.userManagementLabel')}>
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <DataTable
          columns={columns}
          data={safeUsers}
          keyExtractor={(u) => u._id}
          searchable
          searchPlaceholder={t('admin.searchUsers')}
          sortable
          filterable
          exportable
          columnVisibility
          stickyHeader
          emptyTitle={t('admin.noUsers')}
          emptyDescription={t('admin.noUsersDesc')}
          renderTop={renderTop}
        />
      </motion.div>
    </section>
  )
}

interface RequestsPanelProps {
  requests: Request[]
  onDelete: (requestId: string) => void
}

function RequestsPanel({ requests, onDelete }: RequestsPanelProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const safeRequests = Array.isArray(requests) ? requests : []

  const columns: ColumnDef<Request>[] = [
    {
      id: 'request',
      header: t('admin.requestHeader'),
      accessor: 'title',
      sortable: true,
      render: (_, r) => (
        <div>
          <div className="admin-request-title">{r.title}</div>
          <div className="admin-request-location">{r.locationName || t('admin.noLocation')}</div>
        </div>
      ),
    },
    {
      id: 'status',
      header: t('admin.statusHeader'),
      accessor: 'status',
      sortable: true,
      filterable: true,
      render: (_, r) => (
        <Badge
          label={t(`statuses.${r.status || 'Open'}`)}
          colors={STATUS_COLORS}
          colorKey={r.status || 'Open'}
        />
      ),
    },
    {
      id: 'priority',
      header: t('admin.priorityHeader'),
      accessor: 'priority',
      sortable: true,
      filterable: true,
      render: (_, r) => (
        <Badge
          label={t(`priorities.${r.priority || 'Medium'}`)}
          colors={PRIORITY_COLORS}
          colorKey={r.priority || 'Medium'}
        />
      ),
    },
    {
      id: 'category',
      header: t('admin.categoryHeader'),
      accessor: 'category',
      sortable: true,
      filterable: true,
      render: (_, r) => (
        <span className="govt-badge govt-badge-blue">{t(`categories.${r.category || 'Other'}`)}</span>
      ),
    },
    {
      id: 'postedBy',
      header: t('admin.postedByHeader'),
      accessor: (r) => r.createdBy?.displayName || r.createdBy?.email || '',
      sortable: true,
      render: (_, r) => (
        <span className="small">{r.createdBy?.displayName || r.createdBy?.email || t('dashboard.unknown')}</span>
      ),
    },
    {
      id: 'actions',
      header: t('admin.actionsHeader'),
      accessor: () => '',
      width: '100px',
      render: (_, r) => (
        <button
          onClick={() => onDelete(r._id)}
          className="admin-action-btn btn-danger"
          aria-label={`${t('admin.delete')} ${r.title || r._id}`}
        >
          <Trash2 size={14} /> {t('admin.delete')}
        </button>
      ),
    },
  ]

  return (
    <section aria-label={t('admin.requestManagementLabel')}>
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <DataTable
          columns={columns}
          data={safeRequests}
          keyExtractor={(r) => r._id}
          searchable
          searchPlaceholder={t('admin.searchRequests')}
          sortable
          filterable
          exportable
          columnVisibility
          stickyHeader
          emptyTitle={t('admin.noRequests')}
          onRowClick={(r) => navigate(`/requests/${r._id}`)}
        />
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
      setError(getErrorMessage(e) || t('admin.loadFailed'))
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
      toast.error(getErrorMessage(e) || t('admin.updateRoleFailed'))
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
      toast.error(getErrorMessage(e) || t('admin.deleteUserFailed'))
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
      toast.error(getErrorMessage(e) || t('admin.deleteRequestFailed'))
    }
  }, [toast, t])

  async function handleExport(format: string) {
    try {
      if (format === 'csv') {
        await clientApi.adminExportRequests('csv')
        toast.success(t('admin.exportSuccess') || 'Export downloaded successfully')
      } else {
        const resp = await clientApi.adminExportRequests('json') as unknown as { items?: Record<string, unknown>[]; total?: number }
        const data = resp?.items || resp || []
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'requests-export.json'
        a.click()
        URL.revokeObjectURL(url)
        toast.success(t('admin.exportSuccess') || 'Export downloaded successfully')
      }
    } catch (e) {
      toast.error(getErrorMessage(e) || t('admin.exportFailed'))
    }
  }

  const tabs = [
    { id: 'stats', label: t('admin.tabOverview') },
    { id: 'users', label: t('admin.tabUsers'), count: users.length },
    { id: 'requests', label: t('admin.tabRequests'), count: requests.length },
  ]

  return (
    <PageTransition>
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
              className="btn-success btn-sm"
              aria-label={t('common.exportCSV')}
            >
              <Download size={14} /> {t('common.exportCSV')}
            </button>
          </div>
        }
      />

      {error && (
        <motion.div className="mb-md" variants={fadeUp} initial="hidden" animate="visible">
          <ErrorState message={error} onRetry={loadData} />
        </motion.div>
      )}

      <motion.div className="card mb-xl" variants={fadeUp} initial="hidden" animate="visible">
          <nav aria-label={t('admin.title')}>
          <div className="flex flex-gap-xs overflow-x-auto border-bottom" role="tablist">
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
          animate="visible"
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
    </PageTransition>
  )
}
