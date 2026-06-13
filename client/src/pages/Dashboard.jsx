import { useEffect, useState } from 'react'
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

function Badge({ label, colors }) {
  const c = colors[label] || colors['Medium']
  return (
    <span className="govt-badge" style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
    }}>
      {label}
    </span>
  )
}

export default function Dashboard() {
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('All')
  const navigate = useNavigate()

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await clientApi.getRequests()
      setItems(data.items || [])
    } catch (e) {
      setError(e.message || 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  })()

  const filtered = filterStatus === 'All' ? items : items.filter((it) => it.status === filterStatus)

  return (
    <div className="container">
      <div className="card">
        <div className="headerRow">
          <div>
            <h2 className="pageTitle" style={{ fontSize: 20 }}>Disaster Relief Requests</h2>
            <div className="small" style={{ marginTop: 4 }}>
              {items.length} total requests | {items.filter(i => i.status === 'Open').length} open
            </div>
          </div>
          <div className="btnRow">
            {currentUser?.role === 'admin' && (
              <button onClick={() => navigate('/admin')} style={{ color: '#000080', borderColor: '#000080' }}>
                Admin
              </button>
            )}
            <button className="btnPrimary" onClick={() => navigate('/requests/new')}>
              + New Request
            </button>
          </div>
        </div>

        {error ? <div className="errorText">{error}</div> : null}

        <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
          {['All', 'Open', 'In Progress', 'Resolved', 'Fulfilled'].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`filter-pill ${filterStatus === s ? 'active' : ''}`}
            >
              {s} {s === 'All' ? `(${items.length})` : `(${items.filter((i) => i.status === s).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="small muted" style={{ marginTop: 16 }}>Loading requests...</div>
        ) : (
          <div className="gridGap" style={{ marginTop: 16 }}>
            {filtered.length === 0 ? (
              <div className="muted" style={{ textAlign: 'center', padding: 20 }}>No requests found.</div>
            ) : (
              filtered.map((it) => (
                <div key={it._id} className="listCard">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: '#000080' }}>{it.title}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        <Badge label={it.status || 'Open'} colors={STATUS_COLORS} />
                        <Badge label={it.priority || 'Medium'} colors={PRIORITY_COLORS} />
                        <span className="govt-badge govt-badge-blue">
                          {CATEGORY_ICONS[it.category] || '📌'} {it.category || 'Other'}
                        </span>
                      </div>
                      <div className="muted" style={{ marginTop: 8, fontSize: 13 }}>
                        {it.description}
                      </div>
                      <div className="small" style={{ marginTop: 8 }}>
                        📍 {it.locationName} ({Number(it.lat).toFixed(4)}, {Number(it.lng).toFixed(4)})
                      </div>
                      {it.createdBy && (
                        <div className="small" style={{ marginTop: 4 }}>
                          Posted by: {it.createdBy.displayName || it.createdBy.email || 'Unknown'}
                          {it.createdBy.role === 'admin' && (
                            <span style={{ color: '#000080', marginLeft: 4 }}>(Admin)</span>
                          )}
                        </div>
                      )}
                    </div>

                    <OwnerActions id={it._id} item={it} onChanged={load} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function OwnerActions({ id, item, onChanged }) {
  const navigate = useNavigate()
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null')
    } catch {
      return null
    }
  })()

  const [deleting, setDeleting] = useState(false)
  const isOwner = user?.id && item.createdBy && item.createdBy._id
    ? item.createdBy._id === user.id
    : user?.id && String(item.createdBy) === String(user.id)
  const canEdit = isOwner || user?.role === 'admin'

  async function del() {
    if (!confirm('Delete this request?')) return
    setDeleting(true)
    try {
      await clientApi.deleteRequest(id)
      onChanged()
    } catch (e) {
      alert(e.message || 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
      <button
        disabled={!canEdit}
        onClick={() => navigate(`/requests/${id}/edit`)}
        className="btnPrimary"
        style={{
          opacity: !canEdit ? 0.5 : 1,
          fontSize: 12, padding: '6px 12px',
        }}
      >
        Edit
      </button>
      <button
        disabled={!canEdit || deleting}
        onClick={() => del()}
        className="btnDanger"
        style={{ opacity: !canEdit ? 0.5 : 1, fontSize: 12, padding: '6px 12px' }}
      >
        {deleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  )
}
