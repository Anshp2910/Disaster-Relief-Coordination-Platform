import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { createStagger, createListItem } from '../utils/animations'
import { Calendar, Plus, Edit, Trash2, Clock, MapPin, User, CheckCircle, XCircle, ChevronLeft, ChevronRight, List, Grid3X3 } from 'lucide-react'
import { Modal, PageHeader, ErrorState, FilterBar, ModernSelect, RippleBtn, PageTransition } from '../components/ui'
import DataList from '../components/ui/DataList'
import { SkeletonList } from '../components/Skeleton'
import { clientApi } from '../api/client'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { registerRefreshListener } from '../hooks/useSocket'
import { useDebounce } from '../hooks/useDebounce'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../hooks/useConfirm'
import { getErrorMessage } from '../utils/getErrorMessage'

interface ScheduleItem {
  _id: string
  userId?: { _id?: string; displayName?: string } | string
  zoneId?: { _id?: string; name?: string } | string
  startDate?: string
  endDate?: string
  shift?: string
  status?: string
  skills?: string[]
  notes?: string
}

interface Zone {
  _id: string
  name?: string
}

interface User {
  _id: string
  displayName?: string
  email?: string
  role?: string
}

interface ScheduleForm {
  userId: string
  zoneId: string
  startDate: string
  endDate: string
  shift: string
  skills: string[]
  notes: string
}

interface StatusButtonProps {
  currentStatus: string
  expectedStatus: string
  nextStatus: string
  label: string
  color: { bg: string; text: string; border: string }
  scheduleId: string
  onStatusChange: (id: string, status: string) => void
}

const SHIFT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Morning: { bg: 'rgba(245,158,11,0.1)', text: 'var(--accent-orange)', border: 'rgba(245,158,11,0.25)' },
  Afternoon: { bg: 'rgba(59,130,246,0.1)', text: 'var(--accent-blue-light)', border: 'rgba(59,130,246,0.3)' },
  Night: { bg: 'rgba(129,140,248,0.1)', text: 'var(--accent-indigo)', border: 'rgba(129,140,248,0.25)' },
  'Full Day': { bg: 'var(--success-soft)', text: 'var(--accent-green)', border: 'rgba(34,197,94,0.3)' },
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Scheduled: { bg: 'rgba(59,130,246,0.1)', text: 'var(--accent-blue-light)', border: 'rgba(59,130,246,0.3)' },
  Active: { bg: 'var(--success-soft)', text: 'var(--accent-green)', border: 'rgba(34,197,94,0.3)' },
  Completed: { bg: 'rgba(100,116,139,0.1)', text: 'var(--gov-muted)', border: 'rgba(100,116,139,0.3)' },
  Cancelled: { bg: 'var(--danger-soft)', text: 'var(--accent-red)', border: 'rgba(239,68,68,0.3)' },
}

const SKILL_OPTIONS = ['Medical', 'Rescue', 'Logistics', 'Communication', 'Shelter', 'Food', 'Other']
const SHIFT_OPTIONS = ['Morning', 'Afternoon', 'Night', 'Full Day']
const STATUS_FILTER_OPTIONS = ['All', 'Scheduled', 'Active', 'Completed', 'Cancelled']

