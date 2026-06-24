import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react'
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

const StatusButton = memo(function StatusButton({ currentStatus, expectedStatus, nextStatus, label, color, onStatusChange }) {
  if (currentStatus !== expectedStatus) return null
  return (
    <button
      onClick={() => onStatusChange(nextStatus)}
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
      console.error('Failed to load zones:', e)
    }
    if (currentUser?.role === 'admin') {
      try {
        const usersData = await clientApi.adminUsers()
        setUsers(usersData.users || [])
      } catch (e) {
        console.error('Failed to load users:', e)
      }
    } else {
      setUsers([{ _id: currentUser?.id, displayName: currentUser?.displayName || currentUser?.email, role: currentUser?.role }])
    }
  }

  useEffect(() => { load() }, [load, page, filterStatus, filterShift, filterZone, dateFrom, dateTo])
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
            <h2 className="pageTitle" style={{ fontSize: 20 }}>{t('nav.schedules') || 'Volunteer Scheduling'}</h2>
            <div className="small" style={{ marginTop: 4 }}>{items.length} {t('schedules.schedulesCount')}</div>
          </div>
          <button className="btnPrimary" onClick={openCreate}>{t('schedules.createSchedule')}</button>
        </div>

        {error && <div className="errorText" style={{ marginTop: 8 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
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

        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {['All', ...SHIFT_OPTIONS].map((s) => (
            <button
              key={s}
              onClick={() => { setFilterShift(s); setPage(1) }}
              className={`filter-pill ${filterShift === s ? 'active' : ''}`}
              style={{ fontSize: 11 }}
            >
              {s === 'All' ? t('dashboard.filterAll') : s}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={filterZone} onChange={(e) => { setFilterZone(e.target.value); setPage(1) }} style={{ padding: '6px 10px', border: '1px solid var(--gov-border)', borderRadius: 6, fontSize: 12 }}>
            <option value="All">{t('schedules.allZones')}</option>
            {zones.map((z) => (
              <option key={z._id} value={z._id}>{z.name}</option>
            ))}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <span style={{ color: 'var(--gov-muted)' }}>{t('schedules.from')}:</span>
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }} style={{ padding: '5px 8px', border: '1px solid var(--gov-border)', borderRadius: 6, fontSize: 12 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <span style={{ color: 'var(--gov-muted)' }}>{t('schedules.to')}:</span>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }} style={{ padding: '5px 8px', border: '1px solid var(--gov-border)', borderRadius: 6, fontSize: 12 }} />
          </div>
        </div>
      </div>

      {loading ? (
        <SkeletonList count={4} lines={3} />
      ) : (
        <div className="gridGap" style={{ marginTop: 12 }}>
          {items.length === 0 && (
            <div className="card" style={{ textAlign: 'center', padding: 24 }}>{t('schedules.noSchedules')}</div>
          )}

          {items.map((item) => {
            const shiftC = SHIFT_COLORS[item.shift] || SHIFT_COLORS['Full Day']
            const statusC = STATUS_COLORS[item.status] || STATUS_COLORS.Scheduled
            return (
              <div key={item._id} className="listCard">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{item.userId?.displayName || 'Volunteer'}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: shiftC.bg, color: shiftC.text, border: `1px solid ${shiftC.border}` }}>{item.shift}</span>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: statusC.bg, color: statusC.text, border: `1px solid ${statusC.border}` }}>{item.status}</span>
                    </div>

                    <div style={{ fontSize: 13, color: 'var(--gov-muted)' }}>
                      {formatDate(item.startDate)} &rarr; {formatDate(item.endDate)}
                    </div>

                    {item.zoneId && (
                      <div className="small muted" style={{ marginTop: 4 }}>Zone: {item.zoneId.name || 'Unknown'}</div>
                    )}

                    {item.skills?.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                        {item.skills.map((s) => (
                          <span key={s} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'rgba(107,127,181,.08)', color: 'var(--accent-indigo)' }}>{s}</span>
                        ))}
                      </div>
                    )}

                    {item.notes && <div className="small muted" style={{ marginTop: 4 }}>{item.notes}</div>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    <StatusButton
                      currentStatus={item.status}
                      expectedStatus="Scheduled"
                      nextStatus="Active"
                      label={t('schedules.startButton')}
                      color={STATUS_COLORS.Active}
                      onStatusChange={(s) => handleStatusChange(item._id, s)}
                    />
                    <StatusButton
                      currentStatus={item.status}
                      expectedStatus="Active"
                      nextStatus="Completed"
                      label={t('schedules.completeButton')}
                      color={STATUS_COLORS.Completed}
                      onStatusChange={(s) => handleStatusChange(item._id, s)}
                    />
                    <button onClick={() => openEdit(item)} style={{ fontSize: 11, padding: '3px 8px' }}>Edit</button>
                    <button onClick={() => handleDelete(item._id)} className="btnDanger" style={{ fontSize: 11, padding: '3px 8px' }}>Delete</button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ fontSize: 12, padding: '6px 14px' }}>Previous</button>
          <span style={{ fontSize: 13, padding: '6px 12px' }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ fontSize: 12, padding: '6px 14px' }}>Next</button>
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 500, maxHeight: '90vh', overflow: 'auto' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--gov-blue)' }}>{editItem ? t('schedules.editSchedule') : t('schedules.createSchedule')}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8 }}>
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('schedules.volunteer')}</label>
                <select value={form.userId} onChange={updateForm('userId')} required style={{ width: '100%' }}>
                  <option value="">{t('schedules.selectVolunteer')}</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>{u.displayName} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('schedules.zoneOptional')}</label>
                <select value={form.zoneId} onChange={updateForm('zoneId')} style={{ width: '100%' }}>
                  <option value="">{t('schedules.noZone')}</option>
                  {zones.map((z) => (
                    <option key={z._id} value={z._id}>{z.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))', gap: 8 }}>
                <div>
                  <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('schedules.start')}</label>
                  <input type="datetime-local" value={form.startDate} onChange={updateForm('startDate')} required style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('schedules.end')}</label>
                  <input type="datetime-local" value={form.endDate} onChange={updateForm('endDate')} required style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('schedules.shift')}</label>
                <select value={form.shift} onChange={updateForm('shift')} style={{ width: '100%' }}>
                  {SHIFT_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('schedules.skills')}</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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

              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="submit" className="btnPrimary">{editItem ? t('schedules.update') : t('schedules.create')}</button>
                <button type="button" onClick={() => setShowForm(false)} style={{ color: 'var(--gov-muted)' }}>{t('schedules.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
