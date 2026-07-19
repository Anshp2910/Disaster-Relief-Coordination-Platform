import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Calendar, Plus, Edit, Trash2, Clock, MapPin, User, CheckCircle, XCircle, ChevronLeft, ChevronRight, List, Grid3X3, Search } from 'lucide-react'
import { Modal, ErrorState, ModernSelect } from '../components/ui'
import DataList from '../components/ui/DataList'
import { SkeletonList } from '../components/Skeleton'
import { clientApi } from '../api/client'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { registerRefreshListener } from '../hooks/useSocket'
import { useDebounce } from '../hooks/useDebounce'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../hooks/useConfirm'
import { getErrorMessage } from '../utils/getErrorMessage'
import { useToast } from '../components/Toast'
import PageTransition from '../components/ui/PageTransition'
import { createStagger } from '../utils/animations'

interface ScheduleItem {
  _id: string
  userId?: { _id?: string; displayName?: string } | string
  zoneId?: { _id?: string; name?: string } | string
  startDate?: string; endDate?: string; shift?: string; status?: string; skills?: string[]; notes?: string
}
interface Zone { _id: string; name?: string }
interface User { _id: string; displayName?: string; email?: string; role?: string }
interface ScheduleForm { userId: string; zoneId: string; startDate: string; endDate: string; shift: string; skills: string[]; notes: string }

const SHIFT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Morning: { bg: 'rgba(245,158,11,0.1)', text: 'var(--warning)', border: 'rgba(245,158,11,0.25)' },
  Afternoon: { bg: 'rgba(59,130,246,0.1)', text: 'var(--accent)', border: 'rgba(59,130,246,0.3)' },
  Night: { bg: 'rgba(129,140,248,0.1)', text: 'var(--violet-500)', border: 'rgba(129,140,248,0.25)' },
  'Full Day': { bg: 'var(--success-soft)', text: 'var(--success)', border: 'rgba(34,197,94,0.3)' },
}

const containerVariants = createStagger(0.05)

const SCHEDULE_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Scheduled: { bg: 'rgba(59,130,246,0.1)', text: 'var(--accent)', border: 'rgba(59,130,246,0.3)' },
  Active: { bg: 'var(--success-soft)', text: 'var(--success)', border: 'rgba(34,197,94,0.3)' },
  Completed: { bg: 'rgba(100,116,139,0.1)', text: 'var(--text-muted)', border: 'rgba(100,116,139,0.3)' },
  Cancelled: { bg: 'var(--danger-soft)', text: 'var(--danger)', border: 'rgba(239,68,68,0.3)' },
}

const SKILL_OPTIONS = ['Medical', 'Rescue', 'Logistics', 'Communication', 'Shelter', 'Food', 'Other']
const SHIFT_OPTIONS = ['Morning', 'Afternoon', 'Night', 'Full Day']
const STATUS_FILTER_OPTIONS = ['All', 'Scheduled', 'Active', 'Completed', 'Cancelled']

const StatusButton = memo(function StatusButton({ currentStatus, expectedStatus, nextStatus, label, color, scheduleId, onStatusChange }: {
  currentStatus: string; expectedStatus: string; nextStatus: string; label: string
  color: { bg: string; text: string; border: string }; scheduleId: string; onStatusChange: (id: string, status: string) => void
}) {
  if (currentStatus !== expectedStatus) return null
  return (
    <button onClick={() => onStatusChange(scheduleId, nextStatus)} className="btn-pill" style={{ background: color.bg, color: color.text, borderColor: color.border }}>
      <CheckCircle size={14} /> {label}
    </button>
  )
})

const DEFAULT_FORM: ScheduleForm = { userId: '', zoneId: '', startDate: '', endDate: '', shift: 'Full Day', skills: [], notes: '' }

