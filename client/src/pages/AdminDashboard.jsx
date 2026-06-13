import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientApi } from '../api/client'

const STATUS_COLORS = {
  'Open': { bg: 'rgba(0,0,128,.1)', border: 'rgba(0,0,128,.3)', text: '#000080' },
  'In Progress': { bg: 'rgba(255,153,51,.12)', border: 'rgba(255,153,51,.35)', text: '#cc7a00' },
  'Resolved': { bg: 'rgba(19,136,8,.1)', border: 'rgba(19,136,8,.3)', text: '#138808' },
  'Fulfilled': { bg: 'rgba(19,136,8,.15)', border: 'rgba(19,136,8,.4)', text: '#0d6e06' },
}

const PRIORITY_COLORS = {
  'Critical': { bg: 'rgba(204,0,0,.1)', border: 'rgba(204,0,0,.3)', text: '#cc0000' },
  'High': { bg: 'rgba(204,102,0,.1)', border: 'rgba(204,102,0,.3)', text: '#cc6600' },
  'Medium': { bg: 'rgba(255,153,51,.12)', border: 'rgba(255,153,51,.35)', text: '#cc7a00' },
  'Low': { bg: 'rgba(19,136,8,.1)', border: 'rgba(19,136,8,.3)', text: '#138808' },
}

const CATEGORY_ICONS = {
  'Medical': '🏥', 'Food': '🍲', 'Shelter': '🏠', 'Water': '💧',
  'Rescue': '🚒', 'Supplies': '📦', 'Other': '📌',
}

const BREAKDOWN_COLORS = ['#000080', '#FF9933', '#138808', '#cc0000', '#1a1a9e', '#cc6600']

