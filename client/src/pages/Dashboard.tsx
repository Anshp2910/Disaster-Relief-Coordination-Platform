import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { createStagger } from '../utils/animations'
import {
  AlertTriangle, ClipboardList, Users, BarChart3,
  RefreshCw, Plus, ArrowRight,
} from 'lucide-react'
import { clientApi } from '../api/client'
import { SkeletonList } from '../components/Skeleton'
import { STATUS_COLORS, PRIORITY_COLORS, CATEGORY_COLORS, CATEGORY_OPTIONS } from '../utils/constants'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import { getErrorMessage } from '../utils/getErrorMessage'

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

const containerVariants = createStagger(0.05)

export default function Dashboard() {
  useEffect(() => { document.title = 'Disaster Relief - Dashboard' }, [])
  const [items, setItems] = useState<Item[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshLoading, setRefreshLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterPriority, setFilterPriority] = useState('All')
  const [filterCategory, setFilterCategory] = useState('All')
  const [sortBy, setSortBy] = useState('-createdAt')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string | number | boolean | undefined> = { page, limit: 12, sort: sortBy, summary: true }
      if (filterStatus !== 'All') params.status = filterStatus
      if (filterPriority !== 'All') params.priority = filterPriority
      if (filterCategory !== 'All') params.category = filterCategory
      const data = await clientApi.getRequests(params) as { items?: Item[]; pages?: number }
      setItems(data.items || [])
      setTotalPages(data.pages || 1)
    } catch (e) {
      setError(getErrorMessage(e) || t('dashboard.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus, filterPriority, filterCategory, sortBy, t])

  useEffect(() => { load() }, [load])

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

  return (
    <div className="container">
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <div className="flex-between mb-md mt-md">
          <div>
            <h1 className="pageTitle">{t('dashboard.title') || 'Emergency Command Center'}</h1>
            <p className="text-sm text-muted mt-xs">
              {new Date().toLocaleDateString(i18n.language, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-sm items-center">
            <button onClick={() => { setRefreshLoading(true); load().finally(() => setRefreshLoading(false)) }} className="btn-secondary btn-sm" aria-label={t('dashboard.refresh')}>
              {refreshLoading ? <span className="spinner-sm" aria-hidden="true" /> : <RefreshCw size={14} />}
              <span>{t('dashboard.refresh') || 'Refresh'}</span>
            </button>
            <button onClick={() => navigate('/requests/new')} className="btn-primary btn-sm" aria-label={t('dashboard.createRequest')}>
              <Plus size={14} />
              <span>{t('dashboard.createRequest') || 'New Request'}</span>
            </button>
          </div>
        </div>



        <div className="card">
          <div className="flex-between mb-sm">
            <h2 className="pageTitle-sm flex items-center gap-xs">
              <ClipboardList size={18} />
              {t('dashboard.allRequests') || 'All Requests'}
            </h2>
          </div>

          {error && <ErrorState message={error} onRetry={load} />}

          <div className="flex gap-sm flex-wrap items-center mb-sm">
            {filterOptions.map((f) => (
              <button
                key={f.key}
                onClick={() => { setFilterStatus(f.key); setPage(1) }}
                className={`btn-filter ${filterStatus === f.key ? 'active' : ''}`}
                aria-pressed={filterStatus === f.key}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex gap-sm flex-wrap items-center mb-sm">
            {priorityOptions.map((p) => (
              <button
                key={p.key}
                onClick={() => { setFilterPriority(p.key); setPage(1) }}
                className={`btn-filter text-xs ${filterPriority === p.key ? 'active' : ''}`}
                aria-pressed={filterPriority === p.key}
              >
                {p.label}
              </button>
            ))}
            <div className="filter-group ml-auto">
              <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setPage(1) }} className="filter-select">
                <option value="All">{t('dashboard.allCategories') || 'All Categories'}</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{t(`categories.${c}`)}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1) }} className="filter-select">
                <option value="-createdAt">{t('dashboard.sortNewest')}</option>
                <option value="createdAt">{t('dashboard.sortOldest')}</option>
                <option value="-priority">{t('dashboard.sortPriorityDesc')}</option>
                <option value="priority">{t('dashboard.sortPriorityAsc')}</option>
                <option value="title">{t('dashboard.sortTitleAsc')}</option>
                <option value="-title">{t('dashboard.sortTitleDesc')}</option>
              </select>
            </div>
          </div>

          {loading ? (
            <SkeletonList count={4} lines={3} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<ClipboardList size={32} />}
              title={t('dashboard.noRequests')}
              description={t('dashboard.noRequestsDesc') || 'No requests match your filters.'}
              action={{ onClick: () => navigate('/requests/new'), label: t('dashboard.createRequest') || 'New Request' }}
            />
          ) : (
            <div className="gridGap">
              {items.map((it) => (
                <div
                  key={it._id}
                  className="listCard"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate(`/requests/${it._id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(`/requests/${it._id}`)
                    }
                  }}
                >
                  <div className="flex-between gap-sm">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-xs mb-xs">
                        <span className="text-bold text-accent">{it.title}</span>
                        {it.priority === 'Critical' && (
                          <AlertTriangle size={14} className="text-danger flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex gap-sm flex-wrap mb-xs">
                        <Badge label={t(`statuses.${it.status || 'Open'}`)} colors={STATUS_COLORS} colorKey={it.status || 'Open'} />
                        <Badge label={t(`priorities.${it.priority || 'Medium'}`)} colors={PRIORITY_COLORS} colorKey={it.priority || 'Medium'} />
                        <Badge label={t(`categories.${it.category || 'Other'}`)} colors={CATEGORY_COLORS} colorKey={it.category || 'Other'} />
                        {it.matchedResources && it.matchedResources.length > 0 && (
                          <span className="govt-badge govt-badge-green">{it.matchedResources.length} Resource{it.matchedResources.length > 1 ? 's' : ''}</span>
                        )}
                      </div>
                      {it.description && (
                        <p className="text-sm text-secondary mt-xs">
                          {it.description.length > 120 ? it.description.slice(0, 120) + '...' : it.description}
                        </p>
                      )}
                      <div className="flex items-center gap-sm mt-xs">
                        {it.locationName && <span className="text-xs text-muted">{it.locationName}</span>}
                        {it.createdBy && <span className="text-xs text-muted">{it.createdBy.displayName || it.createdBy.email || ''}</span>}
                        {it.claimedBy && <span className="text-xs text-warning">{t('dashboard.claimedBy') || 'Claimed'}: {it.claimedBy.displayName || it.claimedBy.email}</span>}
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-muted flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-sm mt-lg">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost btn-sm" aria-label={t('dashboard.previous') || 'Previous'}>
                {t('dashboard.previous') || 'Previous'}
              </button>
              <span className="text-sm text-muted">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="btn-ghost btn-sm" aria-label={t('dashboard.next') || 'Next'}>
                {t('dashboard.next') || 'Next'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}