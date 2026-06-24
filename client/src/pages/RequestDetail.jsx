import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { registerRefreshListener } from '../hooks/useSocket'
import { useToast } from '../components/Toast'
import { SkeletonCard } from '../components/Skeleton'
import { useAuth } from '../context/AuthContext'
import Chat from './Chat'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const STATUS_COLORS = {
  'Open': { bg: 'var(--accent-soft)', border: 'rgba(59,130,246,0.25)', text: 'var(--color-open)' },
  'Pending': { bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)', text: 'var(--color-pending)' },
  'In Progress': { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', text: 'var(--color-progress)' },
  'Resolved': { bg: 'var(--success-soft)', border: 'rgba(34,197,94,0.25)', text: 'var(--color-resolved)' },
  'Fulfilled': { bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)', text: 'var(--color-fulfilled)' },
}

const PRIORITY_COLORS = {
  'Critical': { bg: 'var(--danger-soft)', border: 'rgba(239,68,68,0.25)', text: 'var(--color-critical)' },
  'High': { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', text: 'var(--color-high)' },
  'Medium': { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.25)', text: 'var(--color-medium)' },
  'Low': { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', text: 'var(--color-low)' },
}

function Badge({ label, colors, colorKey }) {
  const c = colors[colorKey || label] || { bg: 'rgba(128,128,128,.1)', border: 'rgba(128,128,128,.3)', text: 'var(--gov-muted)' }
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
  const { user: currentUser } = useAuth()
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
    <article className="container max-w-md">
      <div className="card mb-lg">
        <div className="headerRow">
          <div>
            <h2 className="pageTitle text-2xl m-0">{item.title}</h2>
            <div className="flex flex-gap-xs mt-sm flex-wrap">
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

      <div className="grid-3-responsive gap-16">
        {/* Details Card */}
        <div className="card">
          <h3 className="text-base text-bold text-accent-blue" style={{ margin: '0 0 14px' }}>{t('editRequest.subtitle')}</h3>
          <p className="text-base m-0 leading-normal">{item.description}</p>

          <div className="mt-lg text-sm">
            <div className="mb-xs">📍 {item.locationName}</div>
            <div className="small muted">{item.lat?.toFixed(4)}, {item.lng?.toFixed(4)}</div>
          </div>

          {item.peopleCount > 1 && (
            <div className="mt-sm text-sm">
              {t('requestDetail.peopleAffected')} <strong>{item.peopleCount}</strong>
            </div>
          )}

          <div className="mt text-sm">
            <span className="small muted">{t('dashboard.postedBy')}</span>{' '}
            <strong>{item.createdBy?.displayName || item.createdBy?.email}</strong>
          </div>

          {item.claimedBy && (
            <div className="mt-sm text-sm p-sm bg-warning-soft rounded-sm">
              {t('requestDetail.claimedBy')} <strong>{item.claimedBy.displayName || item.claimedBy.email}</strong>
              {item.claimedAt && <span className="small muted"> - {new Date(item.claimedAt).toLocaleDateString()}</span>}
            </div>
          )}

          <div className="flex flex-gap-sm mt">
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
          <h3 className="m-0 mb text-base text-accent-blue">{t('requestDetail.files')}</h3>
          {item.files?.length > 0 ? (
            <div className="flex-col flex-gap-sm">
          {item.files.map((f) => (
            <div key={f._id || f.id || f.url} className="flex flex-gap-sm p-xs bg-gov-bg rounded-sm">
                  {f.mimetype?.startsWith('image/') ? (
                    <img src={`${API_BASE}${f.url}`} alt={f.filename} className="cursor-pointer object-cover rounded-sm w-40 h-40" onClick={() => setPreviewFile(f)} />
                  ) : f.mimetype === 'application/pdf' ? (
                    <span className="text-xl cursor-pointer" onClick={() => setPreviewFile(f)}>&#128196;</span>
                  ) : (
                    <span className="text-xl">&#128196;</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-ellipsis">{f.filename}</div>
                    <div className="small muted">{new Date(f.uploadedAt).toLocaleDateString()}</div>
                  </div>
                  {(f.mimetype?.startsWith('image/') || f.mimetype === 'application/pdf') && (
                    <button onClick={() => setPreviewFile(f)} className="text-xs p-xs">{t('requestDetail.preview') || 'Preview'}</button>
                  )}
                  <a href={`${API_BASE}${f.url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-accent-blue">{t('requestDetail.open')}</a>
                </div>
              ))}
            </div>
          ) : (
            <div className="muted text-sm">{t('requestDetail.noFiles')}</div>
          )}
          <div className="mt">
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} id="file-upload" />
            <label htmlFor="file-upload" className="btnPrimary inline-block cursor-pointer text-12 p-sm">
              {uploading ? t('editRequest.saving') : t('requestDetail.uploadFiles')}
            </label>
          </div>
        </div>

        {/* Allocate Resources Card */}
        <div className="card">
          <h3 className="m-0 mb text-base text-accent-blue">{t('requestDetail.allocateResources')}</h3>
          <form onSubmit={handleAllocate} className="flex flex-gap-sm flex-wrap">
            <label htmlFor="rd-resource" className="sr-only">{t('requestDetail.selectResource')}</label>
            <select id="rd-resource" value={allocResource} onChange={(e) => setAllocResource(e.target.value)} required className="flex-1 text-sm min-w-150">
              <option value="">{t('requestDetail.selectResource')}</option>
              {resources.map((r) => (
                <option key={r._id} value={r._id}>{r.name} ({r.quantity} {r.unit} {t('requestDetail.available')})</option>
              ))}
            </select>
            <label htmlFor="rd-qty" className="sr-only">{t('requestDetail.qty')}</label>
            <input id="rd-qty" type="number" placeholder={t('requestDetail.qty')} value={allocQty} onChange={(e) => setAllocQty(e.target.value)} required min="1" className="text-sm w-80" />
            <button type="submit" disabled={allocating || !allocResource || !allocQty} className="btnPrimary text-sm p-sm">
              {allocating ? '...' : t('requestDetail.allocate')}
            </button>
          </form>
          {resources.length === 0 && (
            <div className="muted small mt-sm">{t('requestDetail.noAvailableResources')}</div>
          )}
        </div>
      </div>

      {/* Suggested Resources */}
      {matches.length > 0 && (
        <div className="card mt-lg">
          <h3 className="m-0 mb text-base text-accent-blue">
            Suggested Resources ({matches.length})
          </h3>
          <div className="text-sm text-muted-extra mb-xs">
            Auto-matched by category and proximity
          </div>
          <div className="flex-col flex-gap-sm">
            {matches.map((m) => (
              <div key={m._id} className="flex-between text-sm p-sm bg-gov-bg rounded-sm">
                <div className="flex-1 min-w-0">
                  <div className="text-semi">{m.name}</div>
                  <div className="text-sm text-muted-extra mt-xs">
                    {m.quantity} {m.unit} available
                    {m.distanceKm != null && <span> - {m.distanceKm} km away</span>}
                    {m.categoryMatch && <span className="govt-badge govt-badge-green ml-sm text-10">{t('matching.exactMatch')}</span>}
                  </div>
                </div>
                <button
                  onClick={() => quickAllocate(m)}
                  className="btnPrimary text-xs flex-shrink-0 p-xs"
                >
                  Quick Allocate
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <section aria-label={t('requestDetail.comments')} aria-live="polite"><div className="card mt-lg">
        <h3 className="m-0 mb text-base text-accent-blue">
          {t('requestDetail.comments')} ({item.comments?.length || 0})
        </h3>

        <form onSubmit={handleComment} className="flex flex-gap-sm mb-lg">
          <label htmlFor="rd-comment" className="sr-only">{t('requestDetail.addComment')}</label>
          <input
            id="rd-comment"
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('requestDetail.addComment')}
            maxLength={2000}
            className="flex-1 text-sm p-sm border-gov rounded-sm"
          />
          <button type="submit" className="btnPrimary text-sm p-sm">
            {posting ? '...' : t('requestDetail.post')}
          </button>
        </form>

        {item.comments?.length > 0 ? (
          <div className="flex-col flex-gap-xs">
            {[...item.comments].reverse().map((c) => (
              <div key={c._id} className="text-sm p-sm bg-gov-bg" style={{ borderRadius: 8 }}>
                <div className="flex-between mb-xs">
                  <strong className="text-sm">{c.createdBy?.displayName || c.createdBy?.email}</strong>
                  <div className="flex flex-gap-sm">
                    <span className="small muted">{new Date(c.createdAt).toLocaleDateString()}</span>
                    {(currentUser?.id === c.createdBy?._id || currentUser?.role === 'admin') && (
                      <button onClick={() => handleDeleteComment(c._id)} className="bg-none border-none text-xs p-0 text-red cursor-pointer">
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
          <div className="muted text-sm">{t('requestDetail.noComments')}</div>
        )}
      </div></section>

      {/* Activity Log */}
      {item.auditLog?.length > 0 && (
        <aside aria-label={t('requestDetail.activityLog')}><div className="card mt-lg">
          <h3 className="m-0 mb text-base text-accent-blue">{t('requestDetail.activityLog')}</h3>
          <div className="flex-col flex-gap-xs">
            {[...item.auditLog].reverse().map((entry, idx) => (
              <div key={`${entry.timestamp}-${entry.action}-${idx}`} className="flex flex-gap-sm text-sm text-muted-extra">
                <span>{new Date(entry.timestamp).toLocaleString()}</span>
                <span>-</span>
                <span>{entry.action}</span>
                {entry.details && <span className="muted">({entry.details})</span>}
              </div>
            ))}
          </div>
        </div></aside>
      )}

      {/* Chat */}
      <div className="card mt-lg">
        <div className="flex-between" style={{ marginBottom: showChat ? 12 : 0 }}>
          <h3 className="m-0 text-base text-accent-blue">{t('requestDetail.realTimeChat')}</h3>
          <button onClick={() => setShowChat(!showChat)} className="text-sm p-xs">
            {showChat ? t('requestDetail.hideChat') : t('requestDetail.openChat')}
          </button>
        </div>
        {showChat && (
          <div className="mt-sm overflow-hidden border-gov rounded-sm" style={{ height: 350 }}>
            <Chat requestId={id} onClose={() => setShowChat(false)} />
          </div>
        )}
      </div>

      {/* Feedback */}
      <div className="card mt-lg">
        <div className="flex-between mb">
          <h3 className="m-0 text-base text-accent-blue">
            {t('requestDetail.feedback')} ({feedbackList.length})
          </h3>
          {!showFeedbackForm && (
            <button onClick={() => setShowFeedbackForm(true)} className="btnPrimary text-sm p-xs">
              {t('requestDetail.giveFeedback')}
            </button>
          )}
        </div>

        {showFeedbackForm && (
          <form onSubmit={handleFeedbackSubmit} className="p mb bg-gov-bg rounded-sm">
            <div className="mb-sm">
              <label className="small label-block">{t('requestDetail.rating')}</label>
              <div className="flex flex-gap-xs">
                {[1, 2, 3, 4, 5].map((star) => (
                   <button key={star} type="button" onClick={() => setFeedbackRating(star)} className="bg-none border-none text-xl cursor-pointer p-0" style={{ color: star <= feedbackRating ? 'var(--gov-saffron)' : 'var(--gov-border)' }}>
                    ★
                  </button>
                ))}
              </div>
            </div>
            <label htmlFor="rd-feedback" className="sr-only">{t('requestDetail.feedbackPlaceholder')}</label>
            <textarea id="rd-feedback" value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} placeholder={t('requestDetail.feedbackPlaceholder')} rows={2} className="w-full text-sm mb-sm" />
            <div className="flex flex-gap-sm">
              <button type="submit" disabled={feedbackLoading} className="btnPrimary text-sm p-sm">
                {feedbackLoading ? '...' : t('requestDetail.submit')}
              </button>
              <button type="button" onClick={() => setShowFeedbackForm(false)} className="text-sm">{t('editRequest.cancel')}</button>
            </div>
          </form>
        )}

        {feedbackList.length > 0 ? (
          <div className="flex-col flex-gap-sm">
            {feedbackList.map((f) => (
              <div key={f._id} className="text-sm p-sm bg-gov-bg rounded-sm">
                <div className="flex flex-gap-xs mb-xs">
                  {[1, 2, 3, 4, 5].map((s) => (
                     <span key={s} className="text-base" style={{ color: s <= f.rating ? 'var(--gov-saffron)' : 'var(--gov-border)' }}>★</span>
                  ))}
                  <span className="small muted ml-sm">by {f.submittedBy?.displayName || 'User'}</span>
                </div>
                {f.comment && <div>{f.comment}</div>}
                {f.deliveryConfirmed && <div className="small mt-xs text-accent-green">{t('requestDetail.deliveryConfirmed')}</div>}
              </div>
            ))}
          </div>
        ) : (
          !showFeedbackForm && <div className="muted text-sm">{t('requestDetail.noFeedback')}</div>
        )}
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed flex-center inset-0 p-xl bg-black-85 z-9999" onClick={() => setPreviewFile(null)}>
          <div className="relative" style={{ maxWidth: '90vw', maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewFile(null)} className="absolute bg-none border-none cursor-pointer text-white text-24" style={{ top: -32, right: 0 }}>✕</button>
            {previewFile.mimetype?.startsWith('image/') ? (
              <img src={`${API_BASE}${previewFile.url}`} alt={previewFile.filename} className="rounded" style={{ maxWidth: '100%', maxHeight: '80vh' }} />
            ) : previewFile.mimetype === 'application/pdf' ? (
              <iframe src={`${API_BASE}${previewFile.url}`} title={previewFile.filename} className="border-none rounded bg-gov-white" style={{ width: '80vw', height: '80vh' }} />
            ) : (
              <div className="text-center p-xl bg-gov-white" style={{ borderRadius: 8, color: 'var(--gov-text)' }}>
                <div className="text-3xl mb">&#128196;</div>
                <div className="text-base mb-lg">{previewFile.filename}</div>
                <a href={`${API_BASE}${previewFile.url}`} target="_blank" rel="noopener noreferrer" className="btnPrimary text-sm p-sm">{t('common.download')}</a>
              </div>
            )}
            <div className="text-center text-muted-extra text-sm mt-sm">{previewFile.filename}</div>
          </div>
        </div>
      )}
    </article>
  )
}
