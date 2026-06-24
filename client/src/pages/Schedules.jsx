import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { SkeletonList } from '../components/Skeleton'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { registerRefreshListener } from '../hooks/useSocket'
import { useDebounce } from '../hooks/useDebounce'
import { useAuth } from '../context/AuthContext'

const SHIFT_COLORS = {
  Morning: { bg: 'rgba(245,158,11,0.1)', text: 'var(--accent-orange)', border: 'rgba(245,158,11,0.25)' },
  Afternoon: { bg: 'rgba(59,130,246,0.1)', text: 'var(--accent-blue-light)', border: 'rgba(59,130,246,0.3)' },
  Night: { bg: 'rgba(129,140,248,0.1)', text: 'var(--accent-indigo)', border: 'rgba(129,140,248,0.25)' },
  'Full Day': { bg: 'var(--success-soft)', text: 'var(--accent-green)', border: 'rgba(34,197,94,0.3)' },
}

const STATUS_COLORS = {
  Scheduled: { bg: 'rgba(59,130,246,0.1)', text: 'var(--accent-blue-light)', border: 'rgba(59,130,246,0.3)' },
  Active: { bg: 'var(--success-soft)', text: 'var(--accent-green)', border: 'rgba(34,197,94,0.3)' },
  Completed: { bg: 'rgba(100,116,139,0.1)', text: 'var(--gov-muted)', border: 'rgba(100,116,139,0.3)' },
  Cancelled: { bg: 'var(--danger-soft)', text: 'var(--accent-red)', border: 'rgba(239,68,68,0.3)' },
}

const SKILL_OPTIONS = ['Medical', 'Rescue', 'Logistics', 'Communication', 'Shelter', 'Food', 'Other']
const SHIFT_OPTIONS = ['Morning', 'Afternoon', 'Night', 'Full Day']
const STATUS_FILTER_OPTIONS = ['All', 'Scheduled', 'Active', 'Completed', 'Cancelled']

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

const StatusButton = memo(function StatusButton({ currentStatus, expectedStatus, nextStatus, label, color, scheduleId, onStatusChange }) {
  if (currentStatus !== expectedStatus) return null
  return (
    <button
      onClick={() => onStatusChange(scheduleId, nextStatus)}
      className="skill-pill" style={{ background: color.bg, color: color.text, borderColor: color.border }}
    >
      {label}
    </button>
  )
})

const DEFAULT_FORM = {
  userId: '', zoneId: '', startDate: '', endDate: '', shift: 'Full Day', skills: [], notes: '',
}

