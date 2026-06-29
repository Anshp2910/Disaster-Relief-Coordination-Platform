import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { createStagger, createListItem } from '../utils/animations'
import { ArrowLeft, Edit, Trash2, MessageSquare, Paperclip, Download, CheckCircle, Clock, MapPin, User, Package, Activity, Share2 } from 'lucide-react'
import { clientApi } from '../api/client'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { registerRefreshListener } from '../hooks/useSocket'
import { useToast } from '../components/Toast'
import { Modal, ErrorState, PageHeader, RippleBtn, PageTransition } from '../components/ui'
import Badge from '../components/Badge'
import { SkeletonCard } from '../components/Skeleton'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../hooks/useConfirm'
import Chat from './Chat'
import { STATUS_COLORS, PRIORITY_COLORS } from '../utils/constants'
import { getErrorMessage } from '../utils/getErrorMessage'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

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
const itemVariants = createListItem(12, 0.35)

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
    try {
      if (!id) return
      await clientApi.deleteRequest(id)
      toast.success(t('requestDetail.deleted') || 'Request deleted')
      navigate('/')
    } catch (err) {
      toast.error(getErrorMessage(err))
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
    setClaiming(true)
    try {
      const data = await clientApi.unclaimRequest(id) as { item: RequestDetailItem }
      setItem(data.item)
      toast.success(t('requestDetail.unclaimed') || 'Request unclaimed')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setClaiming(false)
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
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDeleteFile(fileId: string) {
    if (!id) return
    const ok = await confirm({ message: 'Delete this file?', danger: true })
    if (!ok) return
    try {
      const data = await clientApi.deleteFile(id, fileId) as { files: FileItem[] }
      setItem((prev) => ({ ...prev!, files: data.files }))
      toast.success('File deleted')
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

  async function handleAllocate(e: React.FormEvent) {
    if (!id) return
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

  if (loading) return (
    <PageTransition>
      <div className="container"><div className="card"><SkeletonCard lines={4} /></div></div>
    </PageTransition>
  )

  if (error) return (
    <PageTransition>
      <div className="container">
        <ErrorState message={error} onRetry={load} />
      </div>
    </PageTransition>
  )

  if (!item) return null

  return (
    <PageTransition>
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

      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <motion.div variants={itemVariants} className="flex flex-gap-xs mb-lg flex-wrap" role="group" aria-label="Status and priority badges">
          <Badge label={t(`statuses.${item.status}`)} colors={STATUS_COLORS} colorKey={item.status} />
          <Badge label={t(`priorities.${item.priority}`)} colors={PRIORITY_COLORS} colorKey={item.priority} />
          <span className="govt-badge govt-badge-blue">{t(`categories.${item.category}`)}</span>
        </motion.div>

        <div className="grid-3-responsive gap-16">
          <motion.div variants={itemVariants} className="card">
            <h3 className="text-base text-bold text-accent-blue" style={{ margin: '0 0 var(--space-xsml)' }}>{t('editRequest.subtitle')}</h3>
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
                <RippleBtn className="" onClick={handleClaim} disabled={claiming} aria-label={t('dashboard.claim')}>
                  {claiming ? '...' : t('dashboard.claim')}
                </RippleBtn>
              )}
              {item.claimedBy?._id === currentUser?.id && (
                <button className="btn-danger" onClick={handleUnclaim} disabled={claiming} aria-label={t('dashboard.unclaim')}>
                  {claiming ? '...' : t('dashboard.unclaim')}
                </button>
              )}
              {(currentUser?.id === item.createdBy?._id || currentUser?.role === 'admin') && (
                <button onClick={() => navigate(`/requests/${id}/edit`)} className="btn-ghost btn-sm flex-center gap-xs" aria-label={t('dashboard.edit')}>
                  <Edit size={14} />
                  {t('dashboard.edit')}
                </button>
              )}
              {(currentUser?.role === 'admin' || currentUser?.id === item.createdBy?._id) && (
                <button className="btn-danger flex-center gap-xs" onClick={handleDelete} aria-label={t('dashboard.delete')}>
                  <Trash2 size={14} />
                  {t('dashboard.delete')}
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
                  <div key={f._id || f.id || f.url} className="flex flex-gap-sm p-xs bg-card rounded-sm">
                    {f.mimetype?.startsWith('image/') ? (
                      <button type="button" className="bg-none border-none cursor-pointer p-0" onClick={() => setPreviewFile(f)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPreviewFile(f) } }}>
                        <img src={`${API_BASE}${f.url}`} alt={f.filename} loading="lazy" className="object-cover rounded-sm w-40 h-40" />
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
                      <button onClick={() => setPreviewFile(f)} className="text-xs p-xs">{t('requestDetail.preview') || 'Preview'}</button>
                    )}
                    <a href={`${API_BASE}${f.url}`} target="_blank" rel="noopener noreferrer" className="text-sm text-accent-blue" aria-label={`${t('requestDetail.open')} ${f.filename}`}>
                      <Download size={14} />
                    </a>
                    {(f.uploadedBy && (currentUser?._id === f.uploadedBy || currentUser?.role === 'admin')) && (
                      <button onClick={() => handleDeleteFile(f._id ?? '')} className="text-xs p-xs text-danger" aria-label={`${t('common.delete')} ${f.filename}`}><Trash2 size={14} /></button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="muted text-sm">{t('requestDetail.noFiles')}</div>
            )}
            <div className="mt">
              <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} id="file-upload" aria-label={t('requestDetail.uploadFiles')} />
              <RippleBtn onClick={() => document.getElementById('file-upload')?.click()} className="inline-block cursor-pointer text-12 p-sm">
                {uploading ? t('editRequest.saving') : t('requestDetail.uploadFiles')}
              </RippleBtn>
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
              <RippleBtn type="submit" disabled={allocating || !allocResource || !allocQty} className="text-sm p-sm">
                {allocating ? '...' : t('requestDetail.allocate')}
              </RippleBtn>
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
                <div key={m._id} className="flex-between text-sm p-sm bg-card rounded-sm">
                  <div className="flex-1 min-w-0">
                    <div className="text-semi">{m.name}</div>
                    <div className="text-sm text-muted-extra mt-xs">
                      {m.quantity} {m.unit} available
                      {m.distanceKm != null && <span> - {m.distanceKm} km away</span>}
                      {m.categoryMatch && <span className="govt-badge govt-badge-green ml-sm text-10 flex-center gap-xs"><CheckCircle size={10} /> {t('matching.exactMatch')}</span>}
                    </div>
                  </div>
                  <RippleBtn onClick={() => quickAllocate(m)} className="text-xs flex-shrink-0 p-xs">
                    Quick Allocate
                  </RippleBtn>
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
            <RippleBtn type="submit" className="text-sm p-sm" style={{ height: 44, alignSelf: 'flex-end' }} disabled={posting}>
              {posting ? '...' : t('requestDetail.post')}
            </RippleBtn>
          </form>

          {item.comments && item.comments.length > 0 ? (
            <div className="flex-col flex-gap-xs">
              {[...item.comments].reverse().map((c) => (
                <div key={c._id} className="text-sm p-sm bg-card" style={{ borderRadius: 8 }}>
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
          <div className={`flex-between ${showChat ? 'mb-sm' : 'mb-0'}`}>
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
              <Chat requestId={id || ''} onClose={() => setShowChat(false)} />
            </div>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="card mt-lg">
          <div className="flex-between mb">
            <h3 className="m-0 text-base text-accent-blue">
              {t('requestDetail.feedback')} ({feedbackList.length})
            </h3>
            {!showFeedbackForm && (
              <RippleBtn onClick={() => setShowFeedbackForm(true)} className="text-sm p-xs">
                {t('requestDetail.giveFeedback')}
              </RippleBtn>
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
                <RippleBtn type="submit" disabled={feedbackLoading} className="text-sm p-sm">
                  {feedbackLoading ? '...' : t('requestDetail.submit')}
                </RippleBtn>
                <button type="button" onClick={() => setShowFeedbackForm(false)} className="text-sm">{t('editRequest.cancel')}</button>
              </div>
            </form>
          )}

          {feedbackList.length > 0 ? (
            <div className="flex-col flex-gap-sm">
              {feedbackList.map((f) => (
                <div key={f._id} className="text-sm p-sm bg-card rounded-sm">
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
          <img src={`${API_BASE}${previewFile.url}`} alt={previewFile.filename} loading="lazy" className="rounded" style={{ maxWidth: '100%', maxHeight: '80vh' }} />
        ) : previewFile?.mimetype === 'application/pdf' ? (
          <iframe src={`${API_BASE}${previewFile.url}`} title={previewFile?.filename} className="border-none rounded bg-gov-white" style={{ width: '100%', height: '80vh' }} />
        ) : (
          <div className="text-center p-xl" style={{ borderRadius: 8 }}>
            <div className="mb-lg" style={{ color: 'var(--text-muted)' }}>
              <Paperclip size={48} />
            </div>
            <div className="text-base mb-lg">{previewFile?.filename}</div>
            <RippleBtn onClick={() => window.open(`${API_BASE}${previewFile?.url}`, '_blank', 'noopener,noreferrer')} className="text-sm p-sm inline-flex-center gap-xs" aria-label={`${t('common.download')} ${previewFile?.filename}`}>
              <Download size={14} />
              {t('common.download')}
            </RippleBtn>
          </div>
        )}
      </Modal>

      {ConfirmDialog}
    </article>
    </PageTransition>
  )
}
