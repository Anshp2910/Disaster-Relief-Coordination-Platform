import { useEffect, useState, useCallback, useMemo, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { SkeletonList } from '../components/Skeleton'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { registerRefreshListener } from '../hooks/useSocket'

const CATEGORY_ICONS = {
  Food: '', Water: '', Medical: '', Shelter: '', Supplies: '', Healthcare: '', Sanitation: '', Clothing: '', Transportation: '', Communication: '', Power: '', Infrastructure: '', Other: '',
}

const CATEGORY_COLORS = {
  Food: { bg: 'rgba(255,153,51,.12)', border: 'rgba(255,153,51,.35)', text: '#cc7a00' },
  Water: { bg: 'rgba(0,128,255,.1)', border: 'rgba(0,128,255,.3)', text: '#0066cc' },
  Medical: { bg: 'rgba(204,0,0,.1)', border: 'rgba(204,0,0,.3)', text: '#cc0000' },
  Shelter: { bg: 'rgba(19,136,8,.1)', border: 'rgba(19,136,8,.3)', text: '#138808' },
  Supplies: { bg: 'rgba(0,0,128,.1)', border: 'rgba(0,0,128,.3)', text: '#000080' },
  Healthcare: { bg: 'rgba(204,0,102,.1)', border: 'rgba(204,0,102,.3)', text: '#cc0066' },
  Sanitation: { bg: 'rgba(0,153,153,.1)', border: 'rgba(0,153,153,.3)', text: '#009999' },
  Clothing: { bg: 'rgba(153,0,153,.1)', border: 'rgba(153,0,153,.3)', text: '#990099' },
  Transportation: { bg: 'rgba(204,102,0,.1)', border: 'rgba(204,102,0,.3)', text: '#cc6600' },
  Communication: { bg: 'rgba(0,102,204,.1)', border: 'rgba(0,102,204,.3)', text: '#0066cc' },
  Power: { bg: 'rgba(204,204,0,.1)', border: 'rgba(204,204,0,.3)', text: '#999900' },
  Infrastructure: { bg: 'rgba(100,100,100,.1)', border: 'rgba(100,100,100,.3)', text: '#555' },
  Other: { bg: 'rgba(100,100,100,.1)', border: 'rgba(100,100,100,.3)', text: '#666' },
}

const STATUS_COLORS = {
  Available: { bg: 'rgba(19,136,8,.1)', border: 'rgba(19,136,8,.3)', text: '#138808' },
  Low: { bg: 'rgba(255,153,51,.12)', border: 'rgba(255,153,51,.35)', text: '#cc7a00' },
  Depleted: { bg: 'rgba(204,0,0,.1)', border: 'rgba(204,0,0,.3)', text: '#cc0000' },
  Reserved: { bg: 'rgba(0,0,128,.1)', border: 'rgba(0,0,128,.3)', text: '#000080' },
}

const CATEGORIES = ['All', 'Food', 'Water', 'Medical', 'Shelter', 'Supplies', 'Healthcare', 'Sanitation', 'Clothing', 'Transportation', 'Communication', 'Power', 'Infrastructure', 'Other']
const STATUSES = ['All', 'Available', 'Low', 'Depleted', 'Reserved']

const Badge = memo(function Badge({ label, colors, colorKey }) {
  const c = colors[colorKey || label] || colors['Other']
  return (
    <span style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text, padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
      {label}
    </span>
  )
})

const EMPTY_FORM = { name: '', category: 'Food', quantity: '', unit: '', locationName: '', notes: '' }

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
  const [searchTrigger, setSearchTrigger] = useState(0)
  const [summary, setSummary] = useState([])

  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const [showAllocModal, setShowAllocModal] = useState(null)
  const [allocQty, setAllocQty] = useState('')
  const [allocRequestId, setAllocRequestId] = useState('')
  const [allocating, setAllocating] = useState(false)

  const load = useCallback(async () => {
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
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [page, filterCategory, filterStatus, search, searchTrigger])

  useEffect(() => { load() }, [load])

  useAutoRefresh(load, { interval: 20000 })

  useEffect(() => {
    return registerRefreshListener(['resource:created', 'resource:allocated', 'request:created', 'request:updated'], load)
  }, [load])

  function handleSearch(e) {
    e.preventDefault()
    setPage(1)
    setSearchTrigger((prev) => prev + 1)
  }

  function openCreate() {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(item) {
    setEditItem(item)
    setForm({ name: item.name, category: item.category, quantity: String(item.quantity), unit: item.unit, locationName: item.locationName, notes: item.notes || '' })
    setShowForm(true)
  }

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
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
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDelete(id) {
    if (!confirm(t('resources.deleteConfirm'))) return
    try {
      await clientApi.deleteResource(id)
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleAllocate(e) {
    e.preventDefault()
    if (!showAllocModal || !allocQty || !allocRequestId) return
    setAllocating(true)
    try {
      await clientApi.allocateResource(showAllocModal._id, { requestId: allocRequestId.trim(), allocQuantity: Number(allocQty) })
      setShowAllocModal(null)
      setAllocQty('')
      setAllocRequestId('')
      load()
      alert(t('resources.resourceAllocated'))
    } catch (err) {
      alert(err.message)
    } finally {
      setAllocating(false)
    }
  }

  async function handleDeallocate(id) {
    if (!confirm(t('resources.deallocatedConfirm'))) return
    try {
      const resource = items.find((r) => r._id === id)
      const deallocQty = resource?.allocatedQuantity || 0
      if (deallocQty <= 0) {
        alert(t('resources.nothingToDeallocate'))
        return
      }
      await clientApi.deallocateResource(id, { deallocQuantity: deallocQty })
      load()
    } catch (err) {
      alert(err.message)
    }
  }

  function exportCSV() {
    window.open(clientApi.exportResourcesCSV(), '_blank')
  }

  return (
    <div className="container">
      {/* Header Card */}
      <div className="card">
        <div className="headerRow">
          <div>
            <h2 className="pageTitle" style={{ fontSize: 20 }}>{t('nav.resources') || 'Resource Inventory'}</h2>
            <div className="small" style={{ marginTop: 4 }}>{total} {t('resources.resourcesTracked')}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={exportCSV} style={{ fontSize: 12, padding: '4px 10px' }}>{t('resources.exportCSV')}</button>
            <button className="btnPrimary" onClick={openCreate}>{t('resources.addResource')}</button>
          </div>
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
            placeholder={t('resources.searchPlaceholder')}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--gov-border)', borderRadius: 6, fontSize: 13 }}
          />
          <button type="submit" className="btnPrimary" style={{ fontSize: 12, padding: '6px 16px' }}>{t('resources.search')}</button>
        </form>

        <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => { setFilterCategory(c); setPage(1) }}
              className={`filter-pill ${filterCategory === c ? 'active' : ''}`}
            >
              {c === 'All' ? 'All' : `${CATEGORY_ICONS[c] || ''} ${c}`}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setFilterStatus(s); setPage(1) }}
              className={`filter-pill ${filterStatus === s ? 'active' : ''}`}
              style={{ fontSize: 11 }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card" style={{ marginTop: 12 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--gov-blue)' }}>{editItem ? t('resources.editResource') : t('resources.addNewResource')}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
            <input placeholder={t('resources.resourceNamePlaceholder')} value={form.name} onChange={(e) => updateForm('name', e.target.value)} required style={{ gridColumn: '1 / -1' }} />
            <select value={form.category} onChange={(e) => updateForm('category', e.target.value)}>
              {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="number" placeholder={t('resources.quantity')} value={form.quantity} onChange={(e) => updateForm('quantity', e.target.value)} required min="0" style={{ flex: 1 }} />
              <input placeholder={t('resources.unitPlaceholder')} value={form.unit} onChange={(e) => updateForm('unit', e.target.value)} required style={{ flex: 1 }} />
            </div>
            <input placeholder={t('resources.location')} value={form.locationName} onChange={(e) => updateForm('locationName', e.target.value)} required style={{ gridColumn: '1 / -1' }} />
            <textarea placeholder={t('resources.notesOptional')} value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} rows={2} style={{ gridColumn: '1 / -1' }} />
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
              <button type="submit" className="btnPrimary">{editItem ? t('resources.update') : t('resources.create')}</button>
              <button type="button" onClick={() => setShowForm(false)} style={{ color: '#666' }}>{t('resources.cancel')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Resource List */}
      {loading ? (
        <SkeletonList count={4} lines={3} />
      ) : (
        <div className="gridGap" style={{ marginTop: 12 }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <img src="/images/empty-requests.svg" alt="No resources" style={{ width: 200, margin: '0 auto 12px', display: 'block' }} />
              <div className="muted">{t('resources.noResources')}</div>
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
                      {r.allocatedQuantity > 0 && <span style={{ color: '#cc7a00', marginLeft: 8 }}>({r.allocatedQuantity} {t('resources.allocated')})</span>}
                    </div>
                    <div className="small muted" style={{ marginTop: 4 }}>📍 {r.locationName}</div>
                    {r.allocatedTo && (
                      <div className="small" style={{ marginTop: 4, color: '#000080' }}>
                        {t('resources.allocatedTo')}: {r.allocatedTo.title || 'Request'}
                      </div>
                    )}
                    {r.notes && <div className="small muted" style={{ marginTop: 4 }}>{r.notes}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    {r.status === 'Available' && r.quantity > 0 && (
                      <button
                        onClick={() => { setShowAllocModal(r); setAllocQty(''); setAllocRequestId('') }}
                        style={{ fontSize: 11, padding: '3px 8px', background: 'rgba(0,0,128,.1)', color: '#000080', border: '1px solid rgba(0,0,128,.3)', borderRadius: 4, cursor: 'pointer' }}
                      >
                        {t('resources.allocate')}
                      </button>
                    )}
                    {r.allocatedQuantity > 0 && (
                      <button
                        onClick={() => handleDeallocate(r._id)}
                        style={{ fontSize: 11, padding: '3px 8px', background: 'rgba(204,0,0,.1)', color: '#cc0000', border: '1px solid rgba(204,0,0,.3)', borderRadius: 4, cursor: 'pointer' }}
                      >
                        {t('resources.deallocate')}
                      </button>
                    )}
                    <button onClick={() => openEdit(r)} style={{ fontSize: 12, padding: '4px 10px' }}>{t('resources.editResource')}</button>
                    <button onClick={() => handleDelete(r._id)} className="btnDanger" style={{ fontSize: 12, padding: '4px 10px' }}>{t('resources.delete')}</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ fontSize: 12, padding: '6px 14px' }}>Previous</button>
          <span style={{ fontSize: 13, padding: '6px 12px' }}>{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ fontSize: 12, padding: '6px 14px' }}>Next</button>
        </div>
      )}

      {/* Allocation Modal */}
      {showAllocModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="card" style={{ width: 400 }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--gov-blue)' }}>{t('resources.allocateResource')}</h3>
            <div style={{ fontSize: 13, marginBottom: 12 }}>
              <strong>{showAllocModal.name}</strong> — {showAllocModal.quantity} {showAllocModal.unit} available
            </div>
            <form onSubmit={handleAllocate}>
              <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('resources.requestId')}</label>
              <input value={allocRequestId} onChange={(e) => setAllocRequestId(e.target.value)} placeholder={t('resources.pasteRequestId')} required style={{ width: '100%', marginBottom: 8, fontSize: 13 }} />
              <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('resources.quantityToAllocate')}</label>
              <input type="number" value={allocQty} onChange={(e) => setAllocQty(e.target.value)} min="1" max={showAllocModal.quantity} required style={{ width: '100%', marginBottom: 12 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={allocating} className="btnPrimary" style={{ fontSize: 13 }}>
                  {allocating ? '...' : t('resources.allocate')}
                </button>
                <button type="button" onClick={() => { setShowAllocModal(null); setAllocQty('') }} style={{ fontSize: 13 }}>{t('resources.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
