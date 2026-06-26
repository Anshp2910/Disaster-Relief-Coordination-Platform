import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, type Variants } from 'framer-motion'
import { ArrowLeft, Edit, Trash2, MessageSquare, Paperclip, Download, CheckCircle, XCircle, AlertTriangle, Clock, MapPin, User, Package, Activity, Share2 } from 'lucide-react'
import { clientApi } from '../api/client'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { registerRefreshListener } from '../hooks/useSocket'
import { useToast } from '../components/Toast'
import { Modal, ErrorState, PageHeader } from '../components/ui'
import Badge from '../components/Badge'
import { SkeletonList, SkeletonCard } from '../components/Skeleton'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../hooks/useConfirm'
import Chat from './Chat'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Open': { bg: 'var(--accent-soft)', border: 'rgba(59,130,246,0.25)', text: 'var(--color-open)' },
  'Pending': { bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)', text: 'var(--color-pending)' },
  'In Progress': { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', text: 'var(--color-progress)' },
  'Resolved': { bg: 'var(--success-soft)', border: 'rgba(34,197,94,0.25)', text: 'var(--color-resolved)' },
  'Fulfilled': { bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.25)', text: 'var(--color-fulfilled)' },
}

const PRIORITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  'Critical': { bg: 'var(--danger-soft)', border: 'rgba(239,68,68,0.25)', text: 'var(--color-critical)' },
  'High': { bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', text: 'var(--color-high)' },
  'Medium': { bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.25)', text: 'var(--color-medium)' },
  'Low': { bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.25)', text: 'var(--color-low)' },
}

interface FileItem {
  _id?: string
  id?: string
  url?: string
  filename?: string
  mimetype?: string
  uploadedAt?: string
}

interface CommentItem {
  _id: string
  text?: string
  createdAt?: string
  createdBy?: {
    _id?: string
    displayName?: string
    email?: string
  }
}

interface AuditEntry {
  timestamp?: string
  action?: string
  details?: string
}

interface Feedback {
  _id: string
  rating?: number
  comment?: string
  deliveryConfirmed?: boolean
  submittedBy?: {
    displayName?: string
  }
}

interface Resource {
  _id: string
  name?: string
  quantity?: number
  unit?: string
}

interface Match {
  _id: string
  name?: string
  quantity?: number
  unit?: string
  distanceKm?: number
  categoryMatch?: boolean
}

interface RequestDetailItem {
  _id: string
  title?: string
  status?: string
  priority?: string
  category?: string
  description?: string
  locationName?: string
  lat?: number
  lng?: number
  peopleCount?: number
  createdBy?: {
    _id?: string
    displayName?: string
    email?: string
  }
  claimedBy?: {
    _id?: string
    displayName?: string
    email?: string
  }
  claimedAt?: string
  files?: FileItem[]
  comments?: CommentItem[]
  auditLog?: AuditEntry[]
}

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
}

