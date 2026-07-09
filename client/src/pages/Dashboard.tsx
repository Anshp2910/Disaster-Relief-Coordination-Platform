import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { createStagger, createListItem } from '../utils/animations'
import { RippleBtn, PageTransition } from '../components/ui'
import {
  AlertTriangle,
  ClipboardList,
  MapPin,
  Users,
  RefreshCw,
  Plus,
  ArrowRight,
  BarChart3,
  LayoutDashboard,
} from 'lucide-react'
import { clientApi } from '../api/client'
import { SkeletonList } from '../components/Skeleton'
import { registerRefreshListener } from '../hooks/useSocket'
import { useAuth } from '../context/AuthContext'
import { STATUS_COLORS, PRIORITY_COLORS, CATEGORY_COLORS, CATEGORY_OPTIONS } from '../utils/constants'
import Badge from '../components/Badge'
import EmptyState from '../components/EmptyState'
import { getErrorMessage } from '../utils/getErrorMessage'
import RiskWidget from '../components/RiskWidget'
import RequestsChart from '../components/RequestsChart'
import DashboardMap from '../components/DashboardMap'
import TaskList from '../components/TaskList'

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

interface Stats {
  totalUsers: number
  totalRequests: number
  byStatus?: Record<string, number>
  byCategory?: Record<string, number>
  byPriority?: Record<string, number>
  dailyRequests?: Array<{ date: string; count: number }>
}