export default function Schedules() {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
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
  const [editItem, setEditItem] = useState(null)
  const [users, setUsers] = useState([])
  const [zones, setZones] = useState([])
  const [form, setForm] = useState(DEFAULT_FORM)

  const { user: currentUser } = useAuth()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { page, limit: 20 }
      if (filterStatus !== 'All') params.status = filterStatus
      if (filterShift !== 'All') params.shift = filterShift
      if (filterZone !== 'All') params.zoneId = filterZone
      if (dateFrom) params.startDate = dateFrom
      if (dateTo) params.endDate = dateTo
      const data = await clientApi.getSchedules(params)
      setItems(data.items || [])
      setTotalPages(data.pages || 1)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus, filterShift, filterZone, dateFrom, dateTo])

  async function loadDropdowns() {
    try {
      const zonesData = await clientApi.getZones()
      setZones(zonesData.items || [])
    } catch (e) {
      // silently fail
    }
    if (currentUser?.role === 'admin') {
      try {
        const usersData = await clientApi.adminUsers()
        setUsers(usersData.users || [])
      } catch (e) {
        // silently fail
      }
    } else {
      setUsers([{ _id: currentUser?.id, displayName: currentUser?.displayName || currentUser?.email, role: currentUser?.role }])
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

  function openEdit(item) {
    setEditItem(item)
    setForm({
      userId: item.userId?._id || item.userId,
      zoneId: item.zoneId?._id || item.zoneId || '',
      startDate: item.startDate ? item.startDate.slice(0, 16) : '',
      endDate: item.endDate ? item.endDate.slice(0, 16) : '',
      shift: item.shift,
      skills: item.skills || [],
      notes: item.notes || '',
    })
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const payload = { ...form }
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
      setError(e.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm(t('schedules.deleteConfirm'))) return
    try {
      await clientApi.deleteSchedule(id)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleStatusChange = useCallback(async (id, status) => {
    try {
      await clientApi.updateSchedule(id, { status })
      load()
    } catch (e) {
      setError(e.message)
    }
  }, [load])

  function toggleSkill(skill) {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill) ? prev.skills.filter((s) => s !== skill) : [...prev.skills, skill],
    }))
  }

  const updateForm = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="container">
      <div className="card">
        <div className="headerRow">
          <div>
            <h2 className="pageTitle">{t('nav.schedules') || 'Volunteer Scheduling'}</h2>
            <div className="small mt-xs">{items.length} {t('schedules.schedulesCount')}</div>
          </div>
            <button className="btnPrimary" onClick={openCreate} aria-label={t('schedules.createSchedule')}>{t('schedules.createSchedule')}</button>
        </div>

        {error && <div className="errorText mt-sm">{error}</div>}

        <div className="flex flex-gap-xs mt-md flex-wrap">
          {STATUS_FILTER_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setFilterStatus(s); setPage(1) }}
              className={`filter-pill ${filterStatus === s ? 'active' : ''}`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex flex-gap-xs mt-sm flex-wrap">
          {['All', ...SHIFT_OPTIONS].map((s) => (
            <button
              key={s}
              onClick={() => { setFilterShift(s); setPage(1) }}
              className={`filter-pill text-xs ${filterShift === s ? 'active' : ''}`}
            >
              {s === 'All' ? t('dashboard.filterAll') : s}
            </button>
          ))}
        </div>

        <div className="flex flex-gap-sm mt-sm flex-wrap gap-row-sm">
          <label htmlFor="sch-zonefilter" className="sr-only">Filter by zone</label>
          <select id="sch-zonefilter" value={filterZone} onChange={(e) => { setFilterZone(e.target.value); setPage(1) }}>
            <option value="All">{t('schedules.allZones')}</option>
            {zones.map((z) => (
              <option key={z._id} value={z._id}>{z.name}</option>
            ))}
          </select>
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
      </div>

      {loading ? (
        <SkeletonList count={4} lines={3} />
      ) : (
        <div className="gridGap mt-md">
          {items.length === 0 && (
            <div className="card text-center p-xl">{t('schedules.noSchedules')}</div>
          )}

          {items.map((item) => {
            const shiftC = SHIFT_COLORS[item.shift] || SHIFT_COLORS['Full Day']
            const statusC = STATUS_COLORS[item.status] || STATUS_COLORS.Scheduled
            return (
              <div key={item._id} className="listCard">
                <div className="flex flex-between flex-gap-sm">
                  <div className="flex-1">
                    <div className="flex flex-gap-sm flex-wrap mb-xs">
                      <span className="text-bold text-base">{item.userId?.displayName || 'Volunteer'}</span>
                      <span className="status-badge" style={{ background: shiftC.bg, color: shiftC.text, border: `1px solid ${shiftC.border}` }}>{item.shift}</span>
                      <span className="status-badge" style={{ background: statusC.bg, color: statusC.text, border: `1px solid ${statusC.border}` }}>{item.status}</span>
                    </div>

                    <div className="text-base text-muted">
                      {formatDate(item.startDate)} &rarr; {formatDate(item.endDate)}
                    </div>

                    {item.zoneId && (
                      <div className="small muted mt-xs">Zone: {item.zoneId.name || 'Unknown'}</div>
                    )}

                    {item.skills?.length > 0 && (
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
                      currentStatus={item.status}
                      expectedStatus="Scheduled"
                      nextStatus="Active"
                      label={t('schedules.startButton')}
                      color={STATUS_COLORS.Active}
                      scheduleId={item._id}
                      onStatusChange={handleStatusChange}
                    />
                    <StatusButton
                      currentStatus={item.status}
                      expectedStatus="Active"
                      nextStatus="Completed"
                      label={t('schedules.completeButton')}
                      color={STATUS_COLORS.Completed}
                      scheduleId={item._id}
                      onStatusChange={handleStatusChange}
                    />
                    <button onClick={() => openEdit(item)} className="text-xs p-xs" aria-label={t('common.edit')}>{t('common.edit')}</button>
                    <button onClick={() => handleDelete(item._id)} className="btnDanger text-xs p-xs" aria-label={t('common.delete')}>{t('common.delete')}</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-center flex-gap-sm mt-lg">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="text-sm" aria-label={t('common.previous')}>{t('common.previous')}</button>
          <span className="text-base">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="text-sm" aria-label={t('common.next')}>{t('common.next')}</button>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="card w-500 overflow-auto" style={{ maxHeight: '90vh' }}>
            <h3 className="m-0 mb text-lg">{editItem ? t('schedules.editSchedule') : t('schedules.createSchedule')}</h3>
            <form onSubmit={handleSubmit} className="grid flex-gap-sm">
              <div>
                <label htmlFor="sch-volunteer" className="small label-block">{t('schedules.volunteer')}</label>
                <select id="sch-volunteer" value={form.userId} onChange={updateForm('userId')} required className="w-full">
                  <option value="">{t('schedules.selectVolunteer')}</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>{u.displayName} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="sch-zone" className="small label-block">{t('schedules.zoneOptional')}</label>
                <select id="sch-zone" value={form.zoneId} onChange={updateForm('zoneId')} className="w-full">
                  <option value="">{t('schedules.noZone')}</option>
                  {zones.map((z) => (
                    <option key={z._id} value={z._id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid-3-responsive">
                <div>
                  <label htmlFor="sch-start" className="small label-block">{t('schedules.start')}</label>
                  <input id="sch-start" type="datetime-local" value={form.startDate} onChange={updateForm('startDate')} required className="w-full" />
                </div>
                <div>
                  <label htmlFor="sch-end" className="small label-block">{t('schedules.end')}</label>
                  <input id="sch-end" type="datetime-local" value={form.endDate} onChange={updateForm('endDate')} required className="w-full" />
                </div>
              </div>

              <div>
                <label htmlFor="sch-shift" className="small label-block">{t('schedules.shift')}</label>
                <select id="sch-shift" value={form.shift} onChange={updateForm('shift')} className="w-full">
                  {SHIFT_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="small label-block">{t('schedules.skills')}</label>
                <div className="flex flex-gap-xs flex-wrap">
                  {SKILL_OPTIONS.map((s) => {
                    const active = form.skills.includes(s)
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSkill(s)}
                        className={`skill-pill ${active ? 'active' : 'inactive'}`}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>

              <label htmlFor="sch-notes" className="sr-only">{t('schedules.notesOptional')}</label>
              <textarea id="sch-notes" placeholder={t('schedules.notesOptional')} value={form.notes} onChange={updateForm('notes')} rows={2} />

              <div className="flex flex-gap-sm mt-xs">
                <button type="submit" className="btnPrimary" aria-label={t('common.submit')}>{editItem ? t('schedules.update') : t('schedules.create')}</button>
                <button type="button" onClick={() => setShowForm(false)} className="text-muted" aria-label={t('common.cancel')}>{t('schedules.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