function Badge({ label, colors }) {
  const c = colors[label] || colors['Medium']
  return (
    <span className="govt-badge" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {label}
    </span>
  )
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`admin-toast admin-toast-${type}`}>
      {message}
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

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [s, u, r] = await Promise.all([
        clientApi.adminStats(),
        clientApi.adminUsers(),
        clientApi.getRequests(),
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

  useEffect(() => { loadData() }, [])

  function showToast(message, type = 'success') {
    setToast({ message, type })
  }

  async function changeRole(userId, newRole) {
    try {
      await clientApi.adminUpdateUserRole(userId, newRole)
      setUsers((prev) => prev.map((u) => u._id === userId ? { ...u, role: newRole } : u))
      showToast('Role updated successfully')
    } catch (e) {
      showToast(e.message || 'Failed to update role', 'error')
    }
  }

  async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return
    try {
      await clientApi.adminDeleteUser(userId)
      setUsers((prev) => prev.filter((u) => u._id !== userId))
      showToast('User deleted successfully')
    } catch (e) {
      showToast(e.message || 'Failed to delete user', 'error')
    }
  }

  async function deleteRequest(requestId) {
    if (!confirm('Are you sure you want to delete this relief request? This action cannot be undone.')) return
    try {
      await clientApi.adminDeleteRequest(requestId)
      setRequests((prev) => prev.filter((r) => r._id !== requestId))
      showToast('Request deleted successfully')
    } catch (e) {
      showToast(e.message || 'Failed to delete request', 'error')
    }
  }

  const tabs = [
    { id: 'stats', label: 'Overview', icon: '📊' },
    { id: 'users', label: 'Users', icon: '👥', count: users.length },
    { id: 'requests', label: 'Requests', icon: '📋', count: requests.length },
  ]

  return (
    <div className="container" style={{ maxWidth: 1100 }}>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="headerRow">
          <div>
            <h2 className="pageTitle" style={{ fontSize: 22, margin: 0 }}>Admin Dashboard</h2>
            <div className="small muted" style={{ marginTop: 4 }}>
              Manage users, requests, and view platform statistics
            </div>
          </div>
          <div className="btnRow">
            <button onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
          </div>
        </div>

        {error ? <div className="errorText" style={{ marginTop: 12 }}>{error}</div> : null}

        <div style={{ display: 'flex', gap: 4, marginTop: 16, borderBottom: '2px solid var(--gov-border)', paddingBottom: 0 }}>
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
              {tab.icon} {tab.label}
              {tab.count !== undefined && (
                <span style={{
                  marginLeft: 6,
                  background: activeTab === tab.id ? 'var(--gov-blue)' : 'var(--gov-border)',
                  color: activeTab === tab.id ? '#fff' : 'var(--gov-text)',
                  borderRadius: 10,
                  padding: '1px 7px',
                  fontSize: 11,
                  fontWeight: 700,
                }}>
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
            Loading admin data...
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

function StatsPanel({ stats }) {
  if (!stats) return null

  const totalAll = stats.byStatus ? Object.values(stats.byStatus).reduce((a, b) => a + b, 0) : 0

  const summaryCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: '👥', bg: 'rgba(0,0,128,0.08)', color: '#000080' },
    { label: 'Total Requests', value: stats.totalRequests, icon: '📋', bg: 'rgba(255,153,51,0.12)', color: '#cc7a00' },
    { label: 'Open Requests', value: stats.byStatus?.['Open'] || 0, icon: '🔓', bg: 'rgba(0,0,128,0.08)', color: '#000080' },
    { label: 'Resolved', value: (stats.byStatus?.['Resolved'] || 0) + (stats.byStatus?.['Fulfilled'] || 0), icon: '✅', bg: 'rgba(19,136,8,0.1)', color: '#138808' },
  ]

  return (
    <div className="card">
      <h3 style={{ margin: 0, fontSize: 15, color: 'var(--gov-blue)', fontWeight: 700 }}>Platform Overview</h3>

      <div className="admin-stats-grid">
        {summaryCards.map((c) => (
          <div key={c.label} className="admin-stat-card">
            <div className="admin-stat-icon" style={{ background: c.bg, color: c.color }}>
              {c.icon}
            </div>
            <div className="admin-stat-info">
              <div className="admin-stat-value" style={{ color: c.color }}>{c.value}</div>
              <div className="admin-stat-label">{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-breakdown-grid">
        <BreakdownCard title="By Status" data={stats.byStatus} total={totalAll} />
        <BreakdownCard title="By Category" data={stats.byCategory} total={stats.totalRequests} />
        <BreakdownCard title="By Priority" data={stats.byPriority} total={stats.totalRequests} />
      </div>
    </div>
  )
}

function BreakdownCard({ title, data, total }) {
  if (!data || Object.keys(data).length === 0) return null

  return (
    <div className="admin-breakdown-card">
      <div className="admin-breakdown-header">{title}</div>
      {Object.entries(data).map(([key, count], i) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        const color = BREAKDOWN_COLORS[i % BREAKDOWN_COLORS.length]
        return (
          <div key={key} className="admin-breakdown-row">
            <span style={{ fontWeight: 500 }}>{key || 'Unknown'}</span>
            <div className="admin-breakdown-bar">
              <div
                className="admin-breakdown-bar-fill"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
            <span style={{ fontWeight: 700, color, minWidth: 40, textAlign: 'right' }}>
              {count}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function UsersPanel({ users, onChangeRole, onDelete }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return users
    return users.filter((u) =>
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    )
  }, [users, search])

  const roleCounts = useMemo(() => {
    const counts = { volunteer: 0, ngo: 0, admin: 0 }
    users.forEach((u) => { if (counts[u.role] !== undefined) counts[u.role]++ })
    return counts
  }, [users])

  return (
    <div className="card">
      <div className="admin-toolbar">
        <input
          type="text"
          className="admin-search"
          placeholder="Search by name, email, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--gov-muted)' }}>
          <span className="govt-badge govt-badge-blue">{roleCounts.volunteer} Volunteer{roleCounts.volunteer !== 1 ? 's' : ''}</span>
          <span className="govt-badge govt-badge-saffron">{roleCounts.ngo} NGO{roleCounts.ngo !== 1 ? 's' : ''}</span>
          <span className="govt-badge govt-badge-green">{roleCounts.admin} Admin{roleCounts.admin !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">🔍</div>
          <div>{search ? 'No users match your search' : 'No users found'}</div>
        </div>
      ) : (
        <div className="admin-table-wrapper" style={{ border: 'none', borderRadius: 0, marginTop: 12 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Joined</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
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
                    <select
                      value={u.role}
                      onChange={(e) => onChangeRole(u._id, e.target.value)}
                      className="admin-role-select"
                    >
                      <option value="volunteer">Volunteer</option>
                      <option value="ngo">NGO</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <span className="small">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => onDelete(u._id)}
                      className="admin-action-btn btnDanger"
                    >
                      Delete
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

  const filtered = useMemo(() => {
    let items = requests
    if (filterStatus !== 'All') {
      items = items.filter((r) => r.status === filterStatus)
    }
    const q = search.toLowerCase().trim()
    if (q) {
      items = items.filter((r) =>
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
    requests.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1 })
    return counts
  }, [requests])

  return (
    <div className="card">
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {['All', 'Open', 'In Progress', 'Resolved', 'Fulfilled'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`filter-pill ${filterStatus === s ? 'active' : ''}`}
          >
            {s} ({statusCounts[s] || 0})
          </button>
        ))}
      </div>

      <div className="admin-toolbar" style={{ marginTop: 0 }}>
        <input
          type="text"
          className="admin-search"
          placeholder="Search by title, category, location, or poster..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">📋</div>
          <div>{search || filterStatus !== 'All' ? 'No requests match your filters' : 'No requests found'}</div>
        </div>
      ) : (
        <div className="admin-table-wrapper" style={{ border: 'none', borderRadius: 0, marginTop: 12 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Category</th>
                <th>Posted By</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r._id}>
                  <td style={{ maxWidth: 280 }}>
                    <div className="admin-request-title">{r.title}</div>
                    <div className="admin-request-location">
                      📍 {r.locationName || 'No location'}
                    </div>
                  </td>
                  <td><Badge label={r.status || 'Open'} colors={STATUS_COLORS} /></td>
                  <td><Badge label={r.priority || 'Medium'} colors={PRIORITY_COLORS} /></td>
                  <td>
                    <span className="govt-badge govt-badge-blue">
                      {CATEGORY_ICONS[r.category] || '📌'} {r.category || 'Other'}
                    </span>
                  </td>
                  <td>
                    <span className="small">
                      {r.createdBy?.displayName || r.createdBy?.email || 'Unknown'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => onDelete(r._id)}
                      className="admin-action-btn btnDanger"
                    >
                      Delete
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
