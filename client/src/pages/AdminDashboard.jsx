import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { registerRefreshListener } from '../hooks/useSocket'

const STATUS_COLORS = {
  Open: { bg: 'rgba(0,0,128,.1)', border: 'rgba(0,0,128,.3)', text: '#000080' },
  'In Progress': { bg: 'rgba(255,153,51,.12)', border: 'rgba(255,153,51,.35)', text: '#cc7a00' },
  Resolved: { bg: 'rgba(19,136,8,.1)', border: 'rgba(19,136,8,.3)', text: '#138808' },
  Fulfilled: { bg: 'rgba(19,136,8,.15)', border: 'rgba(19,136,8,.4)', text: '#0d6e06' },
}

const PRIORITY_COLORS = {
  Critical: { bg: 'rgba(204,0,0,.1)', border: 'rgba(204,0,0,.3)', text: '#cc0000' },
  High: { bg: 'rgba(204,102,0,.1)', border: 'rgba(204,102,0,.3)', text: '#cc6600' },
  Medium: { bg: 'rgba(255,153,51,.12)', border: 'rgba(255,153,51,.35)', text: '#cc7a00' },
  Low: { bg: 'rgba(19,136,8,.1)', border: 'rgba(19,136,8,.3)', text: '#138808' },
}

const BREAKDOWN_COLORS = ['#000080', '#FF9933', '#138808', '#cc0000', '#1a1a9e', '#cc6600']

function Badge({ label, colors, colorKey }) {
  const c = colors[colorKey || label] || { bg: 'rgba(128,128,128,.1)', border: 'rgba(128,128,128,.3)', text: '#666' }
  return (
    <span className="govt-badge" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {label}
    </span>
  )
}

function Toast({ message, type, onClose }) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const t = setTimeout(() => onCloseRef.current(), 3000)
    return () => clearTimeout(t)
  }, [])

  return <div className={`admin-toast admin-toast-${type}`}>{message}</div>
}

function MiniBarChart({ data, maxVal }) {
  if (!data?.length) return null
  const max = maxVal || Math.max(...data.map((d) => d.count), 1)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 60, marginTop: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div
            style={{
              width: '100%',
              maxWidth: 20,
              height: `${Math.max((d.count / max) * 100, 4)}%`,
              background: BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length],
              borderRadius: 2,
            }}
            title={`${d.date}: ${d.count}`}
          />
          {i % 5 === 0 && <span style={{ fontSize: 9, color: 'var(--gov-muted)' }}>{d.date?.slice(5)}</span>}
        </div>
      ))}
    </div>
  )
}

function BreakdownCard({ title, data, total }) {
  const { t } = useTranslation()
  if (!data || Object.keys(data).length === 0) return null

  return (
    <div className="admin-breakdown-card">
      <div className="admin-breakdown-header">{title}</div>
      {Object.entries(data).map(([key, count], i) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        const color = BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length]
        return (
          <div key={key} className="admin-breakdown-row">
            <span style={{ fontWeight: 500 }}>{t(`statuses.${key}`) || t(`categories.${key}`) || t(`priorities.${key}`) || key || 'Unknown'}</span>
            <div className="admin-breakdown-bar">
              <div className="admin-breakdown-bar-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
            <span style={{ fontWeight: 700, color, minWidth: 40, textAlign: 'right' }}>{count}</span>
          </div>
        )
      })}
    </div>
  )
}

