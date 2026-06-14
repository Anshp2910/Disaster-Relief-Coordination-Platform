import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'

const CATEGORY_ICONS = {
  Food: '🍚', Water: '💧', Medical: '🏥', Shelter: '🏠', Supplies: '📦', Other: '📋',
}

const CATEGORY_COLORS = {
  Food: { bg: 'rgba(255,153,51,.12)', border: 'rgba(255,153,51,.35)', text: '#cc7a00' },
  Water: { bg: 'rgba(0,128,255,.1)', border: 'rgba(0,128,255,.3)', text: '#0066cc' },
  Medical: { bg: 'rgba(204,0,0,.1)', border: 'rgba(204,0,0,.3)', text: '#cc0000' },
  Shelter: { bg: 'rgba(19,136,8,.1)', border: 'rgba(19,136,8,.3)', text: '#138808' },
  Supplies: { bg: 'rgba(0,0,128,.1)', border: 'rgba(0,0,128,.3)', text: '#000080' },
  Other: { bg: 'rgba(100,100,100,.1)', border: 'rgba(100,100,100,.3)', text: '#666' },
}

const STATUS_COLORS = {
  Available: { bg: 'rgba(19,136,8,.1)', border: 'rgba(19,136,8,.3)', text: '#138808' },
  Low: { bg: 'rgba(255,153,51,.12)', border: 'rgba(255,153,51,.35)', text: '#cc7a00' },
  Depleted: { bg: 'rgba(204,0,0,.1)', border: 'rgba(204,0,0,.3)', text: '#cc0000' },
  Reserved: { bg: 'rgba(0,0,128,.1)', border: 'rgba(0,0,128,.3)', text: '#000080' },
}

function Badge({ label, colors, colorKey }) {
  const c = colors[colorKey || label] || colors['Other']
  return (
    <span style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
      {label}
    </span>
  )
}

export default function Resources() {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [summary, setSummary] = useState([])

  const [form, setForm] = useState({ name: '', category: 'Food', quantity: '', unit: '', locationName: '', notes: '' })

  async function load() {
    setLoading(true)
    setError('')
    try {
      const params = { page, limit: 20 }
      if (filterCategory !== 'All') params.category = filterCategory
      if (filterStatus !== 'All') params.status = filterStatus
      if (search) params.search = search
      const data = await clientApi.getResources(params)
      setItems(data.items || [])
      setTotalPages(data.pages || 1)
      setTotal(data.total || 0)
      setSummary(data.summary || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page, filterCategory, filterStatus])

  function handleSearch(e) {
    e.preventDefault()
    setPage(1)
    load()
  }

  function openCreate() {
    setEditItem(null)
    setForm({ name: '', category: 'Food', quantity: '', unit: '', locationName: '', notes: '' })
    setShowForm(true)
  }

  function openEdit(item) {
    setEditItem(item)
    setForm({ name: item.name, category: item.category, quantity: String(item.quantity), unit: item.unit, locationName: item.locationName, notes: item.notes || '' })
    setShowForm(true)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const payload = { ...form, quantity: Number(form.quantity) }
      if (editItem) {
        await clientApi.updateResource(editItem._id, payload)
      } else {
        await clientApi.createResource(payload)
      }
      setShowForm(false)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this resource?')) return
    try {
      await clientApi.deleteResource(id)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  const categories = ['All', 'Food', 'Water', 'Medical', 'Shelter', 'Supplies', 'Other']
  const statuses = ['All', 'Available', 'Low', 'Depleted', 'Reserved']

  return (
    <div className="container">
      <div className="card">
        <div className="headerRow">
          <div>
            <h2 className="pageTitle" style={{ fontSize: 20 }}>{t('nav.resources') || 'Resource Inventory'}</h2>
            <div className="small" style={{ marginTop: 4 }}>{total} resources tracked</div>
          </div>
          <button className="btnPrimary" onClick={openCreate}>Add Resource</button>
        </div>

        {error && <div className="errorText" style={{ marginTop: 8 }}>{error}</div>}

        {summary.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {summary.map((s) => (
              <div key={s._id} style={{ ...CATEGORY_COLORS[s._id], padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                {CATEGORY_ICONS[s._id]} {s._id}: {s.totalQty} units ({s.count} items)
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources..."
            style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--gov-border)', borderRadius: 6, fontSize: 13 }}
          />
          <button type="submit" className="btnPrimary" style={{ fontSize: 12, padding: '6px 16px' }}>Search</button>
        </form>

        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {categories.map((c) => (
            <button key={c} onClick={() => { setFilterCategory(c); setPage(1) }} className={`filter-pill ${filterCategory === c ? 'active' : ''}`}>
              {c === 'All' ? 'All' : `${CATEGORY_ICONS[c] || ''} ${c}`}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {statuses.map((s) => (
            <button key={s} onClick={() => { setFilterStatus(s); setPage(1) }} className={`filter-pill ${filterStatus === s ? 'active' : ''}`} style={{ fontSize: 11 }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--gov-blue)' }}>{editItem ? 'Edit Resource' : 'Add New Resource'}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
            <input placeholder="Resource name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={{ gridColumn: '1 / -1' }} />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {categories.filter((c) => c !== 'All').map((c) => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" placeholder="Qty" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required min="0" style={{ flex: 1 }} />
              <input placeholder="Unit (kg, boxes)" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required style={{ flex: 1 }} />
            </div>
            <input placeholder="Location" value={form.locationName} onChange={(e) => setForm({ ...form, locationName: e.target.value })} required style={{ gridColumn: '1 / -1' }} />
            <textarea placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} style={{ gridColumn: '1 / -1' }} />
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
              <button type="submit" className="btnPrimary">{editItem ? 'Update' : 'Create'}</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ color: '#666' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="small muted" style={{ marginTop: 16 }}>Loading...</div>
      ) : (
        <div className="gridGap" style={{ marginTop: 12 }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <img src="/images/empty-requests.svg" alt="No resources" style={{ width: 200, margin: '0 auto 12px', display: 'block' }} />
              <div className="muted">No resources tracked yet. Add your first resource to get started.</div>
            </div>
          ) : (
            items.map((r) => (
              <div key={r._id} className="listCard">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#000080' }}>{r.name}</span>
                      <Badge label={r.category} colors={CATEGORY_COLORS} colorKey={r.category} />
                      <Badge label={r.status} colors={STATUS_COLORS} colorKey={r.status} />
                    </div>
                    <div style={{ marginTop: 6, fontSize: 13 }}>
                      <strong>{r.quantity}</strong> {r.unit}
                      {r.allocatedQuantity > 0 && <span style={{ color: '#cc7a00', marginLeft: 8 }}>({r.allocatedQuantity} allocated)</span>}
                    </div>
                    <div className="small muted" style={{ marginTop: 4 }}>📍 {r.locationName}</div>
                    {r.allocatedTo && (
                      <div className="small" style={{ marginTop: 4, color: '#000080' }}>
                        Allocated to: {r.allocatedTo.title || 'Request'}
                      </div>
                    )}
                    {r.notes && <div className="small muted" style={{ marginTop: 4 }}>{r.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    <button onClick={() => openEdit(r)} style={{ fontSize: 12, padding: '4px 10px' }}>Edit</button>
                    <button onClick={() => handleDelete(r._id)} className="btnDanger" style={{ fontSize: 12, padding: '4px 10px' }}>Delete</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ fontSize: 12, padding: '6px 14px' }}>Previous</button>
          <span style={{ fontSize: 13, padding: '6px 12px' }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ fontSize: 12, padding: '6px 14px' }}>Next</button>
        </div>
      )}
    </div>
  )
}
