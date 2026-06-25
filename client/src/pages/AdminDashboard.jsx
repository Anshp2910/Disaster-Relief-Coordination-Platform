import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { registerRefreshListener } from '../hooks/useSocket'
import { useToast } from '../components/Toast'
import { SkeletonList } from '../components/Skeleton'
import { useConfirm } from '../hooks/useConfirm'

const STATUS_COLORS = {
  Open: { bg: 'var(--accent-soft)', border: 'rgba(59,130,246,0.25)', text: 'var(--color-open)' },
  'In Progress': { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', text: 'var(--color-progress)' },
  Resolved: { bg: 'var(--success-soft)', border: 'rgba(34,197,94,0.25)', text: 'var(--color-resolved)' },
  Fulfilled: { bg: 'rgba(52,211,153,.1)', border: 'rgba(52,211,153,.25)', text: 'var(--color-fulfilled)' },
}

const PRIORITY_COLORS = {
  Critical: { bg: 'var(--danger-soft)', border: 'rgba(239,68,68,0.25)', text: 'var(--color-critical)' },
  High: { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', text: 'var(--color-high)' },
  Medium: { bg: 'rgba(234,179,8,.1)', border: 'rgba(234,179,8,.25)', text: 'var(--color-medium)' },
  Low: { bg: 'rgba(34,197,94,.1)', border: 'rgba(34,197,94,.25)', text: 'var(--color-low)' },
}

const BREAKDOWN_COLORS = ['var(--color-open)', 'var(--accent-indigo)', 'var(--color-resolved)', 'var(--color-critical)', 'var(--accent-purple)', 'var(--color-high)']

function Badge({ label, colors, colorKey }) {
  const c = colors[colorKey || label] || { bg: 'rgba(128,128,128,.1)', border: 'rgba(128,128,128,.3)', text: 'var(--gov-muted)' }
  return (
    <span className="govt-badge" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {label}
    </span>
  )
}

function MiniBarChart({ data, maxVal }) {
  const safeData = Array.isArray(data) ? data : []
  if (!safeData.length) return null
  const max = maxVal || Math.max(...safeData.map((d) => typeof d.count === 'number' ? d.count : 0), 1)

  return (
    <div className="flex mt-sm items-end gap-2 h-60">
      {safeData.map((d, idx) => {
        const count = typeof d.count === 'number' ? d.count : 0
        return (
          <div key={d.date || idx} className="flex-1 flex flex-col items-center gap-2">
            <div
              style={{
                width: '100%',
                maxWidth: 20,
                height: `${Math.max((count / max) * 100, 4)}%`,
                background: BREAKDOWN_COLORS[idx % BREAKDOWN_COLORS.length],
                borderRadius: 2,
              }}
              title={`${d.date}: ${count}`}
            />
            {idx % 5 === 0 && <span className="text-muted text-9">{d.date?.slice(5)}</span>}
          </div>
        )
      })}
    </div>
  )
}

function BreakdownCard({ title, data, total }) {
  const { t } = useTranslation()
  const safeData = data || {}
  const safeTotal = total || 0
  if (Object.keys(safeData).length === 0) return null

  return (
    <div className="admin-breakdown-card">
      <div className="admin-breakdown-header">{title}</div>
      {Object.entries(safeData).map(([key, count], i) => {
        const numCount = typeof count === 'number' ? count : 0
        const pct = safeTotal > 0 ? Math.round((numCount / safeTotal) * 100) : 0
        const color = BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length]
        return (
          <div key={key} className="admin-breakdown-row">
            <span className="text-medium">{t(`statuses.${key}`) || t(`categories.${key}`) || t(`priorities.${key}`) || key || 'Unknown'}</span>
            <div className="admin-breakdown-bar">
              <div className="admin-breakdown-bar-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span className="text-bold min-w-40 text-right" style={{ color }}>{numCount}</span>
          </div>
        )
      })}
    </div>
  )
}

function StatsPanel({ stats }) {
  const { t } = useTranslation()
  if (!stats) return null

  const safeStats = stats || {}
  const byStatus = safeStats.byStatus || {}
  const totalAll = Object.values(byStatus).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0)

  const summaryCards = [
    { label: t('admin.totalUsers'), value: safeStats.totalUsers || 0, bg: 'rgba(59,130,246,0.08)', color: 'var(--color-open)' },
    { label: t('admin.totalRequests'), value: safeStats.totalRequests || 0, bg: 'rgba(129,140,248,0.08)', color: 'var(--accent-indigo)' },
    { label: t('admin.openRequests'), value: byStatus.Open || 0, bg: 'rgba(59,130,246,0.08)', color: 'var(--color-open)' },
    {
      label: t('admin.resolved'),
      value: (byStatus.Resolved || 0) + (byStatus.Fulfilled || 0),
      bg: 'rgba(34,197,94,0.08)',
      color: 'var(--color-resolved)',
    },
  ]

  return (
    <div className="card">
      <h3 className="m-0 text-bold text-accent-blue text-15">{t('admin.platformOverview')}</h3>

      <section aria-label="Statistics"><div className="admin-stats-grid">
        {summaryCards.map((c) => (
          <div key={c.label} className="admin-stat-card">
            <div className="admin-stat-info">
              <div className="admin-stat-value" style={{ color: c.color }}>{c.value}</div>
              <div className="admin-stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div></section>

      {stats.dailyRequests?.length > 0 && (
        <div className="mt-xl">
            <div className="text-semi mb-xs text-accent-blue text-13">{t('admin.requestsOverTime')}</div>
          <MiniBarChart data={stats.dailyRequests} />
        </div>
      )}

      <div className="admin-breakdown-grid">
        <BreakdownCard title={t('admin.byStatus')} data={stats.byStatus} total={totalAll} />
        <BreakdownCard title={t('admin.byCategory')} data={stats.byCategory} total={stats.totalRequests} />
        <BreakdownCard title={t('admin.byPriority')} data={stats.byPriority} total={stats.totalRequests} />
      </div>
    </div>
  )
}

function UsersPanel({ users, onChangeRole, onDelete }) {
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
    const counts = { volunteer: 0, ngo: 0, admin: 0 }
    safeUsers.forEach((u) => {
      if (counts[u.role] !== undefined) counts[u.role]++
    })
    return counts
  }, [safeUsers])

  return (
    <section aria-label="User Management"><div className="card">
      <div className="admin-toolbar">
        <input
          type="text"
          className="admin-search"
          placeholder={t('admin.searchUsers')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-gap-sm text-sm text-muted">
          <span className="govt-badge govt-badge-blue">
            {roleCounts.volunteer} {t('auth.volunteer')}{roleCounts.volunteer !== 1 ? 's' : ''}
          </span>
          <span className="govt-badge govt-badge-saffron">
            {roleCounts.ngo} {t('auth.ngo')}{roleCounts.ngo !== 1 ? 's' : ''}
          </span>
          <span className="govt-badge govt-badge-green">
            {roleCounts.admin} {t('nav.admin')}{roleCounts.admin !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty">
          <div>{search ? t('admin.noUsersMatch') : t('admin.noUsers')}</div>
        </div>
      ) : (
        <div className="admin-table-wrapper border-none mt-md">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.userHeader')}</th>
                <th>{t('admin.roleHeader')}</th>
                <th>{t('admin.joinedHeader')}</th>
                <th className="text-right">{t('admin.actionsHeader')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u._id}>
                  <td>
                    <div className="admin-user-name">{u.displayName}</div>
                    <div className="admin-user-email">{u.email}</div>
                  </td>
                  <td>
                    <select value={u.role} onChange={(e) => onChangeRole(u._id, e.target.value)} className="admin-role-select">
                      <option value="volunteer">{t('auth.volunteer')}</option>
                      <option value="ngo">{t('auth.ngo')}</option>
                      <option value="admin">{t('nav.admin')}</option>
                    </select>
                  </td>
                  <td>
                    <span className="small">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</span>
                  </td>
                  <td className="text-right">
                    <button onClick={() => onDelete(u._id)} className="admin-action-btn btnDanger">
                      {t('admin.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div></section>
  )
}

function RequestsPanel({ requests, onDelete }) {
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
    const counts = { All: safeRequests.length }
    safeRequests.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1
    })
    return counts
  }, [safeRequests])

  const filterOptions = [
    { key: 'All', label: t('dashboard.filterAll') },
    { key: 'Open', label: t('statuses.Open') },
    { key: 'Pending', label: t('statuses.Pending') },
    { key: 'In Progress', label: t('statuses.In Progress') },
    { key: 'Resolved', label: t('statuses.Resolved') },
    { key: 'Fulfilled', label: t('statuses.Fulfilled') },
  ]

  return (
    <section aria-label="Request Management"><div className="card">
      <div className="flex flex-gap-sm flex-wrap mb-md">
        {filterOptions.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`filter-pill ${filterStatus === f.key ? 'active' : ''}`}
            aria-label={f.label}
          >
            {f.label} ({statusCounts[f.key] || 0})
          </button>
        ))}
      </div>

      <div className="admin-toolbar mt-0">
        <input
          type="text"
          className="admin-search"
          placeholder={t('admin.searchRequests')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty">
          <div>{search || filterStatus !== 'All' ? t('admin.noRequestsMatch') : t('admin.noRequests')}</div>
        </div>
      ) : (
        <div className="admin-table-wrapper border-none mt-md">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.requestHeader')}</th>
                <th>{t('admin.statusHeader')}</th>
                <th>{t('admin.priorityHeader')}</th>
                <th>{t('admin.categoryHeader')}</th>
                <th>{t('admin.postedByHeader')}</th>
                <th className="text-right">{t('admin.actionsHeader')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r._id} className="cursor-pointer" onClick={() => navigate(`/requests/${r._id}`)}>
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
                    >
                      {t('admin.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div></section>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [requests, setRequests] = useState([])
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
        clientApi.adminRequests({ limit: 100 }),
      ])
      setStats(s)
      setUsers(u.users || [])
      setRequests(r.items || [])
    } catch (e) {
      setError(e.message || 'Failed to load admin data')
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

  const changeRole = useCallback(async (userId, newRole) => {
    try {
      await clientApi.adminUpdateUserRole(userId, newRole)
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)))
      toast.success(t('admin.roleUpdated'))
    } catch (e) {
      toast.error(e.message || 'Failed to update role')
    }
  }, [toast, t])

  const delConfirm = useConfirm()

  const deleteUser = useCallback(async (userId) => {
    const ok = await delConfirm.confirm({ message: t('admin.deleteUserConfirm'), danger: true })
    if (!ok) return
    try {
      await clientApi.adminDeleteUser(userId)
      setUsers((prev) => prev.filter((u) => u._id !== userId))
      toast.success(t('admin.userDeleted'))
    } catch (e) {
      toast.error(e.message || 'Failed to delete user')
    }
  }, [toast, t])

  const deleteRequest = useCallback(async (requestId) => {
    const ok = await delConfirm.confirm({ message: t('admin.deleteRequestConfirm'), danger: true })
    if (!ok) return
    try {
      await clientApi.adminDeleteRequest(requestId)
      setRequests((prev) => prev.filter((r) => r._id !== requestId))
      toast.success(t('admin.requestDeleted'))
    } catch (e) {
      toast.error(e.message || 'Failed to delete request')
    }
  }, [toast, t])

  function handleExport(format) {
    clientApi.adminExportRequests(format)
      .then((data) => {
        if (format === 'csv') {
          const blob = new Blob([data], { type: 'text/csv' })
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
      .catch((e) => { toast?.error?.(e.message || 'Export failed') })
  }

  const tabs = [
    { id: 'stats', label: t('admin.tabOverview') },
    { id: 'users', label: t('admin.tabUsers'), count: users.length },
    { id: 'requests', label: t('admin.tabRequests'), count: requests.length },
  ]

  return (
    <div className="container">
      <div className="card mb-xl">
        <div className="headerRow">
          <div>
            <h2 className="pageTitle text-2xl m-0">{t('admin.title')}</h2>
            <div className="small muted mt-xs">{t('admin.subtitle')}</div>
          </div>
          <div className="btnRow">
            <button onClick={() => navigate('/dashboard')}>{t('admin.backToDashboard')}</button>
            <button onClick={() => handleExport('csv')} className="text-accent-green" style={{ borderColor: 'rgba(34,197,94,0.3)' }}>{t('common.exportCSV')}</button>
          </div>
        </div>

        {error && <div className="errorText mt-md">{error}</div>}

        <div className="flex flex-gap-xs mt-xl overflow-x-auto border-bottom" style={{ WebkitOverflowScrolling: 'touch' }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-semi tab-btn ${isActive ? 'active' : ''}`}
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
      </div>

      {loading ? (
        <div className="card">
          <SkeletonList count={6} lines={2} />
        </div>
      ) : activeTab === 'stats' ? (
        <StatsPanel stats={stats} />
      ) : activeTab === 'users' ? (
        <UsersPanel users={users} onChangeRole={changeRole} onDelete={deleteUser} />
      ) : (
        <RequestsPanel requests={requests} onDelete={deleteRequest} />
      )}
      {delConfirm.ConfirmDialog}
    </div>
  )
}