function StatsPanel({ stats }) {
  const { t } = useTranslation()
  if (!stats) return null

  const totalAll = stats.byStatus ? Object.values(stats.byStatus).reduce((a, b) => a + b, 0) : 0

  const summaryCards = [
    { label: t('admin.totalUsers'), value: stats.totalUsers, bg: 'rgba(0,0,128,0.08)', color: '#000080' },
    { label: t('admin.totalRequests'), value: stats.totalRequests, bg: 'rgba(255,153,51,0.12)', color: '#cc7a00' },
    { label: t('admin.openRequests'), value: stats.byStatus?.Open || 0, bg: 'rgba(0,0,128,0.08)', color: '#000080' },
    {
      label: t('admin.resolved'),
      value: (stats.byStatus?.Resolved || 0) + (stats.byStatus?.Fulfilled || 0),
      bg: 'rgba(19,136,8,0.1)',
      color: '#138808',
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return users
    return users.filter(
      (u) =>
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
    )
  }, [users, search])

  const roleCounts = useMemo(() => {
    const counts = { volunteer: 0, ngo: 0, admin: 0 }
    users.forEach((u) => {
      if (counts[u.role] !== undefined) counts[u.role]++
    })
    return counts
  }, [users])

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

  const filtered = useMemo(() => {
    let items = requests
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
  }, [requests, search, filterStatus])

  const statusCounts = useMemo(() => {
    const counts = { All: requests.length }
    requests.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1
    })
    return counts
  }, [requests])

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
  const [toast, setToast] = useState(null)
  const navigate = useNavigate()
  const { t } = useTranslation()

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [s, u, r] = await Promise.all([
        clientApi.adminStats(),
        clientApi.adminUsers(),
        clientApi.getRequests({ limit: 500 }),
      ])
      setStats(s)
      setUsers(u.users || [])
      setRequests(r.items || [])
    } catch (e) {
      setError(e.message || 'Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useAutoRefresh(loadData, { interval: 20000 })

  useEffect(() => {
    return registerRefreshListener(['request:created', 'request:updated', 'request:deleted', 'resource:created', 'resource:allocated'], loadData)
  }, [loadData])

  function showToast(message, type = 'success') {
    setToast({ message, type })
  }

  async function changeRole(userId, newRole) {
    try {
      await clientApi.adminUpdateUserRole(userId, newRole)
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)))
      showToast(t('admin.roleUpdated'))
    } catch (e) {
      showToast(e.message || 'Failed to update role', 'error')
    }
  }

  async function deleteUser(userId) {
    if (!confirm(t('admin.deleteUserConfirm'))) return
    try {
      await clientApi.adminDeleteUser(userId)
      setUsers((prev) => prev.filter((u) => u._id !== userId))
      showToast(t('admin.userDeleted'))
    } catch (e) {
      showToast(e.message || 'Failed to delete user', 'error')
    }
  }

  async function deleteRequest(requestId) {
    if (!confirm(t('admin.deleteRequestConfirm'))) return
    try {
      await clientApi.adminDeleteRequest(requestId)
      setRequests((prev) => prev.filter((r) => r._id !== requestId))
      showToast(t('admin.requestDeleted'))
    } catch (e) {
      showToast(e.message || 'Failed to delete request', 'error')
    }
  }

  function handleExport(format) {
    const token = localStorage.getItem('token')
    const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30000)

    fetch(`${API_BASE}/api/admin/export/requests?format=${format}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((res) => {
        clearTimeout(timer)
        if (!res.ok) throw new Error('Export failed')
        return res.blob()
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = format === 'csv' ? 'requests-export.csv' : 'requests-export.json'
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch((err) => {
        clearTimeout(timer)
        if (err.name !== 'AbortError') console.error('[export] error:', err.message)
      })
  }

  const tabs = [
    { id: 'stats', label: t('admin.tabOverview') },
    { id: 'users', label: t('admin.tabUsers'), count: users.length },
    { id: 'requests', label: t('admin.tabRequests'), count: requests.length },
  ]

  return (
    <div className="container">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="headerRow">
          <div>
            <h2 className="pageTitle" style={{ fontSize: 22, margin: 0 }}>{t('admin.title')}</h2>
            <div className="small muted" style={{ marginTop: 4 }}>{t('admin.subtitle')}</div>
          </div>
          <div className="btnRow">
            <button onClick={() => navigate('/dashboard')}>{t('admin.backToDashboard')}</button>
            <button onClick={() => handleExport('csv')} style={{ color: '#138808', borderColor: '#138808' }}>Export CSV</button>
          </div>
        </div>

        {error && <div className="errorText" style={{ marginTop: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 4, marginTop: 16, borderBottom: '2px solid var(--gov-border)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 18px',
                borderRadius: '6px 6px 0 0',
                fontSize: 13,
                fontWeight: 600,
                border: '1px solid transparent',
                borderBottom: activeTab === tab.id ? '2px solid var(--gov-blue)' : '2px solid transparent',
                marginBottom: activeTab === tab.id ? -2 : 0,
                background: activeTab === tab.id ? 'rgba(0,0,128,0.04)' : 'transparent',
                color: activeTab === tab.id ? 'var(--gov-blue)' : 'var(--gov-muted)',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  style={{
                    marginLeft: 6,
                    background: activeTab === tab.id ? 'var(--gov-blue)' : 'var(--gov-border)',
                    color: activeTab === tab.id ? '#fff' : 'var(--gov-text)',
                    borderRadius: 10,
                    padding: '1px 7px',
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
