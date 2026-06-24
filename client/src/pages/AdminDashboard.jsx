import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { registerRefreshListener } from '../hooks/useSocket'
import { useToast } from '../components/Toast'

const STATUS_COLORS = {
  Open: { bg: 'rgba(74,128,192,.1)', border: 'rgba(74,128,192,.25)', text: 'var(--color-open)' },
  'In Progress': { bg: 'rgba(218,157,66,.1)', border: 'rgba(218,157,66,.25)', text: 'var(--color-progress)' },
  Resolved: { bg: 'rgba(63,185,80,.1)', border: 'rgba(63,185,80,.25)', text: 'var(--color-resolved)' },
  Fulfilled: { bg: 'rgba(52,211,153,.1)', border: 'rgba(52,211,153,.25)', text: 'var(--color-fulfilled)' },
}

const PRIORITY_COLORS = {
  Critical: { bg: 'rgba(248,81,73,.1)', border: 'rgba(248,81,73,.25)', text: 'var(--color-critical)' },
  High: { bg: 'rgba(218,157,66,.1)', border: 'rgba(218,157,66,.25)', text: 'var(--color-high)' },
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
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 60, marginTop: 8 }}>
      {safeData.map((d, idx) => {
        const count = typeof d.count === 'number' ? d.count : 0
        return (
          <div key={d.date || idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
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
            {idx % 5 === 0 && <span style={{ fontSize: 9, color: 'var(--gov-muted)' }}>{d.date?.slice(5)}</span>}
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
            <span style={{ fontWeight: 500 }}>{t(`statuses.${key}`) || t(`categories.${key}`) || t(`priorities.${key}`) || key || 'Unknown'}</span>
            <div className="admin-breakdown-bar">
              <div className="admin-breakdown-bar-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span style={{ fontWeight: 700, color, minWidth: 40, textAlign: 'right' }}>{numCount}</span>
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
    { label: t('admin.totalUsers'), value: safeStats.totalUsers || 0, bg: 'rgba(74,128,192,0.08)', color: 'var(--color-open)' },
    { label: t('admin.totalRequests'), value: safeStats.totalRequests || 0, bg: 'rgba(107,127,181,0.08)', color: 'var(--accent-indigo)' },
    { label: t('admin.openRequests'), value: byStatus.Open || 0, bg: 'rgba(74,128,192,0.08)', color: 'var(--color-open)' },
    {
      label: t('admin.resolved'),
      value: (byStatus.Resolved || 0) + (byStatus.Fulfilled || 0),
      bg: 'rgba(63,185,80,0.08)',
      color: 'var(--color-resolved)',
    },
  ]

  return (
    <div className="card">
      <h3 style={{ margin: 0, fontSize: 15, color: 'var(--gov-blue)', fontWeight: 700 }}>{t('admin.platformOverview')}</h3>

      <div className="admin-stats-grid">
        {summaryCards.map((c) => (
          <div key={c.label} className="admin-stat-card">
            <div className="admin-stat-info">
              <div className="admin-stat-value" style={{ color: c.color }}>{c.value}</div>
              <div className="admin-stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {stats.dailyRequests?.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gov-blue)', marginBottom: 4 }}>Requests Over Time</div>
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
    <div className="card">
      <div className="admin-toolbar">
        <input
          type="text"
          className="admin-search"
          placeholder={t('admin.searchUsers')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--gov-muted)' }}>
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
        <div className="admin-table-wrapper" style={{ border: 'none', borderRadius: 0, marginTop: 12 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.userHeader')}</th>
                <th>{t('admin.roleHeader')}</th>
                <th>{t('admin.joinedHeader')}</th>
                <th style={{ textAlign: 'right' }}>{t('admin.actionsHeader')}</th>
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
                  <td style={{ textAlign: 'right' }}>
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
    </div>
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
    <div className="card">
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {filterOptions.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={`filter-pill ${filterStatus === f.key ? 'active' : ''}`}
          >
            {f.label} ({statusCounts[f.key] || 0})
          </button>
        ))}
      </div>

      <div className="admin-toolbar" style={{ marginTop: 0 }}>
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
        <div className="admin-table-wrapper" style={{ border: 'none', borderRadius: 0, marginTop: 12 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.requestHeader')}</th>
                <th>{t('admin.statusHeader')}</th>
                <th>{t('admin.priorityHeader')}</th>
                <th>{t('admin.categoryHeader')}</th>
                <th>{t('admin.postedByHeader')}</th>
                <th style={{ textAlign: 'right' }}>{t('admin.actionsHeader')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/requests/${r._id}`)}>
                  <td style={{ maxWidth: 280 }}>
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
                  <td style={{ textAlign: 'right' }}>
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
    </div>
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

  const deleteUser = useCallback(async (userId) => {
    if (!confirm(t('admin.deleteUserConfirm'))) return
    try {
      await clientApi.adminDeleteUser(userId)
      setUsers((prev) => prev.filter((u) => u._id !== userId))
      toast.success(t('admin.userDeleted'))
    } catch (e) {
      toast.error(e.message || 'Failed to delete user')
    }
  }, [toast, t])

  const deleteRequest = useCallback(async (requestId) => {
    if (!confirm(t('admin.deleteRequestConfirm'))) return
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
      .catch(() => {})
  }

  const tabs = [
    { id: 'stats', label: t('admin.tabOverview') },
    { id: 'users', label: t('admin.tabUsers'), count: users.length },
    { id: 'requests', label: t('admin.tabRequests'), count: requests.length },
  ]

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="headerRow">
          <div>
            <h2 className="pageTitle" style={{ fontSize: 22, margin: 0 }}>{t('admin.title')}</h2>
            <div className="small muted" style={{ marginTop: 4 }}>{t('admin.subtitle')}</div>
          </div>
          <div className="btnRow">
            <button onClick={() => navigate('/dashboard')}>{t('admin.backToDashboard')}</button>
            <button onClick={() => handleExport('csv')} style={{ color: 'var(--accent-green)', borderColor: 'rgba(63,185,80,0.3)' }}>Export CSV</button>
          </div>
        </div>

        {error && <div className="errorText" style={{ marginTop: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 4, marginTop: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 20px',
                borderRadius: '10px 10px 0 0',
                fontSize: 13,
                fontWeight: 600,
                border: '1px solid transparent',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
                marginBottom: activeTab === tab.id ? -1 : 0,
                background: activeTab === tab.id ? 'rgba(74,128,192,0.06)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent-blue)' : 'var(--gov-muted)',
                transition: 'all 0.2s',
                boxShadow: activeTab === tab.id ? '0 0 12px rgba(74,128,192,0.1)' : 'none',
              }}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  style={{
                    marginLeft: 6,
                    background: activeTab === tab.id ? 'rgba(74,128,192,0.15)' : 'rgba(255,255,255,0.06)',
                    color: activeTab === tab.id ? 'var(--accent-blue)' : 'var(--gov-muted)',
                    borderRadius: 10,
                    padding: '2px 8px',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card">
          <div className="admin-loading">
            <div className="admin-spinner" />
            {t('admin.loadingData')}
          </div>
        </div>
      ) : activeTab === 'stats' ? (
        <StatsPanel stats={stats} />
      ) : activeTab === 'users' ? (
        <UsersPanel users={users} onChangeRole={changeRole} onDelete={deleteUser} />
      ) : (
        <RequestsPanel requests={requests} onDelete={deleteRequest} />
      )}
    </div>
  )
}
