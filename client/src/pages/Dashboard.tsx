import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { createStagger, createListItem } from '../utils/animations'
import { RippleBtn, PageTransition } from '../components/ui'
import {
  Sun,
} from 'lucide-react'
import { clientApi } from '../api/client'
import { SkeletonList } from '../components/Skeleton'
import { useConfirm } from '../hooks/useConfirm'
import { registerRefreshListener } from '../hooks/useSocket'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../hooks/useSocket'
import { STATUS_COLORS, PRIORITY_COLORS } from '../utils/constants'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'

interface Item {
  _id: string
  title?: string
  status?: string
  priority?: string
  category?: string
  description?: string
  locationName?: string
  lat?: number
  lng?: number
  createdAt?: string
  createdBy?: { _id?: string; displayName?: string; email?: string }
  claimedBy?: { _id?: string; displayName?: string; email?: string }
  matchedResources?: unknown[]
}

interface OwnerActionsProps {
  id: string
  item: Item
  onChanged: () => void
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 18) return 'Good Afternoon'
  return 'Good Evening'
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

const containerVariants = createStagger(0.05)
const itemVariants = createListItem(16, 0.35)
const fadeUp = createListItem(16, 0.3)

export default function Dashboard() {
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterPriority, setFilterPriority] = useState('All')
  const [filterCategory, setFilterCategory] = useState('All')
  const [sortBy, setSortBy] = useState('-createdAt')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const navigate = useNavigate()
  const { t } = useTranslation()
  const [greeting] = useState(getGreeting)
  const [currentDate] = useState(formatDate)

  const { user: currentUser } = useAuth()
  const { connected } = useSocket()

  const displayName = currentUser?.displayName || currentUser?.email || 'User'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string | number | undefined> = { page, limit: 12, sort: sortBy }
      if (filterStatus !== 'All') params.status = filterStatus
      if (filterPriority !== 'All') params.priority = filterPriority
      if (filterCategory !== 'All') params.category = filterCategory
      const data = await clientApi.getRequests(params) as { items?: Item[]; pages?: number; total?: number }
      setItems(data.items || [])
      setTotalPages(data.pages || 1)
      setTotal(data.total || 0)
    } catch (e) {
      setError((e as Error).message || t('dashboard.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus, filterPriority, filterCategory, sortBy, t])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    return registerRefreshListener(
      ['request:created', 'request:updated', 'request:deleted', 'request:commented', 'resource:allocated'],
      () => { load() }
    )
  }, [load])

  const filterOptions = useMemo(() => [
    { key: 'All', label: t('dashboard.filterAll') },
    { key: 'Open', label: t('statuses.Open') },
    { key: 'Pending', label: t('statuses.Pending') },
    { key: 'In Progress', label: t('statuses.In Progress') },
    { key: 'Resolved', label: t('statuses.Resolved') },
    { key: 'Fulfilled', label: t('statuses.Fulfilled') },
  ], [t])

  const priorityOptions = useMemo(() => [
    { key: 'All', label: t('dashboard.filterAll') },
    { key: 'Critical', label: t('priorities.Critical') },
    { key: 'High', label: t('priorities.High') },
    { key: 'Medium', label: t('priorities.Medium') },
    { key: 'Low', label: t('priorities.Low') },
  ], [t])

  const categoryOptions = useMemo(() => [
    { key: 'All', label: t('dashboard.filterAll') },
    { key: 'Medical', label: t('categories.Medical') },
    { key: 'Food', label: t('categories.Food') },
    { key: 'Shelter', label: t('categories.Shelter') },
    { key: 'Water', label: t('categories.Water') },
    { key: 'Rescue', label: t('categories.Rescue') },
    { key: 'Supplies', label: t('categories.Supplies') },
    { key: 'Healthcare', label: t('categories.Healthcare') },
    { key: 'Sanitation', label: t('categories.Sanitation') },
    { key: 'Clothing', label: t('categories.Clothing') },
    { key: 'Transportation', label: t('categories.Transportation') },
    { key: 'Communication', label: t('categories.Communication') },
    { key: 'Power', label: t('categories.Power') },
    { key: 'Infrastructure', label: t('categories.Infrastructure') },
    { key: 'Other', label: t('categories.Other') },
  ], [t])

  const sortOptions = useMemo(() => [
    { key: '-createdAt', label: t('dashboard.sortNewest') },
    { key: 'createdAt', label: t('dashboard.sortOldest') },
    { key: '-priority', label: t('dashboard.sortPriorityDesc') },
    { key: 'priority', label: t('dashboard.sortPriorityAsc') },
    { key: 'title', label: t('dashboard.sortTitleAsc') },
    { key: '-title', label: t('dashboard.sortTitleDesc') },
  ], [t])

  return (
    <PageTransition>
      <motion.div className="container" variants={containerVariants} initial="hidden" animate="visible">
        {/* ── GREETING ── */}
        <motion.div className="mb-lg" variants={fadeUp}>
          <motion.div className="bento-card" variants={itemVariants}>
            <div className="flex items-center gap-sm mb-sm">
              <div className="bento-icon bento-icon-accent">
                <Sun size={20} />
              </div>
              <div>
                <div className="text-base greeting-text">{greeting}, {displayName.split(' ')[0]}</div>
                <div className="text-xs text-muted">{currentDate}</div>
              </div>
            </div>
            <div className="flex items-center gap-sm">
              <span className={`live-dot ${connected ? '' : 'live-dot--disconnected'}`}>
                {connected ? t('dashboard.live') : t('dashboard.offline')}
              </span>
              {total > 0 && (
                <span className="text-xs text-muted">{total} {t('dashboard.totalRequests')}</span>
              )}
            </div>
          </motion.div>
        </motion.div>

        {/* ── REQUESTS LIST ── */}
        <motion.div className="card" variants={fadeUp}>
          <div className="flex-between mb-md">
            <h2 className="text-lg text-bold m-0">{t('dashboard.allRequests')}</h2>
            <div className="flex flex-gap-sm">
              <RippleBtn onClick={load} className="text-sm p-xs refresh-btn">
                {t('dashboard.refresh') || 'Refresh'}
              </RippleBtn>
            </div>
          </div>
          {error ? <div className="errorText">{error}</div> : null}
          <nav aria-label="Filters">
            <motion.div className="flex flex-gap-sm mt-md flex-wrap" variants={fadeUp}>
              {filterOptions.map((f) => (
                <motion.button key={f.key} onClick={() => { setFilterStatus(f.key); setPage(1) }} className={`filter-pill ${filterStatus === f.key ? 'active' : ''}`} aria-label={f.label} whileTap={{ scale: 0.95 }}>{f.label}</motion.button>
              ))}
            </motion.div>
            <motion.div className="flex flex-gap-sm mt-sm flex-wrap" variants={fadeUp}>
              {priorityOptions.map((p) => (
                <motion.button key={p.key} onClick={() => { setFilterPriority(p.key); setPage(1) }} className={`filter-pill ${filterPriority === p.key ? 'active' : ''} text-xs`} aria-label={p.label} whileTap={{ scale: 0.95 }}>{p.label}</motion.button>
              ))}
            </motion.div>
            <div className="flex flex-wrap flex-gap-sm mt-sm items-center">
              <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1) }} className="rounded-sm text-sm border-gov p-xs">
                {categoryOptions.map((c) => (
                  <option key={c.key} value={c.key}>{c.key === 'All' ? t('dashboard.allCategories') : c.label}</option>
                ))}
              </select>
              <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1) }} className="rounded-sm text-sm border-gov p-xs">
                {sortOptions.map((s) => (
                  <option key={s.key} value={s.key}>{s.label}</option>
                ))}
              </select>
            </div>
          </nav>
          <section aria-label={t('dashboard.title')} role="region" aria-live="polite">
            {loading ? (
              <SkeletonList count={4} lines={3} />
            ) : (
              <>
                <motion.div className="gridGap mt-lg" variants={fadeUp}>
                  {items.length === 0 ? (
                    <EmptyState icon="📋" title={t('dashboard.noRequests')} description={t('dashboard.noRequestsDesc') || 'No requests match your filters'} />
                  ) : (
                    items.map((it) => (
                      <motion.div key={it._id} className="listCard cursor-pointer" role="button" tabIndex={0} onClick={() => navigate(`/requests/${it._id}`)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/requests/${it._id}`) } }} whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
                        <div className="flex-between flex-gap-sm">
                          <div className="flex-1 min-w-0">
                            <div className="text-bold text-accent-blue text-15">{it.title}</div>
                            <div className="flex flex-gap-sm mt-sm flex-wrap">
                              <Badge label={t(`statuses.${it.status || 'Open'}`)} colors={STATUS_COLORS} colorKey={it.status || 'Open'} />
                              <Badge label={t(`priorities.${it.priority || 'Medium'}`)} colors={PRIORITY_COLORS} colorKey={it.priority || 'Medium'} />
                              <span className="govt-badge govt-badge-blue">{t(`categories.${it.category || 'Other'}`)}</span>
                              {it.matchedResources && it.matchedResources.length > 0 && (
                                <span className="govt-badge govt-badge-green" title={`${it.matchedResources.length} matched resources`}>
                                  {it.matchedResources.length} Match{it.matchedResources.length > 1 ? 'es' : ''}
                                </span>
                              )}
                            </div>
                            <div className="muted mt-sm text-base">{it.description && it.description.length > 120 ? it.description.slice(0, 120) + '...' : it.description}</div>
                            <div className="small mt-sm">{it.locationName}</div>
                            {it.createdBy && <div className="small mt-xs">{t('dashboard.postedBy')} {it.createdBy.displayName || it.createdBy.email || t('dashboard.unknown')}</div>}
                            {it.claimedBy && <div className="small mt-xs text-accent-orange">{t('dashboard.claimedBy')} {it.claimedBy.displayName || it.claimedBy.email}</div>}
                          </div>
                          <OwnerActions id={it._id} item={it} onChanged={load} />
                        </div>
                      </motion.div>
                    ))
                  )}
                </motion.div>
                {totalPages > 1 && (
                  <div className="flex flex-center flex-gap-sm mt-lg">
                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="text-sm p-xs" aria-label={t('dashboard.previous')}>{t('dashboard.previous')}</button>
                    <span className="text-sm p-xs">{page} / {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="text-sm p-xs" aria-label={t('dashboard.next')}>{t('dashboard.next')}</button>
                  </div>
                )}
              </>
            )}
          </section>
        </motion.div>
      </motion.div>
    </PageTransition>
  )
}

const OwnerActions = (function OwnerActions({ id, item, onChanged }: OwnerActionsProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const toast = useToast()
  const { user } = useAuth()
  const [deleting, setDeleting] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()
  const isOwner = user?.id && item.createdBy && item.createdBy._id ? item.createdBy._id === user.id : user?.id && String(item.createdBy) === String(user.id)
  const canEdit = isOwner || user?.role === 'admin'

  async function del(e: React.MouseEvent) {
    e.stopPropagation()
    const ok = await confirm({ message: t('dashboard.deleteConfirm'), confirmText: t('dashboard.delete'), danger: true })
    if (!ok) return
    setDeleting(true)
    try { await clientApi.deleteRequest(id); onChanged() } catch (e) { toast.error((e as Error).message || 'Failed to delete') } finally { setDeleting(false) }
  }

  function edit(e: React.MouseEvent) { e.stopPropagation(); navigate(`/requests/${id}/edit`) }

  return (
    <div className="flex flex-col flex-gap-sm items-end">
      <RippleBtn disabled={!canEdit} onClick={edit} className="text-sm p-xs" aria-label={t('dashboard.edit')}>{t('dashboard.edit')}</RippleBtn>
      <button disabled={!canEdit || deleting} onClick={del} className="btnDanger text-sm p-xs" aria-label={deleting ? t('dashboard.deleting') : t('dashboard.delete')}>{deleting ? t('dashboard.deleting') : t('dashboard.delete')}</button>
      {ConfirmDialog}
    </div>
  )
})