function formatDate(i18nLng: string): string {
  return new Date().toLocaleDateString(i18nLng, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

const containerVariants = createStagger(0.05)
const fadeUp = createListItem(16, 0.3)

export default function Dashboard() {
  useEffect(() => { document.title = 'Disaster Relief - Dashboard' }, [])
  const [items, setItems] = useState<Item[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterPriority, setFilterPriority] = useState('All')
  const [filterCategory, setFilterCategory] = useState('All')
  const [sortBy, setSortBy] = useState('-createdAt')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const currentDate = formatDate(i18n.language)

  const { user: currentUser } = useAuth()

  const chartData = useMemo(() => stats?.dailyRequests?.map((d) => ({ date: d.date, count: d.count })) || [], [stats?.dailyRequests])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string | number | boolean | undefined> = { page, limit: 12, sort: sortBy, summary: true }
      if (filterStatus !== 'All') params.status = filterStatus
      if (filterPriority !== 'All') params.priority = filterPriority
      if (filterCategory !== 'All') params.category = filterCategory
      const data = await clientApi.getRequests(params) as { items?: Item[]; pages?: number; total?: number; byStatus?: Record<string, number>; byPriority?: Record<string, number>; byCategory?: Record<string, number>; dailyRequests?: Array<{ date: string; count: number }> }
      setItems(data.items || [])
      setTotalPages(data.pages || 1)
      setStats({
        totalRequests: data.total || 0,
        byStatus: data.byStatus,
        byPriority: data.byPriority,
        byCategory: data.byCategory,
        dailyRequests: data.dailyRequests?.map((d) => ({ date: d.date, count: d.count })),
        totalUsers: currentUser ? 1 : 0,
      })
    } catch (e) {
      setError(getErrorMessage(e) || t('dashboard.failedToLoad'))
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus, filterPriority, filterCategory, sortBy, t, currentUser])

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
    ...CATEGORY_OPTIONS.map((c) => ({ key: c, label: t(`categories.${c}`) })),
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
      <motion.div
        className="container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* ── PAGE HEADER ── */}
        <motion.div className="flex-between mb-md" variants={fadeUp}>
          <div>
            <h1 className="pageTitle">{t('dashboard.title') || 'Emergency Command Center'}</h1>
            <p className="text-sm text-muted mt-xs">{currentDate}</p>
          </div>
          <div className="flex gap-sm items-center">            <RippleBtn onClick={load}
              className="btn-secondary btn-sm"
              aria-label={t('dashboard.refresh')}
            >
              <RefreshCw size={14} />
              <span>{t('dashboard.refresh') || 'Refresh'}</span>
            </RippleBtn>
            <RippleBtn
              onClick={() => navigate('/requests/new')}
              className="btn-primary btn-sm"
              aria-label={t('dashboard.createRequest')}
            >
              <Plus size={14} />
              <span>{t('dashboard.createRequest') || 'New Request'}</span>
            </RippleBtn>
          </div>
        </motion.div>

        {/* ── VISUALIZATION BENTO GRID ── */}
        <motion.div className="bento-grid mb-sm" variants={fadeUp}>
          {(loading || stats) && (
            <div className="bento-card">
              <RiskWidget stats={stats} loading={loading} />
            </div>
          )}
          <div className="bento-card bento--wide">
            <RequestsChart data={chartData} />
          </div>
          <div className="bento-card bento--wide">
            <div className="bento-card-scroll-content">
              <TaskList requests={items} loading={loading} />
            </div>
          </div>
        </motion.div>

        <DashboardMap />

        {/* ── QUICK ACTION NAV ── */}
        <motion.div className="mb-sm" variants={fadeUp}>
          <div className="quick-actions">
            <button
              type="button"
              onClick={() => navigate('/map')}
              className="quick-action-card"
              aria-label={t('common.viewMap')}
            >
              <MapPin size={20} />
              <span>{t('common.viewMap') || 'View Map'}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/resources')}
              className="quick-action-card"
              aria-label={t('common.resources')}
            >
              <Users size={20} />
              <span>{t('common.resources') || 'Resources'}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/incidents')}
              className="quick-action-card"
              aria-label={t('nav.incidents')}
            >
              <AlertTriangle size={20} />
              <span>{t('nav.incidents') || 'Incidents'}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="quick-action-card"
              aria-label={t('admin.title')}
            >
              <BarChart3 size={20} />
              <span>{t('admin.title') || 'Admin'}</span>
            </button>
          </div>
        </motion.div>

        {/* ── REQUESTS SECTION ── */}
        <motion.div className="card dashboard-list-constrained" variants={fadeUp}>
          <div className="flex-between mb-sm">
            <div className="flex items-center gap-xs">
              <LayoutDashboard size={18} className="text-accent" />
              <h2 className="pageTitle-sm">
                {t('dashboard.allRequests') || 'All Requests'}
              </h2>
            </div>
          </div>

          {error && (
            <div className="error-text mb-md">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {/* ── Filters ── */}
          <nav aria-label={t('dashboard.filters') || 'Filters'}>
            <div className="flex gap-sm flex-wrap mb-sm">
              {filterOptions.map((f) => (
                <button
                  key={f.key}
                  onClick={() => { setFilterStatus(f.key); setPage(1) }}
                  className={`btn-filter ${filterStatus === f.key ? 'active' : ''}`}
                  aria-label={f.label}
                  aria-pressed={filterStatus === f.key}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex gap-sm flex-wrap items-center">
              <div className="flex gap-sm flex-wrap">
                {priorityOptions.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => { setFilterPriority(p.key); setPage(1) }}
                    className={`btn-filter text-xs ${filterPriority === p.key ? 'active' : ''}`}
                    aria-label={p.label}
                    aria-pressed={filterPriority === p.key}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-sm items-center ml-auto">
                <div className="filter-group">
                  <select
                    value={filterCategory}
                    onChange={(e) => { setFilterCategory(e.target.value); setPage(1) }}
                    className="filter-select"
                    aria-label={t('dashboard.filterCategory') || 'Category'}
                  >
                    {categoryOptions.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.key === 'All' ? (t('dashboard.allCategories') || 'All Categories') : c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setPage(1) }}
                    className="filter-select"
                    aria-label={t('dashboard.sortBy') || 'Sort by'}
                  >
                    {sortOptions.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </nav>

          {/* ── Request List ── */}
          <section aria-label={t('dashboard.title')}>
            {loading ? (
              <SkeletonList count={4} lines={3} />
            ) : (
              <>
                <div className="gridGap mt-lg">
                  {items.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <EmptyState
                        icon={<ClipboardList size={32} />}
                        title={t('dashboard.noRequests')}
                        description={t('dashboard.noRequestsDesc') || 'No requests match your filters. Create a new request or adjust your filters.'}
                        action={{ onClick: () => navigate('/requests/new'), label: t('dashboard.createRequest') || 'New Request' }}
                      />
                    </div>
                  ) : (
                    items.map((it) => (
                      <motion.div
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
                        whileHover={{ scale: 1.01 }}
                        transition={{ duration: 0.2 }}
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
                              <Badge
                                label={t(`statuses.${it.status || 'Open'}`)}
                                colors={STATUS_COLORS}
                                colorKey={it.status || 'Open'}
                              />
                              <Badge
                                label={t(`priorities.${it.priority || 'Medium'}`)}
                                colors={PRIORITY_COLORS}
                                colorKey={it.priority || 'Medium'}
                              />
                              <Badge
                                label={t(`categories.${it.category || 'Other'}`)}
                                colors={CATEGORY_COLORS}
                                colorKey={it.category || 'Other'}
                              />
                              {it.matchedResources && it.matchedResources.length > 0 && (
                                <span className="govt-badge govt-badge-green">
                                  {it.matchedResources.length} Resource{it.matchedResources.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            {it.description && (
                              <p className="text-sm text-secondary mt-xs">
                                {it.description.length > 120
                                  ? it.description.slice(0, 120) + '...'
                                  : it.description}
                              </p>
                            )}
                            <div className="flex items-center gap-sm mt-xs">
                              {it.locationName && (
                                <span className="text-xs text-muted flex items-center gap-2xs">
                                  <MapPin size={10} />
                                  {it.locationName}
                                </span>
                              )}
                              {it.createdBy && (
                                <span className="text-xs text-muted">
                                  {it.createdBy.displayName || it.createdBy.email || ''}
                                </span>
                              )}
                              {it.claimedBy && (
                                <span className="text-xs text-warning">
                                  {t('dashboard.claimedBy') || 'Claimed'}: {it.claimedBy.displayName || it.claimedBy.email}
                                </span>
                              )}
                            </div>
                          </div>
                          <ArrowRight size={16} className="text-muted flex-shrink-0" />
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {/* ── Pagination ── */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-sm mt-lg">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="btn-ghost btn-sm"
                      aria-label={t('dashboard.previous') || 'Previous'}
                    >
                      {t('dashboard.previous') || 'Previous'}
                    </button>
                    <span className="text-sm text-muted">
                      {page} / {totalPages}
                    </span>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="btn-ghost btn-sm"
                      aria-label={t('dashboard.next') || 'Next'}
                    >
                      {t('dashboard.next') || 'Next'}
                    </button>
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
