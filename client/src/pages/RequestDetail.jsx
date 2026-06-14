import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001'

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

const RESOURCE_STATUS_COLORS = {
  Available: { bg: 'rgba(19,136,8,.1)', border: 'rgba(19,136,8,.3)', text: '#138808' },
  Low: { bg: 'rgba(255,153,51,.12)', border: 'rgba(255,153,51,.35)', text: '#cc7a00' },
  Depleted: { bg: 'rgba(204,0,0,.1)', border: 'rgba(204,0,0,.3)', text: '#cc0000' },
  Reserved: { bg: 'rgba(0,0,128,.1)', border: 'rgba(0,0,128,.3)', text: '#000080' },
}

function Badge({ label, colors, colorKey }) {
  const c = colors[colorKey || label] || colors['Medium']
  return (
    <span className="govt-badge" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {label}
    </span>
  )
}

export default function RequestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [comment, setComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [resources, setResources] = useState([])
  const [allocating, setAllocating] = useState(false)
  const [allocResource, setAllocResource] = useState('')
  const [allocQty, setAllocQty] = useState('')
  const fileRef = useRef()

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
  })()

  async function load() {
    try {
      const data = await clientApi.getRequest(id)
      setItem(data.item)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadResources() {
    try {
      const data = await clientApi.getResources({ status: 'Available', limit: 100 })
      setResources(data.items || [])
    } catch (e) {
      console.error('Failed to load resources')
    }
  }

  useEffect(() => { load(); loadResources() }, [id])

  async function handleClaim() {
    try {
      const data = await clientApi.claimRequest(id)
      setItem(data.item)
    } catch (e) {
      alert(e.message)
    }
  }

  async function handleUnclaim() {
    try {
      const data = await clientApi.unclaimRequest(id)
      setItem(data.item)
    } catch (e) {
      alert(e.message)
    }
  }

  async function handleComment(e) {
    e.preventDefault()
    if (!comment.trim()) return
    setPosting(true)
    try {
      const data = await clientApi.addComment(id, comment)
      setItem((prev) => ({ ...prev, comments: data.comments }))
      setComment('')
    } catch (e) {
      alert(e.message)
    } finally {
      setPosting(false)
    }
  }

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    try {
      const data = await clientApi.uploadFiles(id, files)
      setItem((prev) => ({ ...prev, files: data.files }))
    } catch (e) {
      alert(e.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDeleteComment(commentId) {
    if (!confirm(t('dashboard.deleteConfirm'))) return
    try {
      await clientApi.deleteComment(id, commentId)
      setItem((prev) => ({ ...prev, comments: prev.comments.filter((c) => c._id !== commentId) }))
    } catch (e) {
      alert(e.message)
    }
  }

  async function handleAllocate(e) {
    e.preventDefault()
    if (!allocResource || !allocQty) return
    setAllocating(true)
    try {
      await clientApi.allocateResource(allocResource, { requestId: id, allocQuantity: Number(allocQty) })
      setAllocResource('')
      setAllocQty('')
      loadResources()
      alert('Resource allocated successfully')
    } catch (e) {
      alert(e.message)
    } finally {
      setAllocating(false)
    }
  }

  if (loading) return <div className="container"><div className="card"><div className="small muted">{t('dashboard.loading')}</div></div></div>
  if (error) return <div className="container"><div className="card"><div className="errorText">{error}</div></div></div>
  if (!item) return null

  return (
    <div className="container" style={{ maxWidth: 800 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="headerRow">
          <div>
            <h2 className="pageTitle" style={{ fontSize: 20, margin: 0 }}>{item.title}</h2>
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <Badge label={t(`statuses.${item.status}`)} colors={STATUS_COLORS} colorKey={item.status} />
              <Badge label={t(`priorities.${item.priority}`)} colors={PRIORITY_COLORS} colorKey={item.priority} />
              <span className="govt-badge govt-badge-blue">{t(`categories.${item.category}`)}</span>
            </div>
          </div>
          <div className="btnRow">
            <button onClick={() => navigate('/dashboard')}>{t('admin.backToDashboard')}</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        <div className="card">
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--gov-blue)' }}>{t('editRequest.subtitle')}</h3>
          <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{item.description}</p>

          <div style={{ marginTop: 16, fontSize: 13 }}>
            <div style={{ marginBottom: 6 }}>📍 {item.locationName}</div>
            <div className="small muted">{item.lat?.toFixed(4)}, {item.lng?.toFixed(4)}</div>
          </div>

          {item.peopleCount > 1 && (
            <div style={{ marginTop: 8, fontSize: 13 }}>
              People affected: <strong>{item.peopleCount}</strong>
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 13 }}>
            <span className="small muted">{t('dashboard.postedBy')}</span>{' '}
            <strong>{item.createdBy?.displayName || item.createdBy?.email}</strong>
          </div>

          {item.claimedBy && (
            <div style={{ marginTop: 8, fontSize: 13, padding: '8px 12px', background: 'rgba(255,153,51,0.08)', borderRadius: 6 }}>
              Claimed by <strong>{item.claimedBy.displayName || item.claimedBy.email}</strong>
              {item.claimedAt && <span className="small muted"> - {new Date(item.claimedAt).toLocaleDateString()}</span>}
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            {!item.claimedBy && item.status === 'Open' && currentUser?.id !== item.createdBy?._id && (
              <button className="btnPrimary" onClick={handleClaim}>{t('dashboard.claim')}</button>
            )}
            {item.claimedBy?._id === currentUser?.id && (
              <button className="btnDanger" onClick={handleUnclaim}>{t('dashboard.unclaim')}</button>
            )}
            {(currentUser?.id === item.createdBy?._id || currentUser?.role === 'admin') && (
              <button onClick={() => navigate(`/requests/${id}/edit`)}>{t('dashboard.edit')}</button>
            )}
          </div>
        </div>

        <div className="card">
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--gov-blue)' }}>Files</h3>
          {item.files?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {item.files.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--gov-bg)', borderRadius: 6 }}>
                  {f.mimetype?.startsWith('image/') ? (
                    <img src={`${API_BASE}${f.url}`} alt={f.filename} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                  ) : (
                    <span style={{ fontSize: 20 }}>📄</span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.filename}</div>
                    <div className="small muted">{new Date(f.uploadedAt).toLocaleDateString()}</div>
                  </div>
                  <a href={`${API_BASE}${f.url}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--gov-blue)' }}>Open</a>
                </div>
              ))}
            </div>
          ) : (
            <div className="muted" style={{ fontSize: 13 }}>No files uploaded yet</div>
          )}
          <div style={{ marginTop: 12 }}>
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} style={{ display: 'none' }} id="file-upload" />
            <label htmlFor="file-upload" className="btnPrimary" style={{ display: 'inline-block', cursor: 'pointer', fontSize: 12, padding: '6px 14px' }}>
              {uploading ? t('editRequest.saving') : '+ Upload Files'}
            </label>
          </div>
        </div>

        <div className="card">
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--gov-blue)' }}>Allocate Resources</h3>
          <form onSubmit={handleAllocate} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={allocResource} onChange={(e) => setAllocResource(e.target.value)} required style={{ flex: 1, minWidth: 150, fontSize: 13 }}>
              <option value="">Select resource...</option>
              {resources.map((r) => (
                <option key={r._id} value={r._id}>{r.name} ({r.quantity} {r.unit} available)</option>
              ))}
            </select>
            <input type="number" placeholder="Qty" value={allocQty} onChange={(e) => setAllocQty(e.target.value)} required min="1" style={{ width: 80, fontSize: 13 }} />
            <button type="submit" disabled={allocating || !allocResource || !allocQty} className="btnPrimary" style={{ fontSize: 12, padding: '6px 14px' }}>
              {allocating ? '...' : 'Allocate'}
            </button>
          </form>
          {resources.length === 0 && (
            <div className="muted small" style={{ marginTop: 8 }}>No available resources. Add resources in the Resources section.</div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--gov-blue)' }}>
          Comments ({item.comments?.length || 0})
        </h3>

        <form onSubmit={handleComment} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add a comment..."
            style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--gov-border)', borderRadius: 6, fontSize: 13 }}
          />
          <button type="submit" className="btnPrimary" disabled={posting} style={{ fontSize: 12, padding: '6px 16px' }}>
            {posting ? '...' : 'Post'}
          </button>
        </form>

        {item.comments?.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...item.comments].reverse().map((c) => (
              <div key={c._id} style={{ padding: '10px 14px', background: 'var(--gov-bg)', borderRadius: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <strong style={{ fontSize: 12 }}>{c.createdBy?.displayName || c.createdBy?.email}</strong>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className="small muted">{new Date(c.createdAt).toLocaleDateString()}</span>
                    {(currentUser?.id === c.createdBy?._id || currentUser?.role === 'admin') && (
                      <button onClick={() => handleDeleteComment(c._id)} style={{ background: 'none', border: 'none', color: '#cc0000', cursor: 'pointer', fontSize: 11, padding: 0 }}>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                <div>{c.text}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="muted" style={{ fontSize: 13 }}>No comments yet</div>
        )}
      </div>

      {item.auditLog?.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--gov-blue)' }}>Activity Log</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...item.auditLog].reverse().map((entry, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--gov-muted)' }}>
                <span>{new Date(entry.timestamp).toLocaleString()}</span>
                <span>-</span>
                <span>{entry.action}</span>
                {entry.details && <span className="muted">({entry.details})</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
