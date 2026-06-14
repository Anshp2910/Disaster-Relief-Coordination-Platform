import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'

const SHIFT_COLORS = {
  Morning: { bg: 'rgba(255,153,51,.12)', text: '#cc7a00', border: 'rgba(255,153,51,.35)' },
  Afternoon: { bg: 'rgba(0,128,255,.1)', text: '#0066cc', border: 'rgba(0,128,255,.3)' },
  Night: { bg: 'rgba(0,0,128,.1)', text: '#000080', border: 'rgba(0,0,128,.3)' },
  'Full Day': { bg: 'rgba(19,136,8,.1)', text: '#138808', border: 'rgba(19,136,8,.3)' },
}

const STATUS_COLORS = {
  Scheduled: { bg: 'rgba(0,128,255,.1)', text: '#0066cc', border: 'rgba(0,128,255,.3)' },
  Active: { bg: 'rgba(19,136,8,.1)', text: '#138808', border: 'rgba(19,136,8,.3)' },
  Completed: { bg: 'rgba(100,100,100,.1)', text: '#666', border: 'rgba(100,100,100,.3)' },
  Cancelled: { bg: 'rgba(204,0,0,.1)', text: '#cc0000', border: 'rgba(204,0,0,.3)' },
}

const SKILL_OPTIONS = ['Medical', 'Rescue', 'Logistics', 'Communication', 'Shelter', 'Food', 'Other']

export default function Schedules() {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterStatus, setFilterStatus] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [users, setUsers] = useState([])
  const [zones, setZones] = useState([])

  const [form, setForm] = useState({
    userId: '', zoneId: '', startDate: '', endDate: '', shift: 'Full Day', skills: [], notes: '',
  })

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
  })()

  async function load() {
    setLoading(true)
    setError('')
    try {
      const params = { page, limit: 20 }
      if (filterStatus !== 'All') params.status = filterStatus
      const data = await clientApi.getSchedules(params)
      setItems(data.items || [])
      setTotalPages(data.pages || 1)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function loadDropdowns() {
    try {
      const [usersData, zonesData] = await Promise.all([clientApi.adminUsers(), clientApi.getZones()])
      setUsers(usersData.users || usersData.items || [])
      setZones(zonesData.items || [])
    } catch (e) {
      console.error('Failed to load dropdowns:', e)
    }
  }

  useEffect(() => { load() }, [page, filterStatus])
  useEffect(() => { loadDropdowns() }, [])

  function openCreate() {
    setEditItem(null)
    setForm({ userId: currentUser?._id || '', zoneId: '', startDate: '', endDate: '', shift: 'Full Day', skills: [], notes: '' })
    setShowForm(true)
  }

  function openEdit(item) {
    setEditItem(item)
    setForm({
      userId: item.userId?._id || item.userId, zoneId: item.zoneId?._id || item.zoneId || '',
      startDate: item.startDate ? item.startDate.slice(0, 16) : '', endDate: item.endDate ? item.endDate.slice(0, 16) : '',
      shift: item.shift, skills: item.skills || [], notes: item.notes || '',
    })
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const payload = { ...form }
      if (!payload.zoneId) delete payload.zoneId
      if (!payload.userId) payload.userId = currentUser?._id
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
    if (!confirm('Delete this schedule?')) return
    try {
      await clientApi.deleteSchedule(id)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleStatusChange(id, status) {
    try {
      await clientApi.updateSchedule(id, { status })
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  function formatDate(d) {
    return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="container">
      <div className="card">
        <div className="headerRow">
          <div>
            <h2 className="pageTitle" style={{ fontSize: 20 }}>{t('nav.schedules') || 'Volunteer Scheduling'}</h2>
            <div className="small" style={{ marginTop: 4 }}>{items.length} schedules</div>
          </div>
          <button className="btnPrimary" onClick={openCreate}>Create Schedule</button>
        </div>
        {error && <div className="errorText" style={{ marginTop: 8 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {['All', 'Scheduled', 'Active', 'Completed', 'Cancelled'].map((s) => (
            <button key={s} onClick={() => { setFilterStatus(s); setPage(1) }} className={`filter-pill ${filterStatus === s ? 'active' : ''}`}>{s}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="small muted" style={{ marginTop: 16 }}>Loading...</div>
      ) : (
        <div className="gridGap" style={{ marginTop: 12 }}>
          {items.length === 0 && <div className="card" style={{ textAlign: 'center', padding: 24 }}>No schedules found</div>}
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
                    <div style={{ fontSize: 13, color: '#555' }}>
                      {formatDate(item.startDate)} &rarr; {formatDate(item.endDate)}
                    </div>
                    {item.zoneId && <div className="small muted" style={{ marginTop: 4 }}>Zone: {item.zoneId.name || 'Unknown'}</div>}
                    {item.skills?.length > 0 && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                        {item.skills.map((s) => <span key={s} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'rgba(0,0,128,.08)', color: '#000080' }}>{s}</span>)}
                      </div>
                    )}
                    {item.notes && <div className="small muted" style={{ marginTop: 4 }}>{item.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    {item.status === 'Scheduled' && <button onClick={() => handleStatusChange(item._id, 'Active')} style={{ fontSize: 11, padding: '3px 8px', background: 'rgba(19,136,8,.1)', color: '#138808', border: '1px solid rgba(19,136,8,.3)', borderRadius: 4, cursor: 'pointer' }}>Start</button>}
                    {item.status === 'Active' && <button onClick={() => handleStatusChange(item._id, 'Completed')} style={{ fontSize: 11, padding: '3px 8px', background: 'rgba(100,100,100,.1)', color: '#666', border: '1px solid rgba(100,100,100,.3)', borderRadius: 4, cursor: 'pointer' }}>Complete</button>}
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 500, maxHeight: '90vh', overflow: 'auto' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--gov-blue)' }}>{editItem ? 'Edit Schedule' : 'Create Schedule'}</h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8 }}>
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Volunteer</label>
                <select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} required style={{ width: '100%' }}>
                  <option value="">Select volunteer</option>
                  {users.map((u) => <option key={u._id} value={u._id}>{u.displayName} ({u.role})</option>)}
                </select>
              </div>
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Zone (optional)</label>
                <select value={form.zoneId} onChange={(e) => setForm({ ...form, zoneId: e.target.value })} style={{ width: '100%' }}>
                  <option value="">No zone</option>
                  {zones.map((z) => <option key={z._id} value={z._id}>{z.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label className="small" style={{ display: 'block', marginBottom: 4 }}>Start</label>
                  <input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required style={{ width: '100%' }} />
                </div>
                <div>
                  <label className="small" style={{ display: 'block', marginBottom: 4 }}>End</label>
                  <input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Shift</label>
                <select value={form.shift} onChange={(e) => setForm({ ...form, shift: e.target.value })} style={{ width: '100%' }}>
                  {['Morning', 'Afternoon', 'Night', 'Full Day'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="small" style={{ display: 'block', marginBottom: 4 }}>Skills</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {SKILL_OPTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => {
                      setForm((prev) => ({ ...prev, skills: prev.skills.includes(s) ? prev.skills.filter((x) => x !== s) : [...prev.skills, s] }))
                    }} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, border: '1px solid', cursor: 'pointer', ...(form.skills.includes(s) ? { background: 'var(--gov-blue)', color: 'white', borderColor: 'var(--gov-blue)' } : { background: 'white', color: '#666', borderColor: '#ddd' }) }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <textarea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="submit" className="btnPrimary">{editItem ? 'Update' : 'Create'}</button>
                <button type="button" onClick={() => setShowForm(false)} style={{ color: '#666' }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