export default function RequestDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user: currentUser } = useAuth()
  const fileRef = useRef<HTMLInputElement | null>(null)
  const toast = useToast()

  const [item, setItem] = useState<RequestDetailItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [comment, setComment] = useState('')
  const [posting, setPosting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [resources, setResources] = useState<Resource[]>([])
  const [allocating, setAllocating] = useState(false)
  const [allocResource, setAllocResource] = useState('')
  const [allocQty, setAllocQty] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
  const [feedbackRating, setFeedbackRating] = useState(5)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const { confirm, ConfirmDialog } = useConfirm()

  const load = useCallback(async () => {
    try {
      const data = await clientApi.getRequest(id!) as { item: RequestDetailItem }
      setItem(data.item)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadResources = useCallback(async () => {
    try {
      const data = await clientApi.getResources({ status: 'Available', limit: '100' }) as { items?: Resource[] }
      setResources(data.items || [])
    } catch {
      console.warn('[RequestDetail] Failed to load resources')
    }
  }, [])

  const loadFeedback = useCallback(async () => {
    try {
      const data = await clientApi.getFeedback(id!) as { feedback?: Feedback[] }
      setFeedbackList(data.feedback || [])
    } catch {
      console.warn('[RequestDetail] Failed to load feedback')
    }
  }, [id])

  const loadMatches = useCallback(async () => {
    setLoadingMatches(true)
    try {
      const data = await clientApi.matchResources(id!) as { matches?: Match[] }
      setMatches(data.matches || [])
    } catch {
      console.warn('[RequestDetail] Failed to load matches')
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

  async function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedbackLoading(true)
    try {
      await clientApi.submitFeedback(id!, { rating: feedbackRating, comment: feedbackComment, deliveryConfirmed: true })
      setFeedbackComment('')
      setFeedbackRating(5)
      setShowFeedbackForm(false)
      loadFeedback()
      load()
      toast.success(t('requestDetail.feedbackSubmitted') || 'Feedback submitted')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setFeedbackLoading(false)
    }
  }

  async function handleClaim() {
    setClaiming(true)
    try {
      const data = await clientApi.claimRequest(id!) as { item: RequestDetailItem }
      setItem(data.item)
      toast.success(t('requestDetail.claimed') || 'Request claimed')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setClaiming(false)
    }
  }

  async function handleUnclaim() {
    const ok = await confirm({ message: t('dashboard.unclaimConfirm') || 'Are you sure you want to unclaim this request?', confirmText: t('dashboard.unclaim'), danger: true })
    if (!ok) return
    setClaiming(true)
    try {
      const data = await clientApi.unclaimRequest(id!) as { item: RequestDetailItem }
      setItem(data.item)
      toast.success(t('requestDetail.unclaimed') || 'Request unclaimed')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setClaiming(false)
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault()
    if (!comment.trim()) return
    setPosting(true)
    try {
      const data = await clientApi.addComment(id!, comment) as { comments?: CommentItem[] }
      setItem((prev) => ({ ...prev!, comments: data.comments || prev?.comments || [] }))
      setComment('')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setPosting(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    try {
      const data = await clientApi.uploadFiles(id!, files) as { files: FileItem[] }
      setItem((prev) => ({ ...prev!, files: data.files }))
      toast.success(t('requestDetail.filesUploaded') || 'Files uploaded')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDeleteComment(commentId: string) {
    const ok = await confirm({ message: t('dashboard.deleteConfirm'), danger: true })
    if (!ok) return
    try {
      await clientApi.deleteComment(id!, commentId)
      setItem((prev) => ({ ...prev!, comments: (prev?.comments || []).filter((c: { _id: string }) => c._id !== commentId) }))
      toast.success(t('requestDetail.commentDeleted') || 'Comment deleted')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleAllocate(e: React.FormEvent) {
    e.preventDefault()
    if (!allocResource || !allocQty) return
    setAllocating(true)
    try {
      await clientApi.allocateResource(allocResource, { requestId: id!, allocQuantity: Number(allocQty) })
      setAllocResource('')
      setAllocQty('')
      loadResources()
      toast.success(t('requestDetail.allocatedSuccessfully'))
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setAllocating(false)
    }
  }

  async function quickAllocate(match: Match) {
    try {
      await clientApi.allocateResource(match._id, { requestId: id!, allocQuantity: Math.min(match.quantity ?? 0, 10) })
      loadResources()
      loadMatches()
      toast.success(t('requestDetail.resourceAllocated'))
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  if (loading) return <div className="container"><div className="card"><SkeletonCard lines={4} /></div></div>

  if (error) return (
    <div className="container">
      <ErrorState message={error} onRetry={load} />
    </div>
  )

  if (!item) return null

  return (
    <article className="container max-w-md" aria-label={`${t('requestDetail.pageTitle') || 'Request Detail'}: ${item.title}`}>
      <PageHeader
        title={item.title || ''}
        actions={
          <button onClick={() => navigate('/dashboard')} className="flex-center gap-xs" aria-label={t('admin.backToDashboard')}>
            <ArrowLeft size={16} />
            {t('admin.backToDashboard')}
          </button>
        }
      />

      <motion.div variants={containerVariants} initial="hidden" animate="show">
        <motion.div variants={itemVariants} className="flex flex-gap-xs mb-lg flex-wrap" role="group" aria-label="Status and priority badges">
          <Badge label={t(`statuses.${item.status}`)} colors={STATUS_COLORS} colorKey={item.status} />
          <Badge label={t(`priorities.${item.priority}`)} colors={PRIORITY_COLORS} colorKey={item.priority} />
          <span className="govt-badge govt-badge-blue">{t(`categories.${item.category}`)}</span>
        </motion.div>

        <div className="grid-3-responsive gap-16">
          <motion.div variants={itemVariants} className="card">
            <h3 className="text-base text-bold text-accent-blue" style={{ margin: '0 0 14px' }}>{t('editRequest.subtitle')}</h3>
            <p className="text-base m-0 leading-normal">{item.description}</p>

            <div className="mt-lg text-sm">
              <div className="mb-xs flex flex-gap-xs">
                <MapPin size={14} className="flex-shrink-0" aria-hidden="true" />
                <span>{item.locationName}</span>
              </div>
              <div className="small muted">{item.lat?.toFixed(4)}, {item.lng?.toFixed(4)}</div>
            </div>

            {(item.peopleCount ?? 0) > 1 && (
              <div className="mt-sm text-sm flex flex-gap-xs">
                <User size={14} className="flex-shrink-0" aria-hidden="true" />
                <span>{t('requestDetail.peopleAffected')} <strong>{item.peopleCount}</strong></span>
              </div>
            )}

            <div className="mt text-sm flex flex-gap-xs">
              <User size={14} className="flex-shrink-0" aria-hidden="true" />
              <span className="small muted">{t('dashboard.postedBy')}</span>{' '}
              <strong>{item.createdBy?.displayName || item.createdBy?.email}</strong>
            </div>

            {item.claimedBy && (
              <div className="mt-sm text-sm p-sm bg-warning-soft rounded-sm flex flex-gap-xs">
                <Activity size={14} className="flex-shrink-0" aria-hidden="true" />
                <span>
                  {t('requestDetail.claimedBy')} <strong>{item.claimedBy.displayName || item.claimedBy.email}</strong>
                  {item.claimedAt && <span className="small muted"> - {new Date(item.claimedAt).toLocaleDateString()}</span>}
                </span>
              </div>
            )}

            <div className="flex flex-gap-sm mt">
              {!item.claimedBy && item.status === 'Open' && currentUser?.id !== item.createdBy?._id && (
                <button className="btnPrimary" onClick={handleClaim} disabled={claiming} aria-label={t('dashboard.claim')}>
                  {claiming ? '...' : t('dashboard.claim')}
                </button>
              )}
              {item.claimedBy?._id === currentUser?.id && (
                <button className="btnDanger" onClick={handleUnclaim} disabled={claiming} aria-label={t('dashboard.unclaim')}>
                  {claiming ? '...' : t('dashboard.unclaim')}
                </button>
              )}
              {(currentUser?.id === item.createdBy?._id || currentUser?.role === 'admin') && (
                <button onClick={() => navigate(`/requests/${id}/edit`)} className="flex-center gap-xs" aria-label={t('dashboard.edit')}>
                  <Edit size={14} />
                  {t('dashboard.edit')}
                </button>
              )}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="card">
            <h3 className="m-0 mb text-base text-accent-blue flex flex-gap-xs">
              <Paperclip size={16} aria-hidden="true" />
              {t('requestDetail.files')}
            </h3>
            {item.files?.length ? (
              <div className="flex-col flex-gap-sm">
                {item.files.map((f) => (
                  <div key={f._id || f.id || f.url} className="flex flex-gap-sm p-xs bg-gov-bg rounded-sm">
                    {f.mimetype?.startsWith('image/') ? (
                      <img src={`${API_BASE}${f.url}`} alt={f.filename} className="cursor-pointer object-cover rounded-sm w-40 h-40" role="button" tabIndex={0} onClick={() => setPreviewFile(f)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPreviewFile(f) } }} />
                    ) : f.mimetype === 'application/pdf' ? (
                      <span className="text-xl cursor-pointer" role="button" tabIndex={0} onClick={() => setPreviewFile(f)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPreviewFile(f) } }} aria-label={f.filename}>
                        <Paperclip size={20} />
                      </span>
                    ) : (
                      <span className="text-xl"><Paperclip size={20} /></span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-ellipsis">{f.filename}</div>
                      <div className="small muted">{f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString() : ''}</div>
                    </div>
                    {(f.mimetype?.startsWith('image/') || f.mimetype === 'application/pdf') && (
                      <button onClick={() => setPreviewFile(f)} className="text-xs p-xs">{t('requestDetail.preview') || 'Preview'}</button>
                    )}
                    <a href={`${API_BASE}${f.url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-accent-blue" aria-label={`${t('requestDetail.open')} ${f.filename}`}>
                      <Download size={14} />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="muted text-sm">{t('requestDetail.noFiles')}</div>
            )}
            <div className="mt">
              <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} id="file-upload" aria-label={t('requestDetail.uploadFiles')} />
              <label htmlFor="file-upload" className="btnPrimary inline-block cursor-pointer text-12 p-sm">
                {uploading ? t('editRequest.saving') : t('requestDetail.uploadFiles')}
              </label>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="card">
            <h3 className="m-0 mb text-base text-accent-blue flex flex-gap-xs">
              <Package size={16} aria-hidden="true" />
              {t('requestDetail.allocateResources')}
            </h3>
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
          </motion.div>
        </div>

        {matches.length > 0 && (
          <motion.div variants={itemVariants} className="card mt-lg">
            <h3 className="m-0 mb text-base text-accent-blue flex flex-gap-xs">
              <Share2 size={16} aria-hidden="true" />
              {t('requestDetail.suggestedResources') || 'Suggested Resources'} ({matches.length})
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
                      {m.categoryMatch && <span className="govt-badge govt-badge-green ml-sm text-10 flex-center gap-xs"><CheckCircle size={10} /> {t('matching.exactMatch')}</span>}
                    </div>
                  </div>
                  <button onClick={() => quickAllocate(m)} className="btnPrimary text-xs flex-shrink-0 p-xs">
                    Quick Allocate
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.section variants={itemVariants} aria-label={t('requestDetail.comments')} aria-live="polite" className="card mt-lg">
          <h3 className="m-0 mb text-base text-accent-blue flex flex-gap-xs">
            <MessageSquare size={16} aria-hidden="true" />
            {t('requestDetail.comments')} ({item.comments?.length || 0})
          </h3>

          <form onSubmit={handleComment} className="flex flex-gap-sm mb-lg">
            <div className="ff-group flex-1 m-0">
              <div className={`ff-wrap ${comment ? 'ff-focused' : ''}`}>
                <input
                  id="rd-comment"
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={2000}
                  className={`ff-input ${comment ? 'ff-input-filled' : ''}`}
                  placeholder={t('requestDetail.addComment')}
                />
                <label htmlFor="rd-comment" className={`ff-label ${comment ? 'ff-label-float' : ''}`}>
                  {t('requestDetail.addComment')}
                </label>
              </div>
            </div>
            <button type="submit" className="btnPrimary text-sm p-sm" style={{ height: 44, alignSelf: 'flex-end' }} disabled={posting}>
              {posting ? '...' : t('requestDetail.post')}
            </button>
          </form>

          {item.comments && item.comments.length > 0 ? (
            <div className="flex-col flex-gap-xs">
              {[...item.comments].reverse().map((c) => (
                <div key={c._id} className="text-sm p-sm bg-gov-bg" style={{ borderRadius: 8 }}>
                  <div className="flex-between mb-xs">
                    <strong className="text-sm">{c.createdBy?.displayName || c.createdBy?.email}</strong>
                    <div className="flex flex-gap-sm">
                      <span className="small muted">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}</span>
                      {(currentUser?.id === c.createdBy?._id || currentUser?.role === 'admin') && (
                        <button onClick={() => handleDeleteComment(c._id)} className="bg-none border-none text-xs p-0 text-red cursor-pointer flex-center gap-xs" aria-label={t('requestDetail.delete')}>
                          <Trash2 size={12} />
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
        </motion.section>

        {item.auditLog && item.auditLog.length > 0 && (
          <motion.aside variants={itemVariants} aria-label={t('requestDetail.activityLog')} className="card mt-lg">
            <h3 className="m-0 mb text-base text-accent-blue flex flex-gap-xs">
              <Clock size={16} aria-hidden="true" />
              {t('requestDetail.activityLog')}
            </h3>
            <div className="flex-col flex-gap-xs">
              {[...item.auditLog].reverse().map((entry, idx) => (
                <div key={`${entry.timestamp}-${entry.action}-${idx}`} className="flex flex-gap-sm text-sm text-muted-extra">
                  <span>{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ''}</span>
                  <span>-</span>
                  <span>{entry.action}</span>
                  {entry.details && <span className="muted">({entry.details})</span>}
                </div>
              ))}
            </div>
          </motion.aside>
        )}

        <motion.div variants={itemVariants} className="card mt-lg">
          <div className="flex-between" style={{ marginBottom: showChat ? 12 : 0 }}>
            <h3 className="m-0 text-base text-accent-blue flex flex-gap-xs">
              <MessageSquare size={16} aria-hidden="true" />
              {t('requestDetail.realTimeChat')}
            </h3>
            <button onClick={() => setShowChat(!showChat)} className="text-sm p-xs" aria-expanded={showChat} aria-controls="chat-panel">
              {showChat ? t('requestDetail.hideChat') : t('requestDetail.openChat')}
            </button>
          </div>
          {showChat && (
            <div id="chat-panel" className="mt-sm overflow-hidden border-gov rounded-sm" style={{ height: 350 }}>
              <Chat requestId={id!} onClose={() => setShowChat(false)} />
            </div>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="card mt-lg">
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
            <form onSubmit={handleFeedbackSubmit} className="card p-sm mb" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 10 }}>
              <div className="ff-group">
                <div className="ff-label-text mb-xs">{t('requestDetail.rating')}</div>
                <div className="flex flex-gap-xs">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setFeedbackRating(star)} className="bg-none border-none text-xl cursor-pointer p-0" style={{ color: star <= feedbackRating ? 'var(--gov-saffron)' : 'var(--border)' }} aria-label={`${star} ${star === 1 ? t('requestDetail.star') || 'star' : t('requestDetail.stars') || 'stars'}`}>
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div className="ff-group m-0">
                <div className={`ff-wrap ${feedbackComment ? 'ff-focused' : ''}`}>
                  <textarea
                    id="rd-feedback"
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    rows={2}
                    className="ff-input ff-textarea"
                    placeholder={t('requestDetail.feedbackPlaceholder')}
                  />
                  <label htmlFor="rd-feedback" className={`ff-label ff-label-with-icon ${feedbackComment ? 'ff-label-float' : ''}`}>
                    {t('requestDetail.feedbackPlaceholder')}
                  </label>
                </div>
              </div>
              <div className="flex flex-gap-sm mt-sm">
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
                      <span key={s} className="text-base" style={{ color: s <= (f.rating ?? 0) ? 'var(--gov-saffron)' : 'var(--gov-border)' }}>★</span>
                    ))}
                    <span className="small muted ml-sm">by {f.submittedBy?.displayName || 'User'}</span>
                  </div>
                  {f.comment && <div>{f.comment}</div>}
                  {f.deliveryConfirmed && (
                    <div className="small mt-xs flex flex-gap-xs" style={{ color: 'var(--color-resolved)' }}>
                      <CheckCircle size={12} />
                      {t('requestDetail.deliveryConfirmed')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            !showFeedbackForm && <div className="muted text-sm">{t('requestDetail.noFeedback')}</div>
          )}
        </motion.div>
      </motion.div>

      <Modal open={!!previewFile} onClose={() => setPreviewFile(null)} title={previewFile?.filename || ''}>
        {previewFile?.mimetype?.startsWith('image/') ? (
          <img src={`${API_BASE}${previewFile.url}`} alt={previewFile.filename} className="rounded" style={{ maxWidth: '100%', maxHeight: '80vh' }} />
        ) : previewFile?.mimetype === 'application/pdf' ? (
          <iframe src={`${API_BASE}${previewFile.url}`} title={previewFile?.filename} className="border-none rounded bg-gov-white" style={{ width: '100%', height: '80vh' }} />
        ) : (
          <div className="text-center p-xl" style={{ borderRadius: 8 }}>
            <div className="mb-lg" style={{ color: 'var(--text-muted)' }}>
              <Paperclip size={48} />
            </div>
            <div className="text-base mb-lg">{previewFile?.filename}</div>
            <a href={`${API_BASE}${previewFile?.url}`} target="_blank" rel="noopener noreferrer" className="btnPrimary text-sm p-sm inline-flex-center gap-xs" aria-label={`${t('common.download')} ${previewFile?.filename}`}>
              <Download size={14} />
              {t('common.download')}
            </a>
          </div>
        )}
      </Modal>

      {ConfirmDialog}
    </article>
  )
}
