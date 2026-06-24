import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { registerRefreshListener } from '../hooks/useSocket'
import { useToast } from '../components/Toast'
import { SkeletonCard } from '../components/Skeleton'
import Chat from './Chat'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const STATUS_COLORS = {
  'Open': { bg: 'rgba(74,128,192,.1)', border: 'rgba(74,128,192,.25)', text: 'var(--color-open)' },
  'Pending': { bg: 'rgba(167,139,250,.1)', border: 'rgba(167,139,250,.25)', text: 'var(--color-pending)' },
  'In Progress': { bg: 'rgba(218,157,66,.1)', border: 'rgba(218,157,66,.25)', text: 'var(--color-progress)' },
  'Resolved': { bg: 'rgba(63,185,80,.1)', border: 'rgba(63,185,80,.25)', text: 'var(--color-resolved)' },
  'Fulfilled': { bg: 'rgba(52,211,153,.1)', border: 'rgba(52,211,153,.25)', text: 'var(--color-fulfilled)' },
}

const PRIORITY_COLORS = {
  'Critical': { bg: 'rgba(248,81,73,.1)', border: 'rgba(248,81,73,.25)', text: 'var(--color-critical)' },
  'High': { bg: 'rgba(218,157,66,.1)', border: 'rgba(218,157,66,.25)', text: 'var(--color-high)' },
  'Medium': { bg: 'rgba(234,179,8,.1)', border: 'rgba(234,179,8,.25)', text: 'var(--color-medium)' },
  'Low': { bg: 'rgba(34,197,94,.1)', border: 'rgba(34,197,94,.25)', text: 'var(--color-low)' },
}

function Badge({ label, colors, colorKey }) {
  const c = colors[colorKey || label] || { bg: 'rgba(128,128,128,.1)', border: 'rgba(128,128,128,.3)', text: 'var(--gov-muted)' }
  return (
    <span className="govt-badge" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {label}
    </span>
  )
}

function useCurrentUser() {
  return (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
  })()
}

