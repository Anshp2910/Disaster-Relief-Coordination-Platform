import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import PageTransition from '../components/ui/PageTransition'
import { createStagger } from '../utils/animations'
import { ArrowLeft, Edit, Trash2, MessageSquare, Paperclip, Download, CheckCircle, Clock, MapPin, User, Package, Activity, Share2, Star, Inbox } from 'lucide-react'
import { clientApi } from '../api/client'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { registerRefreshListener } from '../hooks/useSocket'
import { useToast } from '../components/Toast'
import { Modal, ErrorState, PageHeader, ModernSelect } from '../components/ui'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import SteppedProgress from '../components/SteppedProgress'
import { SkeletonCard } from '../components/Skeleton'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../hooks/useConfirm'
import Chat from '../components/ChatPanel'
import { STATUS_COLORS, PRIORITY_COLORS, CATEGORY_COLORS, STATUS_OPTIONS } from '../utils/constants'
import { getErrorMessage } from '../utils/getErrorMessage'
import { API_BASE } from '../api/client'

interface FileItem {
  _id?: string
  id?: string
  url?: string
  filename?: string
  mimetype?: string
  uploadedAt?: string
  uploadedBy?: string
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

const containerVariants = createStagger(0.08)

export default function RequestDetail() {
  useEffect(() => { document.title = 'Disaster Relief - Request Details' }, [])
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
const [deleting, setDeleting] = useState(false)
  const [allocResource, setAllocResource] = useState('')
  const [allocQty, setAllocQty] = useState('')
const [matches, setMatches] = useState<Match[]>([])
const [quickAllocatingId, setQuickAllocatingId] = useState<string | null>(null)
const [showChat, setShowChat] = useState(false)
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
  const [feedbackRating, setFeedbackRating] = useState(5)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [unclaiming, setUnclaiming] = useState(false)
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
const [editCommentText, setEditCommentText] = useState('')
const [editError, setEditError] = useState<string | null>(null)
const [statusUpdating, setStatusUpdating] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()

  async function handleStatusChange(newStatus: string) {
    if (!id || !item || newStatus === item.status) return
    setStatusUpdating(true)
    try {
      const data = await clientApi.updateRequest(id, { status: newStatus }) as { item: RequestDetailItem }
      setItem(data.item)
      toast.success(t('requestDetail.statusUpdated') || 'Status updated')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setStatusUpdating(false)
    }
  }

  const load = useCallback(async () => {
    if (!id) return
    try {
      const data = await clientApi.getRequest(id) as { item: RequestDetailItem }
      setItem(data.item)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadResources = useCallback(async () => {
    try {
      const data = await clientApi.getResources({ status: 'Available', limit: '100' }) as { items?: Resource[] }
      setResources(data.items || [])
    } catch {
      // silent
    }
  }, [])

  const loadFeedback = useCallback(async () => {
    if (!id) return
    try {
      const data = await clientApi.getFeedback(id) as { feedback?: Feedback[] }
      setFeedbackList(data.feedback || [])
    } catch {
      // silent
    }
  }, [id])

  const loadMatches = useCallback(async () => {
    if (!id) return
    try {
      const data = await clientApi.matchResources(id) as { matches?: Match[] }
      setMatches(data.matches || [])
    } catch {
      // silent
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
      if (!id) return
      await clientApi.submitFeedback(id, { rating: feedbackRating, comment: feedbackComment, deliveryConfirmed: true })
      setFeedbackComment('')
      setFeedbackRating(5)
      setShowFeedbackForm(false)
      loadFeedback()
      load()
      toast.success(t('requestDetail.feedbackSubmitted') || 'Feedback submitted')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setFeedbackLoading(false)
    }
  }

async function handleDelete() {
  const ok = await confirm({ message: t('dashboard.deleteConfirm') || 'Are you sure you want to delete this request?', confirmText: t('dashboard.delete'), danger: true })
  if (!ok) return
  setDeleting(true)
  try {
    if (!id) return
    await clientApi.deleteRequest(id)
    toast.success(t('requestDetail.deleted') || 'Request deleted')
    navigate('/')
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    setDeleting(false)
  }
}

  async function handleClaim() {
    if (!id) return
    setClaiming(true)
    try {
      const data = await clientApi.claimRequest(id) as { item: RequestDetailItem }
      setItem(data.item)
      toast.success(t('requestDetail.claimed') || 'Request claimed')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setClaiming(false)
    }
  }

async function handleUnclaim() {
  if (!id) return
  const ok = await confirm({ message: t('dashboard.unclaimConfirm') || 'Are you sure you want to unclaim this request?', confirmText: t('dashboard.unclaim'), danger: true })
  if (!ok) return
  setUnclaiming(true)
  try {
    const data = await clientApi.unclaimRequest(id) as { item: RequestDetailItem }
    setItem(data.item)
    toast.success(t('requestDetail.unclaimed') || 'Request unclaimed')
  } catch (err) {
    toast.error(getErrorMessage(err))
  } finally {
    setUnclaiming(false)
  }
  }

  async function handleComment(e: React.FormEvent) {
    if (!id) return
    e.preventDefault()
    if (!comment.trim()) return
    setPosting(true)
    try {
      const data = await clientApi.addComment(id, comment) as { comments?: CommentItem[] }
      setItem((prev) => ({ ...prev!, comments: data.comments || prev?.comments || [] }))
      setComment('')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setPosting(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!id) return
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true)
    try {
      const data = await clientApi.uploadFiles(id, files) as { files: FileItem[] }
      setItem((prev) => ({ ...prev!, files: data.files }))
      toast.success(t('requestDetail.filesUploaded') || 'Files uploaded')
    } catch (err) {
      toast.error(getErrorMessage(err))
  } finally {
    setUploading(false)
  }
  if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDeleteFile(fileId: string) {
    if (!id) return
    const ok = await confirm({ message: t('requestDetail.deleteFileConfirm'), danger: true })
    if (!ok) return
    try {
      const data = await clientApi.deleteFile(id, fileId) as { files: FileItem[] }
      setItem((prev) => ({ ...prev!, files: data.files }))
      toast.success(t('requestDetail.fileDeleted'))
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!id) return
    const ok = await confirm({ message: t('dashboard.deleteConfirm'), danger: true })
    if (!ok) return
    try {
      await clientApi.deleteComment(id, commentId)
      setItem((prev) => ({ ...prev!, comments: (prev?.comments || []).filter((c: { _id: string }) => c._id !== commentId) }))
      toast.success(t('requestDetail.commentDeleted') || 'Comment deleted')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  function handleStartEdit(c: CommentItem) {
    setEditingCommentId(c._id)
    setEditCommentText(c.text || '')
  }

  function handleCancelEdit() {
    setEditingCommentId(null)
    setEditCommentText('')
  }

  async function handleUpdateComment(commentId: string) {
    if (!id) return
    if (!editCommentText.trim()) return
    try {
      const data = await clientApi.updateComment(id, commentId, editCommentText.trim()) as { comments?: CommentItem[] }
      setItem((prev) => ({ ...prev!, comments: data.comments || prev?.comments || [] }))
      setEditingCommentId(null)
      setEditCommentText('')
      toast.success(t('requestDetail.commentUpdated') || 'Comment updated')
    } catch (err) {
      const msg = getErrorMessage(err)
      if (msg.toLowerCase().includes('5 minutes') || msg.toLowerCase().includes('edited within')) {
        toast.warning(t('requestDetail.editTimeExpired') || 'Edit window expired (5 minutes)')
      } else {
        toast.error(msg)
      }
      setEditingCommentId(null)
      setEditCommentText('')
    }
  }

  function canEdit(c: CommentItem): boolean {
    const commentDate = c.createdAt ? new Date(c.createdAt).getTime() : 0
    const fiveMinAgo = Date.now() - 5 * 60 * 1000
    return commentDate > fiveMinAgo
  }

  async function handleAllocate(e: React.FormEvent) {
    if (!id) return
    e.preventDefault()
    if (!allocResource || !allocQty) return
    setAllocating(true)
  try {
    await clientApi.allocateResource(allocResource, { requestId: id, allocQuantity: Number(allocQty) })
    setAllocResource('')
    setAllocQty('')
    load()
    loadResources()
    toast.success(t('requestDetail.allocatedSuccessfully'))
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setAllocating(false)
    }
  }

  async function quickAllocate(match: Match) {
    if (!id) return
    try {
      await clientApi.allocateResource(match._id, { requestId: id, allocQuantity: Math.min(match.quantity ?? 0, 10) })
      loadResources()
      loadMatches()
      toast.success(t('requestDetail.resourceAllocated'))
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  if (!item) {
    if (loading) return <div className="container"><div className="card"><SkeletonCard lines={4} /></div></div>
    if (error) return <div className="container"><ErrorState message={error} onRetry={load} /></div>
    return (
      <div className="container">
        <EmptyState
          icon={<Inbox size={48} />}
          title="Request not found"
          description="This request may have been removed or you may not have access."
          action={{ onClick: () => navigate('/dashboard'), label: 'Back to Dashboard' }}
        />
      </div>
    )
  }

  return (
    <PageTransition>
      <article className="container" aria-label={`${t('requestDetail.pageTitle') || 'Request Detail'}: ${item.title}`}>
      <PageHeader
        title={item.title || ''}
        actions={
          <button type="button" onClick={() => navigate('/dashboard')} className="flex-center gap-xs" aria-label={t('admin.backToDashboard')}>
            <ArrowLeft size={16} />
            {t('admin.backToDashboard')}
          </button>
        }
      />

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <div className="flex gap-xs mb-lg flex-wrap items-center" role="group" aria-label="Status and priority badges">
          <Badge label={t(`statuses.${item.status}`)} colors={STATUS_COLORS} colorKey={item.status} />
          {(currentUser?.role === 'admin' || currentUser?._id === item.createdBy?._id) && (
            <div className="flex items-center gap-xs ml-xs">
              <label htmlFor="rd-status" className="sr-only">{t('requestDetail.status')}</label>
              <select
                id="rd-status"
                value={item.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={statusUpdating}
                className="status-select"
                aria-label={t('requestDetail.changeStatus')}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} disabled={item.status === 'Resolved' && s !== 'Resolved' && currentUser?.role !== 'admin'}>{t(`statuses.${s}`)}</option>
                ))}
              </select>
              {statusUpdating && <span className="spinner-sm" aria-hidden="true" />}
            </div>
          )}
          <Badge label={t(`priorities.${item.priority}`)} colors={PRIORITY_COLORS} colorKey={item.priority} />
          <Badge label={t(`categories.${item.category}`)} colors={CATEGORY_COLORS} colorKey={item.category} />
        </div>

        <div className="mb-lg">
          <SteppedProgress currentStatus={item.status || 'Open'} />
        </div>

        <div className="grid-3-responsive gap-md">
          <div className="card">
            <h3 className="text-base text-bold text-accent m-0 mb-sm">{t('editRequest.subtitle')}</h3>
            <p className="text-base m-0 leading-normal">{item.description}</p>

            <div className="mt-lg text-sm">
              <div className="mb-xs flex gap-xs">
                <MapPin size={14} className="flex-shrink-0" aria-hidden="true" />
                <span>{item.locationName}</span>
              </div>
              <div className="small muted">{item.lat?.toFixed(4)}, {item.lng?.toFixed(4)}</div>
            </div>

            {(item.peopleCount ?? 0) > 1 && (
              <div className="mt-sm text-sm flex gap-xs">
                <User size={14} className="flex-shrink-0" aria-hidden="true" />
                <span>{t('requestDetail.peopleAffected')} <strong>{item.peopleCount}</strong></span>
              </div>
            )}

            <div className="mt-sm text-sm flex gap-xs">
              <User size={14} className="flex-shrink-0" aria-hidden="true" />
              <span className="small muted">{t('dashboard.postedBy')}</span>{' '}
              <strong>{item.createdBy?.displayName || item.createdBy?.email}</strong>
            </div>

            {item.claimedBy && (
              <div className="mt-sm text-sm p-sm bg-elevated rounded-sm flex gap-xs">
                <Activity size={14} className="flex-shrink-0" aria-hidden="true" />
                <span>
                  {t('requestDetail.claimedBy')} <strong>{item.claimedBy.displayName || item.claimedBy.email}</strong>
                  {item.claimedAt && <span className="small muted"> - {new Date(item.claimedAt).toLocaleDateString()}</span>}
                </span>
              </div>
            )}

            <div className="flex gap-sm mt">
              {!item.claimedBy && item.status === 'Open' && currentUser?.id !== item.createdBy?._id && (
                <button type="button" className="btn-secondary" onClick={handleClaim} disabled={claiming} aria-label="Claim this request">
                  {claiming && <span className="spinner-sm" aria-hidden="true" />} {claiming ? 'Claiming...' : t('dashboard.claim')}
                </button>
              )}
              {item.claimedBy?._id === currentUser?.id && (
                <button type="button" className="btn-danger" onClick={handleUnclaim} disabled={claiming} aria-label="Unclaim this request">
                  {claiming && <span className="spinner-sm" aria-hidden="true" />} {claiming ? 'Unclaiming...' : t('dashboard.unclaim')}
                </button>
              )}
              {(currentUser?.id === item.createdBy?._id || currentUser?.role === 'admin') && (
                <button type="button" onClick={() => navigate(`/requests/${id}/edit`)} className="btn-ghost btn-sm flex-center gap-xs" aria-label="Edit request">
                  <Edit size={14} />
                  {t('dashboard.edit')}
                </button>
              )}
              {(currentUser?.role === 'admin' || currentUser?.id === item.createdBy?._id) && (
                <button type="button" className="btn-danger flex-center gap-xs" onClick={handleDelete} aria-label={t('dashboard.delete')}>
                  <Trash2 size={14} />
                  {t('dashboard.delete')}
                </button>
              )}
            </div>
          </div>

          <div className="card">
            <h3 className="m-0 mb text-base text-accent flex gap-xs">
              <Paperclip size={16} aria-hidden="true" />
              {t('requestDetail.files')}
            </h3>
            {item.files?.length ? (
              <div className="flex-col gap-sm">
                {item.files.map((f) => (
                  <div key={f._id || f.id || f.url} className="flex gap-sm p-xs bg-card rounded-sm">
                    {f.mimetype?.startsWith('image/') ? (
                      <button type="button" className="btn-ghost p-0" onClick={() => setPreviewFile(f)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPreviewFile(f) } }}>                          <img src={`${API_BASE}${f.url}`} alt={f.filename} loading="lazy" className="object-cover rounded-sm" style={{ width: 40, height: 40 }} />
                      </button>
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
                      <button type="button" onClick={() => setPreviewFile(f)} className="text-xs p-xs">{t('requestDetail.preview') || 'Preview'}</button>
                    )}
                    <a href={`${API_BASE}${f.url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-accent" aria-label={`${t('requestDetail.open')} ${f.filename}`}>
                      <Download size={14} />
                    </a>
                    {(f.uploadedBy && (currentUser?._id === f.uploadedBy || currentUser?.role === 'admin')) && (
                      <button type="button" onClick={() => handleDeleteFile(f._id ?? '')} className="text-xs p-xs text-danger" aria-label={`${t('common.delete')} ${f.filename}`}><Trash2 size={14} /></button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="muted text-sm">{t('requestDetail.noFiles')}</div>
            )}
            <div className="mt">
              <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} id="file-upload" aria-label={t('requestDetail.uploadFiles')} />
              <button type="button" onClick={() => document.getElementById('file-upload')?.click()} className="btn-ghost btn-sm">
                {uploading ? t('editRequest.saving') : t('requestDetail.uploadFiles')}
              </button>
            </div>
          </div>

          <div className="card">
            <h3 className="m-0 mb text-base text-accent flex gap-xs">
              <Package size={16} aria-hidden="true" />
              {t('requestDetail.allocateResources')}
            </h3>
            <form onSubmit={handleAllocate} className="flex gap-sm flex-wrap items-end">
              <div className="flex-1" style={{ minWidth: 180 }}>
                <ModernSelect
                  label={t('requestDetail.selectResource')}
                  options={[
                    { label: t('requestDetail.selectResource'), value: '' },
                    ...resources.map((r) => ({ label: `${r.name} (${r.quantity} ${r.unit} ${t('requestDetail.available')})`, value: r._id }))
                  ]}
                  value={allocResource}
                  onChange={(v) => setAllocResource(v)}
                />
              </div>
              <div className="ff-group flex-shrink-0" style={{ width: 100 }}>
                <div className={`ff-wrap ${allocQty ? 'ff-focused' : ''}`}>
                  <input id="rd-qty" type="number" value={allocQty} onChange={(e) => setAllocQty(e.target.value)} required min="1" className={`ff-input ${allocQty ? 'ff-input-filled' : ''}`} placeholder=" " />
                  <label htmlFor="rd-qty" className={`ff-label ${allocQty ? 'ff-label-float' : ''}`}>{t('requestDetail.qty')}</label>
                </div>
              </div>
              <button type="submit" disabled={allocating || !allocResource || !allocQty} className="btn-primary btn-sm">
                {allocating && <span className="spinner-sm" aria-hidden="true" />} {allocating ? 'Allocating...' : t('requestDetail.allocate')}
              </button>
            </form>
            {resources.length === 0 && (
              <div className="muted small mt-sm">{t('requestDetail.noAvailableResources')}</div>
            )}
          </div>
        </div>

        {matches.length > 0 && (
          <div className="card mt-lg">
            <h3 className="m-0 mb text-base text-accent flex gap-xs">
              <Share2 size={16} aria-hidden="true" />
              {t('requestDetail.suggestedResources') || 'Suggested Resources'} ({matches.length})
            </h3>
            <div className="text-sm text-muted-extra mb-xs">
              {t('requestDetail.autoMatched')}
            </div>
            <div className="flex-col gap-sm">
              {matches.map((m) => (
                <div key={m._id} className="flex-between text-sm p-sm bg-card rounded-sm">
                  <div className="flex-1 min-w-0">
                    <div className="text-semi">{m.name}</div>
                    <div className="text-sm text-muted-extra mt-xs">
                      {m.quantity} {m.unit} {t('requestDetail.available')}
                      {m.distanceKm != null && <span> &mdash; {m.distanceKm} {t('requestDetail.kmAway')}</span>}                            {m.categoryMatch && <span className="govt-badge govt-badge-green ml-sm text-xs flex-center gap-xs"><CheckCircle size={10} /> {t('matching.exactMatch')}</span>}
                    </div>
                  </div>
                  <button type="button" onClick={() => quickAllocate(m)} className="btn-ghost btn-sm flex-shrink-0">
                    {t('requestDetail.quickAllocate')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <section aria-label={t('requestDetail.comments')} aria-live="polite" className="card mt-lg">
          <h3 className="m-0 mb text-base text-accent flex gap-xs">
            <MessageSquare size={16} aria-hidden="true" />
            {t('requestDetail.comments')} ({item.comments?.length || 0})
          </h3>

          <form onSubmit={handleComment} className="flex gap-sm mb-lg">
            <div className="ff-group flex-1 m-0">
              <div className={`ff-wrap ${comment ? 'ff-focused' : ''}`}>
                <input
                  id="rd-comment"
                  type="text"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  required
                  maxLength={2000}
                  className={`ff-input ${comment ? 'ff-input-filled' : ''}`}
                  placeholder={t('requestDetail.addComment')}
                />
                <label htmlFor="rd-comment" className={`ff-label ${comment ? 'ff-label-float' : ''}`}>
                  {t('requestDetail.addComment')}
                </label>
              </div>
            </div>
            <button type="submit" className="btn-primary btn-sm" disabled={posting}>
              {posting && <span className="spinner-sm" aria-hidden="true" />} {posting ? 'Posting...' : t('requestDetail.post')}
            </button>
          </form>

          {item.comments && item.comments.length > 0 ? (
            <div className="flex-col gap-xs">
              {[...item.comments].reverse().map((c) => {
                const isEditing = editingCommentId === c._id
                const isAuthorOrAdmin = currentUser?.id === c.createdBy?._id || currentUser?.role === 'admin'
                const withinEditWindow = canEdit(c)

                return (
                  <div key={c._id} className={`text-sm p-sm bg-card rounded-sm ${isEditing ? 'border-gov' : ''}`} style={{ border: isEditing ? '1px solid var(--accent)' : '1px solid transparent' }}>
                    {isEditing ? (
                      <>
                        <div className="ff-group m-0">
                          <div className={`ff-wrap ${editCommentText ? 'ff-focused' : ''}`}>
                            <input
                              type="text"
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                              maxLength={2000}
                              className={`ff-input ${editCommentText ? 'ff-input-filled' : ''}`}
                              placeholder={t('requestDetail.editComment') || 'Edit your comment...'}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  handleUpdateComment(c._id)
                                }
                                if (e.key === 'Escape') {
                                  handleCancelEdit()
                                }
                              }}
                            />
                            <label className={`ff-label ${editCommentText ? 'ff-label-float' : ''}`}>
                              {t('requestDetail.editComment') || 'Edit your comment...'}
                            </label>
                          </div>
                        </div>
                        <div className="flex gap-sm mt-xs">
                          <button
                            type="button"
                            onClick={() => handleUpdateComment(c._id)}
                            disabled={!editCommentText.trim()}
                            className="btn-sm btn-primary"
                          >
                            <CheckCircle size={12} />
                            {t('common.save') || 'Save'}
                          </button>
                          <button type="button" onClick={handleCancelEdit} className="text-xs btn-ghost">{t('common.cancel') || 'Cancel'}</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex-between mb-xs">
                          <strong className="text-sm">{c.createdBy?.displayName || c.createdBy?.email}</strong>
                          <div className="flex gap-sm">
                            <span className="small muted">
                              {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}
                            </span>
                            {isAuthorOrAdmin && withinEditWindow && (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(c)}
                                className="btn-ghost text-xs p-0 flex-center gap-xs text-accent"
                                aria-label={t('requestDetail.edit') || 'Edit'}
                              >
                                {t('requestDetail.edit') || 'Edit'}
                              </button>
                            )}
                            {isAuthorOrAdmin && (
                              <button type="button" onClick={() => handleDeleteComment(c._id)} className="btn-ghost text-xs p-0 text-red flex-center gap-xs" aria-label={t('requestDetail.delete')}>
                                <Trash2 size={12} />
                                {t('requestDetail.delete')}
                              </button>
                            )}
                          </div>
                        </div>
                        <div>{c.text}</div>
                        {!withinEditWindow && isAuthorOrAdmin && (
                          <div className="text-3xs text-muted-extra mt-xs">{t('requestDetail.editWindowExpired') || 'Edit window closed (5 min)'}</div>
                        )}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="muted text-sm">{t('requestDetail.noComments')}</div>
          )}
        </section>

        {item.auditLog && item.auditLog.length > 0 && (
          <aside aria-label={t('requestDetail.activityLog')} className="card mt-lg">
            <h3 className="m-0 mb text-base text-accent flex gap-xs">
              <Clock size={16} aria-hidden="true" />
              {t('requestDetail.activityLog')}
            </h3>
            <div className="flex-col gap-xs">
              {[...item.auditLog].reverse().map((entry, idx) => (
                <div key={`${entry.timestamp}-${entry.action}-${idx}`} className="flex gap-sm text-sm text-muted-extra">
                  <span>{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ''}</span>
                  <span>-</span>
                  <span>{entry.action}</span>
                  {entry.details && <span className="muted">({entry.details})</span>}
                </div>
              ))}
            </div>
          </aside>
        )}

        <div className="card mt-lg">
          <div className={`flex-between ${showChat ? 'mb-sm' : 'mb-0'}`}>
            <h3 className="m-0 text-base text-accent flex gap-xs">
              <MessageSquare size={16} aria-hidden="true" />
              {t('requestDetail.realTimeChat')}
            </h3>
            <button type="button" onClick={() => setShowChat(!showChat)} className="text-sm p-xs" aria-expanded={showChat} aria-controls="chat-panel">
              {showChat ? t('requestDetail.hideChat') : t('requestDetail.openChat')}
            </button>
          </div>
          {showChat && (
            <div id="chat-panel" className="mt-sm overflow-hidden border-gov rounded-sm" style={{ height: 350 }}>
              <Chat requestId={id || ''} onClose={() => setShowChat(false)} />
            </div>
          )}
        </div>

        <div className="card mt-lg">
          <div className="flex-between mb">
            <h3 className="m-0 text-base text-accent">
              {t('requestDetail.feedback')} ({feedbackList.length})
            </h3>
            {!showFeedbackForm && (
              <button type="button" onClick={() => setShowFeedbackForm(true)} className="btn-ghost btn-sm">
                {t('requestDetail.giveFeedback')}
              </button>
            )}
          </div>

          {showFeedbackForm && (
            <form onSubmit={handleFeedbackSubmit} className="feedback-card p-sm mb">
              <div className="ff-group">
                <div className="ff-label-text mb-xs">{t('requestDetail.rating')}</div>
                <div className="flex gap-xs">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setFeedbackRating(star)} className="btn-ghost p-0" style={{ color: star <= feedbackRating ? 'var(--gov-saffron)' : 'var(--border)' }} aria-label={`${star} ${star === 1 ? t('requestDetail.star') || 'star' : t('requestDetail.stars') || 'stars'}`}>
                      <Star size={18} fill={star <= feedbackRating ? 'var(--gov-saffron)' : 'transparent'} />
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
                    maxLength={2000}
                    className="ff-input ff-textarea"
                    placeholder={t('requestDetail.feedbackPlaceholder')}
                  />
                  <label htmlFor="rd-feedback" className={`ff-label ${feedbackComment ? 'ff-label-float' : ''}`}>
                    {t('requestDetail.feedbackPlaceholder')}
                  </label>
                </div>
              </div>
              <div className="flex gap-sm mt-sm">
                <button type="submit" disabled={feedbackLoading} className="btn-primary btn-sm">
                  {feedbackLoading && <span className="spinner-sm" aria-hidden="true" />} {feedbackLoading ? 'Submitting...' : t('requestDetail.submit')}
                </button>
                <button type="button" onClick={() => setShowFeedbackForm(false)} className="text-sm">{t('editRequest.cancel')}</button>
              </div>
            </form>
          )}

          {feedbackList.length > 0 ? (
            <div className="flex-col gap-sm">
              {feedbackList.map((f) => (
                <div key={f._id} className="text-sm p-sm bg-card rounded-sm">
                  <div className="flex gap-xs mb-xs">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} style={{ color: s <= (f.rating ?? 0) ? 'var(--gov-saffron)' : 'var(--border)' }}><Star size={14} fill={s <= (f.rating ?? 0) ? 'var(--gov-saffron)' : 'transparent'} /></span>
                    ))}
                    <span className="small muted ml-sm">{t('requestDetail.by')} {f.submittedBy?.displayName || t('common.unknown')}</span>
                  </div>
                  {f.comment && <div>{f.comment}</div>}
                  {f.deliveryConfirmed && (
                    <div className="small mt-xs flex gap-xs text-success">
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
        </div>
      </motion.div>

      <Modal open={!!previewFile} onClose={() => setPreviewFile(null)} title={previewFile?.filename || ''}>
        {previewFile?.mimetype?.startsWith('image/') ? (
          <img src={`${API_BASE}${previewFile.url}`} alt={previewFile.filename} loading="lazy" className="rounded" style={{ maxHeight: '80vh' }} />
        ) : previewFile?.mimetype === 'application/pdf' ? (
          <iframe src={`${API_BASE}${previewFile.url}`} title={previewFile?.filename} className="w-full border-none rounded bg-gov-white" style={{ height: '80vh' }} />
        ) : (
          <div className="text-center p-xl rounded">
            <div className="mb-lg text-muted">
              <Paperclip size={48} />
            </div>
            <div className="text-base mb-lg">{previewFile?.filename}</div>
            <button type="button" onClick={() => window.open(`${API_BASE}${previewFile?.url}`, '_blank', 'noopener,noreferrer')} className="btn-primary btn-sm flex-center gap-xs" aria-label={`${t('common.download')} ${previewFile?.filename}`}>
              <Download size={14} />
              {t('common.download')}
            </button>
          </div>
        )}
      </Modal>

      {ConfirmDialog}
    </article>
    </PageTransition>
  )
}
