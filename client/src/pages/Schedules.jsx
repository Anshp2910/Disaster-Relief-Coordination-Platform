import { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { SkeletonList } from '../components/Skeleton'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { registerRefreshListener } from '../hooks/useSocket'
import { useDebounce } from '../hooks/useDebounce'

const SHIFT_COLORS = {
  Morning: { bg: 'rgba(218,157,66,.1)', text: 'var(--accent-orange)', border: 'rgba(218,157,66,.25)' },
  Afternoon: { bg: 'rgba(74,128,192,.1)', text: 'var(--accent-blue-light)', border: 'rgba(74,128,192,.3)' },
  Night: { bg: 'rgba(107,127,181,.1)', text: 'var(--accent-indigo)', border: 'rgba(107,127,181,.25)' },
  'Full Day': { bg: 'rgba(63,185,80,.1)', text: 'var(--accent-green)', border: 'rgba(63,185,80,.3)' },
}

const STATUS_COLORS = {
  Scheduled: { bg: 'rgba(74,128,192,.1)', text: 'var(--accent-blue-light)', border: 'rgba(74,128,192,.3)' },
  Active: { bg: 'rgba(63,185,80,.1)', text: 'var(--accent-green)', border: 'rgba(63,185,80,.3)' },
  Completed: { bg: 'rgba(100,116,139,.1)', text: 'var(--gov-muted)', border: 'rgba(100,116,139,.3)' },
  Cancelled: { bg: 'rgba(248,81,73,.1)', text: 'var(--accent-red)', border: 'rgba(248,81,73,.3)' },
}

const SKILL_OPTIONS = ['Medical', 'Rescue', 'Logistics', 'Communication', 'Shelter', 'Food', 'Other']
const SHIFT_OPTIONS = ['Morning', 'Afternoon', 'Night', 'Full Day']
const STATUS_FILTER_OPTIONS = ['All', 'Scheduled', 'Active', 'Completed', 'Cancelled']

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

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
      style={{ fontSize: 11, padding: '3px 8px', background: color.bg, color: color.text, border: `1px solid ${color.border}`, borderRadius: 4, cursor: 'pointer' }}
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

  const currentUser = getCurrentUser()

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
          <button className="btnPrimary" onClick={openCreate} aria-label="Create schedule">{t('schedules.createSchedule')}</button>
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
          <select value={filterZone} onChange={(e) => { setFilterZone(e.target.value); setPage(1) }}>
            <option value="All">{t('schedules.allZones')}</option>
            {zones.map((z) => (
              <option key={z._id} value={z._id}>{z.name}</option>
            ))}
          </select>
          <div className="gap-row-xs text-sm">
            <span className="text-muted">{t('schedules.from')}:</span>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} />
          </div>
          <div className="gap-row-xs text-sm">
            <span className="text-muted">{t('schedules.to')}:</span>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} />
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
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: shiftC.bg, color: shiftC.text, border: `1px solid ${shiftC.border}` }}>{item.shift}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: statusC.bg, color: statusC.text, border: `1px solid ${statusC.border}` }}>{item.status}</span>
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
                          <span key={s} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'rgba(107,127,181,.08)', color: 'var(--accent-indigo)' }}>{s}</span>
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
                    <button onClick={() => openEdit(item)} className="text-xs p-xs" aria-label="Edit">Edit</button>
                    <button onClick={() => handleDelete(item._id)} className="btnDanger text-xs p-xs" aria-label="Delete">Delete</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-center flex-gap-sm mt-lg">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="text-sm" aria-label="Previous page">Previous</button>
          <span className="text-base">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="text-sm" aria-label="Next page">Next</button>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="card" style={{ width: 500, maxHeight: '90vh', overflow: 'auto' }}>
            <h3 className="m-0 mb text-lg">{editItem ? t('schedules.editSchedule') : t('schedules.createSchedule')}</h3>
            <form onSubmit={handleSubmit} className="grid flex-gap-sm">
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('schedules.volunteer')}</label>
                <select value={form.userId} onChange={updateForm('userId')} required className="w-full">
                  <option value="">{t('schedules.selectVolunteer')}</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>{u.displayName} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('schedules.zoneOptional')}</label>
                <select value={form.zoneId} onChange={updateForm('zoneId')} className="w-full">
                  <option value="">{t('schedules.noZone')}</option>
                  {zones.map((z) => (
                    <option key={z._id} value={z._id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid-3-responsive">
                <div>
                  <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('schedules.start')}</label>
                  <input type="datetime-local" value={form.startDate} onChange={updateForm('startDate')} required className="w-full" />
                </div>
                <div>
                  <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('schedules.end')}</label>
                  <input type="datetime-local" value={form.endDate} onChange={updateForm('endDate')} required className="w-full" />
                </div>
              </div>

              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('schedules.shift')}</label>
                <select value={form.shift} onChange={updateForm('shift')} className="w-full">
                  {SHIFT_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('schedules.skills')}</label>
                <div className="flex flex-gap-xs flex-wrap">
                  {SKILL_OPTIONS.map((s) => {
                    const active = form.skills.includes(s)
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSkill(s)}
                        style={{
                          fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1px solid', cursor: 'pointer',
                          ...(active
                            ? { background: 'var(--gov-blue)', color: 'white', borderColor: 'var(--gov-blue)' }
                            : { background: 'var(--gov-white)', color: 'var(--gov-muted)', borderColor: 'var(--gov-border)' }),
                        }}
                      >
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>

              <textarea placeholder={t('schedules.notesOptional')} value={form.notes} onChange={updateForm('notes')} rows={2} />

              <div className="flex flex-gap-sm mt-xs">
                <button type="submit" className="btnPrimary" aria-label="Submit">{editItem ? t('schedules.update') : t('schedules.create')}</button>
                <button type="button" onClick={() => setShowForm(false)} className="text-muted" aria-label="Cancel">{t('schedules.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