export default function RequestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const currentUser = useCurrentUser()
  const fileRef = useRef()
  const toast = useToast()

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
  const [matches, setMatches] = useState([])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [feedbackList, setFeedbackList] = useState([])
  const [feedbackRating, setFeedbackRating] = useState(5)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)

  const load = useCallback(async () => {
    try {
      const data = await clientApi.getRequest(id)
      setItem(data.item)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadResources = useCallback(async () => {
    try {
      const data = await clientApi.getResources({ status: 'Available', limit: 100 })
      setResources(data.items || [])
    } catch {
      // silently fail
    }
  }, [])

  const loadFeedback = useCallback(async () => {
    try {
      const data = await clientApi.getFeedback(id)
      setFeedbackList(data.feedback || [])
    } catch {
      // silently fail
    }
  }, [id])

  const loadMatches = useCallback(async () => {
    setLoadingMatches(true)
    try {
      const data = await clientApi.matchResources(id)
      setMatches(data.matches || [])
    } catch {
      // silently fail
    } finally {
      setLoadingMatches(false)
    }
  }, [id])

  useEffect(() => { load(); loadResources() }, [load, loadResources])
  useEffect(() => { loadFeedback() }, [loadFeedback])
  useEffect(() => { if (item?.status === 'Open') loadMatches() }, [item?.status, loadMatches])

  useAutoRefresh(load, { interval: 20000 })

  useEffect(() => {
    return registerRefreshListener(['request:updated', 'request:commented'], load)
  }, [load])

  async function handleFeedbackSubmit(e) {
    e.preventDefault()
    setFeedbackLoading(true)
    try {
      await clientApi.submitFeedback(id, { rating: feedbackRating, comment: feedbackComment, deliveryConfirmed: true })
      setFeedbackComment('')
      setFeedbackRating(5)
      setShowFeedbackForm(false)
      loadFeedback()
      load()
      toast.success(t('requestDetail.feedbackSubmitted') || 'Feedback submitted')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setFeedbackLoading(false)
    }
  }

  async function handleClaim() {
    setClaiming(true)
    try {
      const data = await clientApi.claimRequest(id)
      setItem(data.item)
      toast.success(t('requestDetail.claimed') || 'Request claimed')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setClaiming(false)
    }
  }

  async function handleUnclaim() {
    if (!confirm(t('dashboard.unclaimConfirm') || 'Are you sure you want to unclaim this request?')) return
    setClaiming(true)
    try {
      const data = await clientApi.unclaimRequest(id)
      setItem(data.item)
      toast.success(t('requestDetail.unclaimed') || 'Request unclaimed')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setClaiming(false)
    }
  }

  async function handleComment(e) {
    e.preventDefault()
    if (!comment.trim()) return
    setPosting(true)
    try {
      const data = await clientApi.addComment(id, comment)
      setItem((prev) => ({ ...prev, comments: data.comments || prev?.comments || [] }))
      setComment('')
    } catch (err) {
      toast.error(err.message)
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
      toast.success(t('requestDetail.filesUploaded') || 'Files uploaded')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDeleteComment(commentId) {
    if (!confirm(t('dashboard.deleteConfirm'))) return
    try {
      await clientApi.deleteComment(id, commentId)
      setItem((prev) => ({ ...prev, comments: (prev.comments || []).filter((c) => c._id !== commentId) }))
      toast.success(t('requestDetail.commentDeleted') || 'Comment deleted')
    } catch (err) {
      toast.error(err.message)
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
      toast.success(t('requestDetail.allocatedSuccessfully'))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAllocating(false)
    }
  }

  async function quickAllocate(match) {
    try {
      await clientApi.allocateResource(match._id, { requestId: id, allocQuantity: Math.min(match.quantity, 10) })
      loadResources()
      loadMatches()
      toast.success(t('requestDetail.resourceAllocated'))
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (loading) return <div className="container"><div className="card"><SkeletonCard lines={4} /></div></div>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))', gap: 16 }}>
        {/* Details Card */}
        <div className="card">
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: 'var(--accent-blue)' }}>{t('editRequest.subtitle')}</h3>
          <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{item.description}</p>

          <div style={{ marginTop: 16, fontSize: 13 }}>
            <div style={{ marginBottom: 6 }}>📍 {item.locationName}</div>
            <div className="small muted">{item.lat?.toFixed(4)}, {item.lng?.toFixed(4)}</div>
          </div>

          {item.peopleCount > 1 && (
            <div style={{ marginTop: 8, fontSize: 13 }}>
              {t('requestDetail.peopleAffected')} <strong>{item.peopleCount}</strong>
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 13 }}>
            <span className="small muted">{t('dashboard.postedBy')}</span>{' '}
            <strong>{item.createdBy?.displayName || item.createdBy?.email}</strong>
          </div>

          {item.claimedBy && (
            <div style={{ marginTop: 8, fontSize: 13, padding: '8px 12px', background: 'rgba(255,153,51,0.08)', borderRadius: 6 }}>
              {t('requestDetail.claimedBy')} <strong>{item.claimedBy.displayName || item.claimedBy.email}</strong>
              {item.claimedAt && <span className="small muted"> - {new Date(item.claimedAt).toLocaleDateString()}</span>}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {!item.claimedBy && item.status === 'Open' && currentUser?.id !== item.createdBy?._id && (
              <button className="btnPrimary" onClick={handleClaim} disabled={claiming}>{claiming ? '...' : t('dashboard.claim')}</button>
            )}
            {item.claimedBy?._id === currentUser?.id && (
              <button className="btnDanger" onClick={handleUnclaim} disabled={claiming}>{claiming ? '...' : t('dashboard.unclaim')}</button>
            )}
            {(currentUser?.id === item.createdBy?._id || currentUser?.role === 'admin') && (
              <button onClick={() => navigate(`/requests/${id}/edit`)}>{t('dashboard.edit')}</button>
            )}
          </div>
        </div>

        {/* Files Card */}
        <div className="card">
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--gov-blue)' }}>{t('requestDetail.files')}</h3>
          {item.files?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {item.files.map((f) => (
            <div key={f._id || f.id || f.url} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--gov-bg)', borderRadius: 6 }}>
                  {f.mimetype?.startsWith('image/') ? (
                    <img src={`${API_BASE}${f.url}`} alt={f.filename} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }} onClick={() => setPreviewFile(f)} />
                  ) : f.mimetype === 'application/pdf' ? (
                    <span style={{ fontSize: 20, cursor: 'pointer' }} onClick={() => setPreviewFile(f)}>&#128196;</span>
                  ) : (
                    <span style={{ fontSize: 20 }}>&#128196;</span>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.filename}</div>
                    <div className="small muted">{new Date(f.uploadedAt).toLocaleDateString()}</div>
                  </div>
                  {(f.mimetype?.startsWith('image/') || f.mimetype === 'application/pdf') && (
                    <button onClick={() => setPreviewFile(f)} style={{ fontSize: 11, padding: '3px 8px' }}>{t('requestDetail.preview') || 'Preview'}</button>
                  )}
                  <a href={`${API_BASE}${f.url}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--gov-blue)' }}>{t('requestDetail.open')}</a>
                </div>
              ))}
            </div>
          ) : (
            <div className="muted" style={{ fontSize: 13 }}>{t('requestDetail.noFiles')}</div>
          )}
          <div style={{ marginTop: 12 }}>
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={handleFileUpload} style={{ display: 'none' }} id="file-upload" />
            <label htmlFor="file-upload" className="btnPrimary" style={{ display: 'inline-block', cursor: 'pointer', fontSize: 12, padding: '6px 14px' }}>
              {uploading ? t('editRequest.saving') : t('requestDetail.uploadFiles')}
            </label>
          </div>
        </div>

        {/* Allocate Resources Card */}
        <div className="card">
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--gov-blue)' }}>{t('requestDetail.allocateResources')}</h3>
          <form onSubmit={handleAllocate} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={allocResource} onChange={(e) => setAllocResource(e.target.value)} required style={{ flex: 1, minWidth: 150, fontSize: 13 }}>
              <option value="">{t('requestDetail.selectResource')}</option>
              {resources.map((r) => (
                <option key={r._id} value={r._id}>{r.name} ({r.quantity} {r.unit} {t('requestDetail.available')})</option>
              ))}
            </select>
            <input type="number" placeholder={t('requestDetail.qty')} value={allocQty} onChange={(e) => setAllocQty(e.target.value)} required min="1" style={{ width: 80, fontSize: 13 }} />
            <button type="submit" disabled={allocating || !allocResource || !allocQty} className="btnPrimary" style={{ fontSize: 12, padding: '6px 14px' }}>
              {allocating ? '...' : t('requestDetail.allocate')}
            </button>
          </form>
          {resources.length === 0 && (
            <div className="muted small" style={{ marginTop: 8 }}>{t('requestDetail.noAvailableResources')}</div>
          )}
        </div>
      </div>

      {/* Suggested Resources */}
      {matches.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--gov-blue)' }}>
            Suggested Resources ({matches.length})
          </h3>
          <div style={{ fontSize: 12, color: 'var(--gov-muted)', marginBottom: 10 }}>
            Auto-matched by category and proximity
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {matches.map((m) => (
              <div key={m._id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', background: 'var(--gov-bg)', borderRadius: 6, fontSize: 13,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gov-muted)', marginTop: 2 }}>
                    {m.quantity} {m.unit} available
                    {m.distanceKm != null && <span> - {m.distanceKm} km away</span>}
                    {m.categoryMatch && <span className="govt-badge govt-badge-green" style={{ marginLeft: 6, fontSize: 10 }}>Exact Match</span>}
                  </div>
                </div>
                <button
                  onClick={() => quickAllocate(m)}
                  className="btnPrimary"
                  style={{ fontSize: 11, padding: '4px 12px', flexShrink: 0 }}
                >
                  Quick Allocate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--gov-blue)' }}>
          {t('requestDetail.comments')} ({item.comments?.length || 0})
        </h3>

        <form onSubmit={handleComment} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('requestDetail.addComment')}
            maxLength={2000}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--gov-border)', borderRadius: 6, fontSize: 13 }}
          />
          <button type="submit" className="btnPrimary" disabled={posting} style={{ fontSize: 12, padding: '6px 16px' }}>
            {posting ? '...' : t('requestDetail.post')}
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
                      <button onClick={() => handleDeleteComment(c._id)} style={{ background: 'none', border: 'none', color: 'var(--gov-danger)', cursor: 'pointer', fontSize: 11, padding: 0 }}>
                        {t('requestDetail.delete')}
                      </button>
                    )}
                  </div>
                </div>
                <div>{c.text}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="muted" style={{ fontSize: 13 }}>{t('requestDetail.noComments')}</div>
        )}
      </div>

      {/* Activity Log */}
      {item.auditLog?.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--gov-blue)' }}>{t('requestDetail.activityLog')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...item.auditLog].reverse().map((entry, idx) => (
              <div key={`${entry.timestamp}-${entry.action}-${idx}`} style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--gov-muted)' }}>
                <span>{new Date(entry.timestamp).toLocaleString()}</span>
                <span>-</span>
                <span>{entry.action}</span>
                {entry.details && <span className="muted">({entry.details})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showChat ? 12 : 0 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: 'var(--gov-blue)' }}>{t('requestDetail.realTimeChat')}</h3>
          <button onClick={() => setShowChat(!showChat)} style={{ fontSize: 12, padding: '4px 12px' }}>
            {showChat ? t('requestDetail.hideChat') : t('requestDetail.openChat')}
          </button>
        </div>
        {showChat && (
          <div style={{ height: 350, marginTop: 8, border: '1px solid var(--gov-border)', borderRadius: 6, overflow: 'hidden' }}>
            <Chat requestId={id} onClose={() => setShowChat(false)} />
          </div>
        )}
      </div>

      {/* Feedback */}
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14, color: 'var(--gov-blue)' }}>
            {t('requestDetail.feedback')} ({feedbackList.length})
          </h3>
          {!showFeedbackForm && (
            <button onClick={() => setShowFeedbackForm(true)} className="btnPrimary" style={{ fontSize: 12, padding: '4px 12px' }}>
              {t('requestDetail.giveFeedback')}
            </button>
          )}
        </div>

        {showFeedbackForm && (
          <form onSubmit={handleFeedbackSubmit} style={{ padding: 12, background: 'var(--gov-bg)', borderRadius: 6, marginBottom: 12 }}>
            <div style={{ marginBottom: 8 }}>
              <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('requestDetail.rating')}</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                   <button key={star} type="button" onClick={() => setFeedbackRating(star)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: star <= feedbackRating ? 'var(--gov-saffron)' : 'var(--gov-border)', padding: '0 2px' }}>
                    ★
                  </button>
                ))}
              </div>
            </div>
            <textarea value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} placeholder={t('requestDetail.feedbackPlaceholder')} rows={2} style={{ width: '100%', fontSize: 13, marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={feedbackLoading} className="btnPrimary" style={{ fontSize: 12, padding: '6px 14px' }}>
                {feedbackLoading ? '...' : t('requestDetail.submit')}
              </button>
              <button type="button" onClick={() => setShowFeedbackForm(false)} style={{ fontSize: 12 }}>{t('editRequest.cancel')}</button>
            </div>
          </form>
        )}

        {feedbackList.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {feedbackList.map((f) => (
              <div key={f._id} style={{ padding: '10px 14px', background: 'var(--gov-bg)', borderRadius: 6, fontSize: 13 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                     <span key={s} style={{ color: s <= f.rating ? 'var(--gov-saffron)' : 'var(--gov-border)', fontSize: 14 }}>★</span>
                  ))}
                  <span className="small muted" style={{ marginLeft: 8 }}>by {f.submittedBy?.displayName || 'User'}</span>
                </div>
                {f.comment && <div>{f.comment}</div>}
                {f.deliveryConfirmed && <div className="small" style={{ color: 'var(--accent-green)', marginTop: 4 }}>{t('requestDetail.deliveryConfirmed')}</div>}
              </div>
            ))}
          </div>
        ) : (
          !showFeedbackForm && <div className="muted" style={{ fontSize: 13 }}>{t('requestDetail.noFeedback')}</div>
        )}
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }} onClick={() => setPreviewFile(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewFile(null)} style={{ position: 'absolute', top: -32, right: 0, background: 'none', border: 'none', color: 'white', fontSize: 24, cursor: 'pointer' }}>✕</button>
            {previewFile.mimetype?.startsWith('image/') ? (
              <img src={`${API_BASE}${previewFile.url}`} alt={previewFile.filename} style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 8 }} />
            ) : previewFile.mimetype === 'application/pdf' ? (
              <iframe src={`${API_BASE}${previewFile.url}`} title={previewFile.filename} style={{ width: '80vw', height: '80vh', border: 'none', borderRadius: 8, background: 'var(--gov-white)' }} />
            ) : (
              <div style={{ background: 'var(--gov-white)', padding: 32, borderRadius: 8, textAlign: 'center', color: 'var(--gov-text)' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>&#128196;</div>
                <div style={{ fontSize: 14, marginBottom: 16 }}>{previewFile.filename}</div>
                <a href={`${API_BASE}${previewFile.url}`} target="_blank" rel="noopener noreferrer" className="btnPrimary" style={{ padding: '8px 20px', fontSize: 13 }}>Download</a>
              </div>
            )}
            <div style={{ textAlign: 'center', color: 'var(--gov-muted)', fontSize: 12, marginTop: 8 }}>{previewFile.filename}</div>
          </div>
        </div>
      )}
    </div>
  )
}