function formatDate(d: string, locale: string) {
  return new Date(d).toLocaleDateString(locale, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

const containerVariants = createStagger(0.05)
const itemVariants = createListItem(12, 0.3)

const StatusButton = memo(function StatusButton({ currentStatus, expectedStatus, nextStatus, label, color, scheduleId, onStatusChange }: StatusButtonProps) {
  if (currentStatus !== expectedStatus) return null
  return (
    <button
      onClick={() => onStatusChange(scheduleId, nextStatus)}
      className="skill-pill" style={{ background: color.bg, color: color.text, borderColor: color.border }}
      aria-label={label}
    >
      <CheckCircle size={14} />
      <span className="ml-xs">{label}</span>
    </button>
  )
})

const DEFAULT_FORM: ScheduleForm = {
  userId: '', zoneId: '', startDate: '', endDate: '', shift: 'Full Day', skills: [], notes: '',
}

export default function Schedules() {
  const { t, i18n } = useTranslation()
  const [items, setItems] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterShift, setFilterShift] = useState('All')
  const [filterZone, setFilterZone] = useState('All')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showForm, setShowForm] = useState(false)
  const { confirm, ConfirmDialog } = useConfirm()
  const [editItem, setEditItem] = useState<ScheduleItem | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [form, setForm] = useState<ScheduleForm>(DEFAULT_FORM)
  const [viewMode, setViewMode] = useState<'list' | 'week'>('list')
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDaySchedule, setSelectedDaySchedule] = useState<ScheduleItem | null>(null)

  const { user: currentUser } = useAuth()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string | number | undefined> = { page, limit: 20 }
      if (filterStatus !== 'All') params.status = filterStatus
      if (filterShift !== 'All') params.shift = filterShift
      if (filterZone !== 'All') params.zoneId = filterZone
      if (dateFrom) params.startDate = dateFrom
      if (dateTo) params.endDate = dateTo
      if (debouncedSearch) params.search = debouncedSearch
      const data = await clientApi.getSchedules(params) as { items?: ScheduleItem[]; pages?: number }
      setItems(data.items || [])
      setTotalPages(data.pages || 1)
    } catch (e) {
      setError(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus, filterShift, filterZone, dateFrom, dateTo, debouncedSearch])

  async function loadDropdowns() {
    try {
      const zonesData = await clientApi.getZones() as { items?: Zone[] }
      setZones(zonesData.items || [])
    } catch {
      // silent
    }
    if (currentUser?.role === 'admin') {
      try {
        const usersData = await clientApi.adminUsers() as { users: User[] }
        setUsers(usersData.users || [])
      } catch {
        // silent
      }
    } else {
      setUsers([{ _id: currentUser?.id || '', displayName: currentUser?.displayName || currentUser?.email, role: currentUser?.role }])
    }
  }

  useEffect(() => { load() }, [load])
  useEffect(() => { loadDropdowns() }, [])

  useAutoRefresh(load, { interval: 20000 })

  useEffect(() => {
    return registerRefreshListener(['request:created', 'request:updated'], load)
  }, [load])

  function openCreate() {
    setEditItem(null)
    setForm({ ...DEFAULT_FORM, userId: currentUser?.id || '' })
    setShowForm(true)
  }

  function openEdit(item: ScheduleItem) {
    setEditItem(item)
    setForm({
      userId: typeof item.userId === 'object' && item.userId ? (item.userId._id || '') : (item.userId as string || ''),
      zoneId: typeof item.zoneId === 'object' && item.zoneId ? (item.zoneId._id || '') : (item.zoneId as string || ''),
      startDate: item.startDate ? item.startDate.slice(0, 16) : '',
      endDate: item.endDate ? item.endDate.slice(0, 16) : '',
      shift: item.shift || 'Full Day',
      skills: item.skills || [],
      notes: item.notes || '',
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      setError(t('schedules.endDateBeforeStart') || 'End date must be after start date')
      return
    }
    try {
      const payload: Record<string, unknown> = { ...form }
      if (!payload.zoneId) delete payload.zoneId
      if (!payload.userId) payload.userId = currentUser?.id
      if (editItem) {
        await clientApi.updateSchedule(editItem._id, payload)
      } else {
        await clientApi.createSchedule(payload)
      }
      setShowForm(false)
      load()
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ message: t('schedules.deleteConfirm'), danger: true })
    if (!ok) return
    try {
      await clientApi.deleteSchedule(id)
      load()
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }

  const handleStatusChange = useCallback(async (id: string, status: string) => {
    try {
      await clientApi.updateSchedule(id, { status })
      load()
    } catch (e) {
      setError(getErrorMessage(e))
    }
  }, [load])

  function toggleSkill(skill: string) {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill) ? prev.skills.filter((s) => s !== skill) : [...prev.skills, skill],
    }))
  }

  const updateForm = (field: keyof ScheduleForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const weekStart = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + weekOffset * 7)
    const day = d.getDay()
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
    d.setHours(0, 0, 0, 0)
    return d
  }, [weekOffset])

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 6)
    d.setHours(23, 59, 59, 999)
    return d
  }, [weekStart])

  const weekDays = useMemo(() => {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      days.push(d)
    }
    return days
  }, [weekStart])

  const weekSchedules = useMemo(() => {
      return items.filter((item) => {
        if (!item.startDate) return false
        const d = new Date(item.startDate)
        return d >= weekStart && d <= weekEnd
      }, [items, weekStart, weekEnd])
  }, [items, weekStart, weekEnd])

  const schedulesByDay = useMemo(() => {
    const groups: Record<string, ScheduleItem[]> = {}
    weekDays.forEach((day) => {
      groups[day.toDateString()] = []
    })
    weekSchedules.forEach((item) => {
      if (!item.startDate) return
      const d = new Date(item.startDate)
      const key = d.toDateString()
      if (groups[key]) groups[key].push(item)
    })
    return groups
  }, [weekSchedules, weekDays])

  return (
    <PageTransition>
      <div className="container">
      <PageHeader
        title={t('nav.schedules') || 'Volunteer Scheduling'}
        subtitle={`${items.length} ${t('schedules.schedulesCount')}`}
        actions={
          <RippleBtn className="" onClick={openCreate} aria-label={t('schedules.createSchedule')}>
            <Plus size={16} />
            <span className="ml-xs">{t('schedules.createSchedule')}</span>
          </RippleBtn>
        }
      />

      {error && <ErrorState message={error} onRetry={load} />}

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder={t('schedules.searchPlaceholder') || 'Search schedules...'}
        filters={[
          {
            key: 'status',
            label: t('schedules.status') || 'Status',
            options: STATUS_FILTER_OPTIONS.map((s) => ({ key: s, label: s === 'All' ? t('dashboard.filterAll') : s })),
            value: filterStatus,
            onChange: (v) => { setFilterStatus(v); setPage(1) },
          },
          {
            key: 'shift',
            label: t('schedules.shift') || 'Shift',
            options: ['All', ...SHIFT_OPTIONS].map((s) => ({ key: s, label: s === 'All' ? t('dashboard.filterAll') : s })),
            value: filterShift,
            onChange: (v) => { setFilterShift(v); setPage(1) },
          },
          {
            key: 'zone',
            label: t('schedules.zone') || 'Zone',
            options: [
              { key: 'All', label: t('schedules.allZones') },
              ...zones.map((z) => ({ key: z._id, label: z.name || '' })),
            ],
            value: filterZone,
            onChange: (v) => { setFilterZone(v); setPage(1) },
          },
        ]}
      />

      <div className="flex flex-gap-sm mt-sm flex-wrap gap-row-sm">
        <div className="gap-row-xs text-sm">
          <span className="text-muted">{t('schedules.from')}:</span>
          <label htmlFor="sch-datefrom" className="sr-only">{t('schedules.from')}</label>
          <input id="sch-datefrom" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} />
        </div>
        <div className="gap-row-xs text-sm">
          <span className="text-muted">{t('schedules.to')}:</span>
          <label htmlFor="sch-dateto" className="sr-only">{t('schedules.to')}</label>
          <input id="sch-dateto" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} />
        </div>
      </div>

      <div className="flex flex-gap-sm mt-sm" role="group" aria-label={t('schedules.viewToggle') || 'View mode'}>
        <button
          onClick={() => setViewMode('list')}
          className={`filter-pill flex items-center gap-xs ${viewMode === 'list' ? 'active' : ''}`}
          aria-pressed={viewMode === 'list'}
          aria-label={t('schedules.listView') || 'List view'}
        >
          <List size={16} />
          <span>{t('schedules.listView') || 'List'}</span>
        </button>
        <button
          onClick={() => setViewMode('week')}
          className={`filter-pill flex items-center gap-xs ${viewMode === 'week' ? 'active' : ''}`}
          aria-pressed={viewMode === 'week'}
          aria-label={t('schedules.weekView') || 'Week view'}
        >
          <Grid3X3 size={16} />
          <span>{t('schedules.weekView') || 'Week'}</span>
        </button>
      </div>

      {loading ? (
        <SkeletonList count={4} lines={3} />
      ) : viewMode === 'week' ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="flex flex-between flex-gap-sm mt-md">
            <button onClick={() => setWeekOffset((p) => p - 1)} className="text-sm flex items-center gap-xs" aria-label={t('common.previous')}>
              <ChevronLeft size={16} /> {t('common.previous')}
            </button>
            <span className="text-sm text-bold flex items-center gap-xs">
              <Calendar size={14} />
              {weekStart.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })}
              {' — '}
              {weekEnd.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <button onClick={() => setWeekOffset((p) => p + 1)} className="text-sm flex items-center gap-xs" aria-label={t('common.next')}>
              {t('common.next')} <ChevronRight size={16} />
            </button>
          </div>
          <div className="week-grid mt-sm" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'var(--space-xs)' }}>
             {weekDays.map((day) => {
              const key = day.toDateString()
              const daySchedules = schedulesByDay[key] || []
              return (
                <motion.div key={key} variants={itemVariants} className="card p-xs" style={{ minHeight: 120 }}>
                  <div className="text-xs text-bold" style={{ textAlign: 'center' }}>
                    {day.toLocaleDateString(undefined, { weekday: 'short' })}
                  </div>
                  <div className="text-xs" style={{ textAlign: 'center', color: 'var(--gov-muted)' }}>
                    {day.getDate()} {day.toLocaleDateString(i18n.language, { month: 'short' })}
                  </div>
                  {daySchedules.length > 0 && (
                    <div className="text-xs" style={{ textAlign: 'center', margin: 'var(--space-3xs) 0' }}>
                      {daySchedules.length} schedule{daySchedules.length > 1 ? 's' : ''}
                    </div>
                  )}
                  {daySchedules.map((s) => {
                    const shiftC = SHIFT_COLORS[s.shift || 'Full Day'] ?? SHIFT_COLORS['Full Day']!
                    return (
                      <div key={s._id} className="mb-xs">
                        <div
                          onClick={() => setSelectedDaySchedule(selectedDaySchedule?._id === s._id ? null : s)}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDaySchedule(selectedDaySchedule?._id === s._id ? null : s) } }}
                          role="button"
                          tabIndex={0}
                          className="text-xs"
                          style={{
                            background: shiftC.bg,
                            color: shiftC.text,
                            border: `1px solid ${shiftC.border}`,
                            borderRadius: 'var(--radius-2xs)',
                            padding: 'var(--space-4xs) var(--space-3xs)',
                            cursor: 'pointer',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                           {(typeof s.userId === 'object' && s.userId) ? s.userId.displayName : t('schedules.volunteer')}
                        </div>
                        {selectedDaySchedule?._id === s._id && (
                          <div className="mt-xs text-xs p-xs bg-subtle rounded-sm border-gov">
                            <div><strong>{(typeof s.userId === 'object' && s.userId) ? s.userId.displayName : t('schedules.volunteer')}</strong> — {s.shift}</div>
                            <div className="muted">{s.startDate ? formatDate(s.startDate, i18n.language) : ''}</div>
                            {s.zoneId && <div>{t('schedules.zone')} {(typeof s.zoneId === 'object' && s.zoneId) ? s.zoneId.name : t('common.unknown')}</div>}
                            {s.skills && s.skills.length > 0 && <div>Skills: {s.skills.join(', ')}</div>}
                            {s.notes && <div className="muted">{s.notes}</div>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      ) : (
        <section aria-label={t('nav.schedules') || 'Schedules'}>
          <DataList
            items={items}
            loading={false}
            emptyTitle={t('schedules.noSchedules')}
            emptyDescription={t('schedules.createFirst') || 'Create your first schedule'}
            keyExtractor={(item: ScheduleItem) => item._id}
            renderItem={(item: ScheduleItem) => {
              const shiftC = SHIFT_COLORS[item.shift || 'Full Day'] ?? SHIFT_COLORS['Full Day']!
              const statusC = STATUS_COLORS[item.status || 'Scheduled'] ?? STATUS_COLORS.Scheduled!
              return (
                <div className="listCard">
                  <div className="flex flex-between flex-gap-sm">
                    <div className="flex-1">
                      <div className="flex flex-gap-sm flex-wrap mb-xs">
                        <span className="text-bold text-base flex items-center gap-xs">
                          <User size={16} className="text-muted" />
                          {(typeof item.userId === 'object' && item.userId) ? item.userId.displayName : t('schedules.volunteer')}
                        </span>
                        <span className="status-badge flex items-center gap-xs" style={{ background: shiftC.bg, color: shiftC.text, border: `1px solid ${shiftC.border}` }}>
                          <Clock size={14} /> {item.shift}
                        </span>
                        <span className="status-badge flex items-center gap-xs" style={{ background: statusC.bg, color: statusC.text, border: `1px solid ${statusC.border}` }}>
                          {item.status === 'Cancelled' ? <XCircle size={14} /> : <CheckCircle size={14} />}
                          {item.status}
                        </span>
                      </div>

                      <div className="text-base text-muted">
                        {item.startDate ? formatDate(item.startDate, i18n.language) : ''} &rarr; {item.endDate ? formatDate(item.endDate, i18n.language) : ''}
                      </div>

                      {item.zoneId && (
                        <div className="small muted mt-xs flex items-center gap-xs">
                          <MapPin size={14} />
                          <span>{t('schedules.zone')} {(typeof item.zoneId === 'object' && item.zoneId) ? item.zoneId.name : t('common.unknown')}</span>
                        </div>
                      )}

                      {item.skills && item.skills.length > 0 && (
                        <div className="flex flex-gap-xs mt-xs flex-wrap">
                          {item.skills.map((s) => (
                            <span key={s} className="text-xs p-xs" style={{ borderRadius: 3, background: 'rgba(107,127,181,.08)', color: 'var(--accent-indigo)' }}>{s}</span>
                          ))}
                        </div>
                      )}

                      {item.notes && <div className="small muted mt-xs">{item.notes}</div>}
                    </div>

                    <div className="flex flex-col flex-gap-xs">
                      <StatusButton
                        currentStatus={item.status || 'Scheduled'}
                        expectedStatus="Scheduled"
                        nextStatus="Active"
                        label={t('schedules.startButton')}
                        color={STATUS_COLORS.Active!}
                        scheduleId={item._id}
                        onStatusChange={handleStatusChange}
                      />
                      <StatusButton
                        currentStatus={item.status || 'Scheduled'}
                        expectedStatus="Active"
                        nextStatus="Completed"
                        label={t('schedules.completeButton')}
                        color={STATUS_COLORS.Completed!}
                        scheduleId={item._id}
                        onStatusChange={handleStatusChange}
                      />
                      <button onClick={() => openEdit(item)} className="btn-ghost btn-sm" aria-label={t('common.edit')}>
                        <Edit size={14} /> {t('common.edit')}
                      </button>
                      <button onClick={() => handleDelete(item._id)} className="btn-danger text-xs p-xs flex items-center gap-xs" aria-label={t('common.delete')}>
                        <Trash2 size={14} /> {t('common.delete')}
                      </button>
                    </div>
                  </div>
                </div>
              )
            }}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </section>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editItem ? t('schedules.editSchedule') : t('schedules.createSchedule')}
      >
        <form onSubmit={handleSubmit}>
          <div className="ff-group">
            <ModernSelect
              label={t('schedules.volunteer')}
              options={[
                { label: t('schedules.selectVolunteer'), value: '' },
                ...users.map((u) => ({ label: `${u.displayName} (${u.role})`, value: u._id })),
              ]}
              value={form.userId}
              onChange={(v) => setForm((prev) => ({ ...prev, userId: v }))}
            />
          </div>

          <div className="ff-group">
            <ModernSelect
              label={t('schedules.zoneOptional')}
              options={[
                { label: t('schedules.noZone'), value: '' },
                ...zones.map((z) => ({ label: z.name || '', value: z._id })),
              ]}
              value={form.zoneId}
              onChange={(v) => setForm((prev) => ({ ...prev, zoneId: v }))}
            />
          </div>

          <div className="flex flex-gap-sm">
            <div className="ff-group flex-1">
              <div className={`ff-wrap ${form.startDate ? 'ff-focused' : ''}`}>
                <input
                  id="sch-start"
                  type="datetime-local"
                  value={form.startDate}
                  onChange={updateForm('startDate')}
                  required
                  className={`ff-input ${form.startDate ? 'ff-input-filled' : ''}`}
                  placeholder={t('schedules.start')}
                />
                <label htmlFor="sch-start" className={`ff-label ${form.startDate ? 'ff-label-float' : ''}`}>
                  {t('schedules.start')}
                </label>
              </div>
            </div>
            <div className="ff-group flex-1">
              <div className={`ff-wrap ${form.endDate ? 'ff-focused' : ''}`}>
                <input
                  id="sch-end"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={updateForm('endDate')}
                  required
                  className={`ff-input ${form.endDate ? 'ff-input-filled' : ''}`}
                  placeholder={t('schedules.end')}
                />
                <label htmlFor="sch-end" className={`ff-label ${form.endDate ? 'ff-label-float' : ''}`}>
                  {t('schedules.end')}
                </label>
              </div>
            </div>
          </div>

          <div className="ff-group">
            <ModernSelect
              label={t('schedules.shift')}
              options={SHIFT_OPTIONS.map((s) => ({ label: s, value: s }))}
              value={form.shift}
              onChange={(v) => setForm((prev) => ({ ...prev, shift: v }))}
            />
          </div>

          <div className="ff-group">
            <div className="ff-label-text mb-xs">{t('schedules.skills')}</div>
            <div className="flex flex-gap-xs flex-wrap">
              {SKILL_OPTIONS.map((s) => {
                const active = form.skills.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSkill(s)}
                    className={`filter-pill ${active ? 'active' : ''}`}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="ff-group">
            <div className={`ff-wrap ${form.notes ? 'ff-focused' : ''}`}>
              <textarea
                id="sch-notes"
                value={form.notes}
                onChange={updateForm('notes')}
                rows={2}
                className="ff-input ff-textarea"
                placeholder={t('schedules.notesOptional')}
              />
              <label htmlFor="sch-notes" className={`ff-label ff-label-with-icon ${form.notes ? 'ff-label-float' : ''}`}>
                {t('schedules.notesOptional')}
              </label>
            </div>
          </div>

          <div className="flex flex-gap-sm mt">
            <RippleBtn type="submit" className="flex items-center gap-xs" aria-label={t('common.submit')}>
              <CheckCircle size={16} />
              <span>{editItem ? t('schedules.update') : t('schedules.create')}</span>
            </RippleBtn>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost btn-sm" aria-label={t('common.cancel')}>{t('schedules.cancel')}</button>
          </div>
        </form>
      </Modal>

      {ConfirmDialog}
    </div>
    </PageTransition>
  )
}