export default function Schedules() {
  useEffect(() => { document.title = 'Disaster Relief - Schedules' }, [])
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
  const toast = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'week'>('list')
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDaySchedule, setSelectedDaySchedule] = useState<ScheduleItem | null>(null)
  const { user: currentUser } = useAuth()

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const params: Record<string, string | number | undefined> = { page, limit: 20 }
      if (filterStatus !== 'All') params.status = filterStatus
      if (filterShift !== 'All') params.shift = filterShift
      if (filterZone !== 'All') params.zoneId = filterZone
      if (dateFrom) params.startDate = dateFrom
      if (dateTo) params.endDate = dateTo
      if (debouncedSearch) params.search = debouncedSearch
      const data = await clientApi.getSchedules(params) as { items?: ScheduleItem[]; pages?: number }
      setItems(data.items || []); setTotalPages(data.pages || 1)
    } catch (e) { setError(getErrorMessage(e)) }
    finally { setLoading(false) }
  }, [page, filterStatus, filterShift, filterZone, dateFrom, dateTo, debouncedSearch])

  const loadDropdowns = useCallback(async () => {
    try { const zonesData = await clientApi.getZones() as { items?: Zone[] }; setZones(zonesData.items || []) } catch { /* silent */ }
    if (currentUser?.role === 'admin') {
      try { const usersData = await clientApi.adminUsers() as { users: User[] }; setUsers(usersData.users || []) } catch { /* silent */ }
    } else { setUsers([{ _id: currentUser?.id || '', displayName: currentUser?.displayName || currentUser?.email, role: currentUser?.role }]) }
  }, [currentUser])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadDropdowns() }, [loadDropdowns])
  useAutoRefresh(load, { interval: 20000 })
  const loadRef = useRef(load)
  loadRef.current = load
  useEffect(() => { return registerRefreshListener(['request:created', 'request:updated'], () => loadRef.current()) }, [])

  function openCreate() { setEditItem(null); setForm({ ...DEFAULT_FORM, userId: currentUser?.id || '' }); setShowForm(true) }
  function openEdit(item: ScheduleItem) {
    setEditItem(item)
    setForm({
      userId: typeof item.userId === 'object' && item.userId ? (item.userId._id || '') : (item.userId as string || ''),
      zoneId: typeof item.zoneId === 'object' && item.zoneId ? (item.zoneId._id || '') : (item.zoneId as string || ''),
      startDate: item.startDate ? item.startDate.slice(0, 16) : '', endDate: item.endDate ? item.endDate.slice(0, 16) : '',
      shift: item.shift || 'Full Day', skills: item.skills || [], notes: item.notes || '',
    })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) { setError(t('schedules.endDateBeforeStart') || 'End date must be after start date'); return }
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = { ...form }
      if (!payload.zoneId) delete payload.zoneId
      if (!payload.userId) payload.userId = currentUser?.id
      if (editItem) { await clientApi.updateSchedule(editItem._id, payload); toast.success(t('schedules.updated') || 'Schedule updated') }
      else { await clientApi.createSchedule(payload); toast.success(t('schedules.created') || 'Schedule created') }
      setShowForm(false); load()
    } catch (e) { setError(getErrorMessage(e)) }
    finally { setSubmitting(false) }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ message: t('schedules.deleteConfirm'), danger: true })
    if (!ok) return
    try { await clientApi.deleteSchedule(id); toast.success(t('schedules.deleted') || 'Schedule deleted'); load() }
    catch (e) { setError(getErrorMessage(e)) }
  }

  const handleStatusChange = useCallback(async (id: string, status: string) => {
    try { await clientApi.updateSchedule(id, { status }); toast.success(t('schedules.statusUpdated') || 'Schedule status updated'); load() }
    catch (e) { setError(getErrorMessage(e)) }
  }, [load, toast, t])

  function toggleSkill(skill: string) {
    setForm((prev) => ({ ...prev, skills: prev.skills.includes(skill) ? prev.skills.filter((s) => s !== skill) : [...prev.skills, skill] }))
  }
  const updateForm = (field: keyof ScheduleForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const weekStart = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + weekOffset * 7); const day = d.getDay(); d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); d.setHours(0,0,0,0); return d }, [weekOffset])
  const weekEnd = useMemo(() => { const d = new Date(weekStart); d.setDate(d.getDate() + 6); d.setHours(23,59,59,999); return d }, [weekStart])
  const weekDays = useMemo(() => { const days: Date[] = []; for (let i = 0; i < 7; i++) { const d = new Date(weekStart); d.setDate(d.getDate() + i); days.push(d) }; return days }, [weekStart])
  const weekSchedules = useMemo(() => items.filter((item) => { if (!item.startDate) return false; const d = new Date(item.startDate); return d >= weekStart && d <= weekEnd }), [items, weekStart, weekEnd])
  const schedulesByDay = useMemo(() => { const groups: Record<string, ScheduleItem[]> = {}; weekDays.forEach((day) => { groups[day.toDateString()] = [] }); weekSchedules.forEach((item) => { if (!item.startDate) return; const d = new Date(item.startDate); const key = d.toDateString(); if (groups[key]) groups[key].push(item) }); return groups }, [weekSchedules, weekDays])

  return (
    <PageTransition>
      <div className="container">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
      {/* Dashboard-style Header */}
          <div className="flex-between mb-md mt-md">
            <div>
              <h1 className="page-title">{t('nav.schedules') || 'Volunteer Scheduling'}</h1>
              <p className="text-sm text-muted mt-xs">
                {items.length} {t('schedules.schedulesCount')}
              </p>
            </div>
            <div className="flex gap-sm items-center">
              <button className="btn-primary btn-sm" onClick={openCreate}>
                <Plus size={14} />
                <span>{t('schedules.createSchedule')}</span>
              </button>
            </div>
          </div>
      {error && <ErrorState message={error} onRetry={load} />}

      {/* Search */}
          <div className="card">
            <div className="search-input-wrapper" style={{ flex: '1 1 200px', maxWidth: 320, marginBottom: 'var(--space-sm)' }}>
              <Search size={16} className="search-input-icon" />
              <input
                className="search-input"
                placeholder={t('schedules.searchPlaceholder') || 'Search schedules...'}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                aria-label={t('schedules.searchPlaceholder') || 'Search schedules'}
              />
            </div>

            {/* Status Filter Buttons */}
            <div className="dashboard-filter-row" role="group" aria-label={t('schedules.filterByStatus') || 'Filter by status'}>
              {STATUS_FILTER_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => { setFilterStatus(s); setPage(1) }}
                  className={`btn-filter ${filterStatus === s ? 'active' : ''}`}
                  aria-pressed={filterStatus === s}
                >
                  {s === 'All' ? t('dashboard.filterAll') : s}
                </button>
              ))}
            </div>

            {/* Shift Filter Buttons */}
            <div className="dashboard-filter-row" role="group" aria-label={t('schedules.filterByShift') || 'Filter by shift'}>
              {['All', ...SHIFT_OPTIONS].map((s) => (
                <button
                  key={s}
                  onClick={() => { setFilterShift(s); setPage(1) }}
                  className={`btn-filter ${filterShift === s ? 'active' : ''}`}
                  aria-pressed={filterShift === s}
                >
                  {s === 'All' ? t('dashboard.filterAll') : s}
                </button>
              ))}
            </div>

            {/* Zone Filter */}
            <div className="dashboard-filter-row" role="group" aria-label={t('schedules.filterByZone') || 'Filter by zone'}>
              <div className="filter-group">
                <select id="sched-zone-filter" name="zoneFilter" value={filterZone} onChange={(e) => { setFilterZone(e.target.value); setPage(1) }} className="filter-select">
                  <option value="All">{t('schedules.allZones')}</option>
                  {zones.map((z) => (
                    <option key={z._id} value={z._id}>{z.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

      <div className="schedule-extra-controls">
          <div className="flex gap-md items-center flex-wrap">
            <div className="flex items-center gap-xs"><span className="text-sm text-muted">{t('schedules.from')}:</span><input id="schedule-date-from" name="dateFrom" type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} className="ff-date-input" /></div>
            <div className="flex items-center gap-xs"><span className="text-sm text-muted">{t('schedules.to')}:</span><input id="schedule-date-to" name="dateTo" type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} className="ff-date-input" /></div>
          </div>
        <div className="schedule-view-toggle">
          <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'active' : ''} aria-pressed={viewMode === 'list'}><List size={16} /> {t('schedules.listView') || 'List'}</button>
          <button onClick={() => setViewMode('week')} className={viewMode === 'week' ? 'active' : ''} aria-pressed={viewMode === 'week'}><Grid3X3 size={16} /> {t('schedules.weekView') || 'Week'}</button>
        </div>
      </div>

      {loading ? (
        <SkeletonList count={4} lines={3} />
      ) : viewMode === 'week' ? (
        <div className="schedule-week-container">
          <div className="week-nav">
            <button onClick={() => setWeekOffset((p) => p - 1)} className="week-nav-btn"><ChevronLeft size={16} /> {t('common.previous')}</button>
            <div className="week-nav-center">
              <button onClick={() => setWeekOffset(0)} className="week-nav-today" disabled={weekOffset === 0}>{t('schedules.today') || 'Today'}</button>
              <span className="week-nav-label"><Calendar size={14} /> {weekStart.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })} &mdash; {weekEnd.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <button onClick={() => setWeekOffset((p) => p + 1)} className="week-nav-btn">{t('common.next')} <ChevronRight size={16} /></button>
          </div>
          <div className="week-grid">
            {weekDays.map((day) => {
              const key = day.toDateString(); const daySchedules = schedulesByDay[key] || []
              return (
                <div key={key} className="week-grid-day-card">
                  <div className="week-grid-day-header">{day.toLocaleDateString(i18n.language, { weekday: 'short' })}</div>
                  <div className="week-grid-day-date">{day.getDate()} {day.toLocaleDateString(i18n.language, { month: 'short' })}</div>
                  {daySchedules.map((s) => {
                    const shiftC = SHIFT_COLORS[s.shift || 'Full Day'] ?? SHIFT_COLORS['Full Day']!
                    return (
                      <div key={s._id} className="mb-xs">
                        <div onClick={() => setSelectedDaySchedule(selectedDaySchedule?._id === s._id ? null : s)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDaySchedule(selectedDaySchedule?._id === s._id ? null : s) } }} role="button" tabIndex={0}
                          className="week-grid-schedule-item" style={{ background: shiftC.bg, color: shiftC.text, border: `1px solid ${shiftC.border}` }}>
                          {(typeof s.userId === 'object' && s.userId) ? s.userId.displayName : t('schedules.volunteer')}
                        </div>
                        {selectedDaySchedule?._id === s._id && (
                          <div className="card p-xs text-3xs absolute z-10" style={{ width: 200 }}>
                            <div><strong>{(typeof s.userId === 'object' && s.userId) ? s.userId.displayName : t('schedules.volunteer')}</strong> &mdash; {s.shift}</div>
                            <div className="muted">{s.startDate ? new Date(s.startDate).toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : ''}</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <DataList
          items={items} loading={false} emptyTitle={t('schedules.noSchedules')} emptyDescription={t('schedules.createFirst') || 'Create your first schedule'}
          keyExtractor={(item: ScheduleItem) => item._id}
          renderItem={(item: ScheduleItem) => {
            const shiftC = SHIFT_COLORS[item.shift || 'Full Day'] ?? SHIFT_COLORS['Full Day']!
            const statusC = SCHEDULE_STATUS_COLORS[item.status || 'Scheduled'] ?? SCHEDULE_STATUS_COLORS.Scheduled!
            return (
              <div className="list-card cursor-default">
                <div className="flex gap-sm flex-wrap">
                  <span className="text-bold">{typeof item.userId === 'object' && item.userId ? item.userId.displayName : t('schedules.volunteer')}</span>
                  <span className="status-badge" style={{ background: shiftC.bg, color: shiftC.text, border: `1px solid ${shiftC.border}` }}><Clock size={14} /> {item.shift}</span>
                  <span className="status-badge" style={{ background: statusC.bg, color: statusC.text, border: `1px solid ${statusC.border}` }}>{item.status === 'Cancelled' ? <XCircle size={14} /> : <CheckCircle size={14} />} {item.status}</span>
                </div>
                <div className="text-sm text-muted mt-xs">{item.startDate ? new Date(item.startDate).toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : ''} &rarr; {item.endDate ? new Date(item.endDate).toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : ''}</div>
                {item.zoneId && <div className="text-xs muted mt-xs"><MapPin size={12} /> {t('schedules.zone')} {(typeof item.zoneId === 'object' && item.zoneId) ? item.zoneId.name : t('common.unknown')}</div>}
                {item.skills && item.skills.length > 0 && <div className="flex gap-xs mt-xs flex-wrap">{item.skills.map((s) => <span key={s} className="text-xs p-xs rounded-sm text-accent" style={{ background: 'rgba(107,127,181,.08)' }}>{s}</span>)}</div>}
                {item.notes && <div className="text-xs muted mt-xs">{item.notes}</div>}
                <div className="flex flex-wrap gap-xs mt-sm">
                  <StatusButton currentStatus={item.status || 'Scheduled'} expectedStatus="Scheduled" nextStatus="Active" label={t('schedules.startButton')} color={SCHEDULE_STATUS_COLORS.Active!} scheduleId={item._id} onStatusChange={handleStatusChange} />
                  <StatusButton currentStatus={item.status || 'Scheduled'} expectedStatus="Active" nextStatus="Completed" label={t('schedules.completeButton')} color={SCHEDULE_STATUS_COLORS.Completed!} scheduleId={item._id} onStatusChange={handleStatusChange} />
                  <button onClick={() => openEdit(item)} className="btn-ghost btn-sm" aria-label="Edit schedule"><Edit size={14} /> {t('common.edit')}</button>
                  <button onClick={() => handleDelete(item._id)} className="btn-danger btn-sm" aria-label="Delete schedule"><Trash2 size={14} /> {t('common.delete')}</button>
                </div>
              </div>
            )
          }}
          page={page} totalPages={totalPages} onPageChange={setPage}
        />
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editItem ? t('schedules.editSchedule') : t('schedules.createSchedule')}>
        <form onSubmit={handleSubmit}>
          <div className="ff-group"><ModernSelect label={t('schedules.volunteer')} options={[{ label: t('schedules.selectVolunteer'), value: '' }, ...users.map((u) => ({ label: `${u.displayName} (${u.role})`, value: u._id }))]} value={form.userId} onChange={(v) => setForm((prev) => ({ ...prev, userId: v }))} /></div>
          <div className="ff-group"><ModernSelect label={t('schedules.zoneOptional')} options={[{ label: t('schedules.noZone'), value: '' }, ...zones.map((z) => ({ label: z.name || '', value: z._id }))]} value={form.zoneId} onChange={(v) => setForm((prev) => ({ ...prev, zoneId: v }))} /></div>
          <div className="flex gap-sm">
            <div className="ff-group flex-1">
              <div className={`ff-wrap ${form.startDate ? 'ff-focused' : ''}`}>
                <input id="sch-start" type="datetime-local" value={form.startDate} onChange={updateForm('startDate')} required className={`ff-input ${form.startDate ? 'ff-input-filled' : ''}`} placeholder={t('schedules.start')} />
                <label htmlFor="sch-start" className={`ff-label ${form.startDate ? 'ff-label-float' : ''}`}>{t('schedules.start')}</label>
              </div>
            </div>
            <div className="ff-group flex-1">
              <div className={`ff-wrap ${form.endDate ? 'ff-focused' : ''}`}>
                <input id="sch-end" type="datetime-local" value={form.endDate} onChange={updateForm('endDate')} required className={`ff-input ${form.endDate ? 'ff-input-filled' : ''}`} placeholder={t('schedules.end')} />
                <label htmlFor="sch-end" className={`ff-label ${form.endDate ? 'ff-label-float' : ''}`}>{t('schedules.end')}</label>
              </div>
            </div>
          </div>
          <div className="ff-group"><ModernSelect label={t('schedules.shift')} options={SHIFT_OPTIONS.map((s) => ({ label: s, value: s }))} value={form.shift} onChange={(v) => setForm((prev) => ({ ...prev, shift: v }))} /></div>
          <div className="ff-group">
            <div className="text-sm font-semibold mb-xs">{t('schedules.skills')}</div>
            <div className="flex gap-xs flex-wrap">{SKILL_OPTIONS.map((s) => { const active = form.skills.includes(s); return <button key={s} type="button" onClick={() => toggleSkill(s)} className={`filter-pill ${active ? 'active' : ''}`}>{s}</button> })}</div>
          </div>
          <div className="ff-group">
            <div className={`ff-wrap ${form.notes ? 'ff-focused' : ''}`}>
              <textarea id="sch-notes" value={form.notes} onChange={updateForm('notes')} rows={2} className="ff-input ff-textarea" placeholder={t('schedules.notesOptional')} />
              <label htmlFor="sch-notes" className={`ff-label ${form.notes ? 'ff-label-float' : ''}`}>{t('schedules.notesOptional')}</label>
            </div>
          </div>
          <div className="flex gap-sm mt-sm">
            <button type="submit" className="btn-primary btn-sm" disabled={submitting}>{submitting ? <span className="spinner-sm" aria-hidden="true" /> : <><CheckCircle size={16} /> {editItem ? t('schedules.update') : t('schedules.create')}</>}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost btn-sm">{t('schedules.cancel')}</button>
          </div>
        </form>
      </Modal>
      {ConfirmDialog}
        </motion.div>
      </div>
    </PageTransition>
  )
}