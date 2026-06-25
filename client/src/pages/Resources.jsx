import { useEffect, useState, useCallback, useMemo, memo } from 'react'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { SkeletonList } from '../components/Skeleton'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useDebounce } from '../hooks/useDebounce'
import { registerRefreshListener } from '../hooks/useSocket'
import { useToast } from '../components/Toast'
import { useConfirm } from '../hooks/useConfirm'

const CATEGORY_ICONS = {
  Food: '', Water: '', Medical: '', Shelter: '', Supplies: '', Healthcare: '', Sanitation: '', Clothing: '', Transportation: '', Communication: '', Power: '', Infrastructure: '', Other: '',
}

const CATEGORY_COLORS = {
  Food: { bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.25)', text: 'var(--cat-food)' },
  Water: { bg: 'rgba(6,182,212,.1)', border: 'rgba(6,182,212,.25)', text: 'var(--cat-water)' },
  Medical: { bg: 'rgba(239,68,68,.1)', border: 'rgba(239,68,68,.25)', text: 'var(--cat-medical)' },
  Shelter: { bg: 'rgba(59,130,246,.1)', border: 'rgba(59,130,246,.25)', text: 'var(--cat-shelter)' },
  Supplies: { bg: 'rgba(139,92,246,.1)', border: 'rgba(139,92,246,.25)', text: 'var(--cat-supplies)' },
  Healthcare: { bg: 'rgba(236,72,153,.1)', border: 'rgba(236,72,153,.25)', text: 'var(--cat-healthcare)' },
  Sanitation: { bg: 'rgba(20,184,166,.1)', border: 'rgba(20,184,166,.25)', text: 'var(--cat-sanitation)' },
  Clothing: { bg: 'rgba(168,85,247,.1)', border: 'rgba(168,85,247,.25)', text: 'var(--cat-clothing)' },
  Transportation: { bg: 'rgba(99,102,241,.1)', border: 'rgba(99,102,241,.25)', text: 'var(--cat-transportation)' },
  Communication: { bg: 'rgba(59,130,246,.1)', border: 'rgba(59,130,246,.25)', text: 'var(--cat-communication)' },
  Power: { bg: 'rgba(234,179,8,.1)', border: 'rgba(234,179,8,.25)', text: 'var(--cat-power)' },
  Infrastructure: { bg: 'rgba(100,116,139,.1)', border: 'rgba(100,116,139,.25)', text: 'var(--cat-infrastructure)' },
  Other: { bg: 'rgba(156,163,175,.1)', border: 'rgba(156,163,175,.25)', text: 'var(--cat-other)' },
}

const STATUS_COLORS = {
  Available: { bg: 'rgba(34,197,94,.1)', border: 'rgba(34,197,94,.25)', text: 'var(--color-low)' },
  Low: { bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.25)', text: 'var(--color-high)' },
  Depleted: { bg: 'rgba(239,68,68,.1)', border: 'rgba(239,68,68,.25)', text: 'var(--color-critical)' },
  Reserved: { bg: 'rgba(129,140,248,.1)', border: 'rgba(129,140,248,.25)', text: 'var(--accent-indigo)' },
}

const CATEGORIES = ['All', 'Food', 'Water', 'Medical', 'Shelter', 'Supplies', 'Healthcare', 'Sanitation', 'Clothing', 'Transportation', 'Communication', 'Power', 'Infrastructure', 'Other']
const STATUSES = ['All', 'Available', 'Low', 'Depleted', 'Reserved']

const Badge = memo(function Badge({ label, colors, colorKey }) {
  const c = colors[colorKey || label] || colors['Other']
  return (
    <span className="cat-badge" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {label}
    </span>
  )
})

const EMPTY_FORM = { name: '', category: 'Food', quantity: '', unit: '', locationName: '', notes: '' }

export default function Resources() {
  const { t } = useTranslation()
  const toast = useToast()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [summary, setSummary] = useState([])
  const { confirm, ConfirmDialog } = useConfirm()

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
      if (debouncedSearch) params.search = debouncedSearch
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
  }, [page, filterCategory, filterStatus, debouncedSearch])

  useEffect(() => { load() }, [load])

  useAutoRefresh(load, { interval: 20000 })

  useEffect(() => {
    return registerRefreshListener(['resource:created', 'resource:allocated', 'request:created', 'request:updated'], load)
  }, [load])

  function handleSearch(e) {
    e.preventDefault()
    setPage(1)
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
    const ok = await confirm({ message: t('resources.deleteConfirm'), danger: true })
    if (!ok) return
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
      toast.success(t('resources.resourceAllocated'))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setAllocating(false)
    }
  }

  async function handleDeallocate(id) {
    const ok = await confirm({ message: t('resources.deallocatedConfirm'), danger: true })
    if (!ok) return
    try {
      const resource = items.find((r) => r._id === id)
      const deallocQty = resource?.allocatedQuantity || 0
      if (deallocQty <= 0) {
        toast.warning(t('resources.nothingToDeallocate'))
        return
      }
      await clientApi.deallocateResource(id, { deallocQuantity: deallocQty })
      load()
    } catch (err) {
      toast.error(err.message)
    }
  }

  function exportCSV() {
    clientApi.exportResourcesCSV().catch((err) => toast.error(err.message))
  }

  return (
    <div className="container">
      {/* Header Card */}
      <div className="card">
        <div className="headerRow">
          <div>
            <h1 className="pageTitle">{t('nav.resources') || 'Resource Inventory'}</h1>
            <div className="small mt-xs">{total} {t('resources.resourcesTracked')}</div>
          </div>
          <div className="flex flex-gap-sm">
            <button onClick={exportCSV} className="text-sm p-xs" aria-label={t('common.exportCSV')}>{t('resources.exportCSV')}</button>
            <button className="btnPrimary" onClick={openCreate}>{t('resources.addResource')}</button>
          </div>
        </div>

        {error && <div className="errorText mt-sm">{error}</div>}

        {summary.length > 0 && (
          <div className="flex flex-gap-sm mt-md flex-wrap">
            {summary.map((s) => {
              const catColors = CATEGORY_COLORS[s._id] || CATEGORY_COLORS.Other
              return (
                <div key={s._id} className="text-sm text-semi p-sm rounded-sm" style={{ background: catColors.bg, border: catColors.border ? `1px solid ${catColors.border}` : undefined, color: catColors.text }}>
                  {CATEGORY_ICONS[s._id] || CATEGORY_ICONS.Other} {s._id}: {s.totalQty} units ({s.count} items)
                </div>
              )
            })}
          </div>
        )}

        <form onSubmit={handleSearch} className="flex flex-gap-sm mt-md">
          <label htmlFor="res-search" className="sr-only">{t('resources.searchPlaceholder')}</label>
          <input
            id="res-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('resources.searchPlaceholder')}
            className="flex-1"
          />
          <button type="submit" className="btnPrimary text-sm" aria-label={t('resources.search')}>{t('resources.search')}</button>
        </form>

        <div className="flex flex-gap-xs mt-md flex-wrap">
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

        <div className="flex flex-gap-xs mt-sm flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => { setFilterStatus(s); setPage(1) }}
              className={`filter-pill text-xs ${filterStatus === s ? 'active' : ''}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card mt-md">
          <h3 className="m-0 mb text-base">{editItem ? t('resources.editResource') : t('resources.addNewResource')}</h3>
          <form onSubmit={handleSubmit} className="grid-3-responsive">
            <label htmlFor="res-name" className="sr-only">{t('resources.resourceNamePlaceholder')}</label>
            <input id="res-name" placeholder={t('resources.resourceNamePlaceholder')} value={form.name} onChange={(e) => updateForm('name', e.target.value)} required maxLength={200} className="w-full col-span-full" />
            <label htmlFor="res-category" className="sr-only">{t('resources.category')}</label>
            <select id="res-category" value={form.category} onChange={(e) => updateForm('category', e.target.value)}>
              {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
              ))}
            </select>
            <div className="flex flex-gap-sm">
              <label htmlFor="res-qty" className="sr-only">{t('resources.quantity')}</label>
              <input id="res-qty" type="number" placeholder={t('resources.quantity')} value={form.quantity} onChange={(e) => updateForm('quantity', e.target.value)} required min="0" className="flex-1" />
              <label htmlFor="res-unit" className="sr-only">{t('resources.unitPlaceholder')}</label>
              <input id="res-unit" placeholder={t('resources.unitPlaceholder')} value={form.unit} onChange={(e) => updateForm('unit', e.target.value)} required className="flex-1" />
            </div>
            <label htmlFor="res-location" className="sr-only">{t('resources.location')}</label>
            <input id="res-location" placeholder={t('resources.location')} value={form.locationName} onChange={(e) => updateForm('locationName', e.target.value)} required className="col-span-full" />
            <label htmlFor="res-notes" className="sr-only">{t('resources.notesOptional')}</label>
            <textarea id="res-notes" placeholder={t('resources.notesOptional')} value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} rows={2} className="col-span-full" />
            <div className="col-span-full flex flex-gap-sm">
              <button type="submit" className="btnPrimary">{editItem ? t('resources.update') : t('resources.create')}</button>
              <button type="button" onClick={() => setShowForm(false)} className="text-muted" aria-label={t('resources.cancel')}>{t('resources.cancel')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Resource List */}
      <section aria-label={t('nav.resources')}>
      {loading ? (
        <SkeletonList count={4} lines={3} />
      ) : (
        <div className="gridGap mt-md">
          {items.length === 0 ? (
            <div className="text-center p-xl">
              <img src="/images/empty-requests.svg" alt="No resources" className="w-200 mb-sm" />
              <div className="muted">{t('resources.noResources')}</div>
            </div>
          ) : (
            items.map((r) => (
              <div key={r._id} className="listCard">
                <div className="flex flex-between flex-gap-sm">
                  <div className="flex-1">
                    <div className="flex flex-gap-sm flex-wrap">
                      <span className="text-bold text-lg">{r.name}</span>
                      <Badge label={r.category} colors={CATEGORY_COLORS} colorKey={r.category} />
                      <Badge label={r.status} colors={STATUS_COLORS} colorKey={r.status} />
                    </div>
                    <div className="mt-xs text-base">
                      <strong>{r.quantity}</strong> {r.unit}
                      {r.allocatedQuantity > 0 && <span className="text-accent-orange ml-sm">({r.allocatedQuantity} {t('resources.allocated')})</span>}
                    </div>
                    <div className="small muted mt-xs">📍 {r.locationName}</div>
                    {r.allocatedTo && (
                      <div className="small mt-xs">{r.allocatedTo.title || 'Request'}
                      </div>
                    )}
                    {r.notes && <div className="small muted mt-xs">{r.notes}</div>}
                  </div>
                  <div className="flex flex-col flex-gap-xs">
                    {r.status === 'Available' && r.quantity > 0 && (
                      <button
                        onClick={() => { setShowAllocModal(r); setAllocQty(''); setAllocRequestId('') }}
                        className="btn-pill"
                        aria-label={t('resources.allocate')}
                      >
                        {t('resources.allocate')}
                      </button>
                    )}
                    {r.allocatedQuantity > 0 && (
                      <button
                        onClick={() => handleDeallocate(r._id)}
                        className="btn-pill"
                        aria-label={t('resources.deallocate')}
                      >
                        {t('resources.deallocate')}
                      </button>
                    )}
                    <button onClick={() => openEdit(r)} className="text-sm p-xs">{t('resources.editResource')}</button>
                    <button onClick={() => handleDelete(r._id)} className="btnDanger text-sm p-xs">{t('resources.delete')}</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-center flex-gap-sm mt-lg">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="text-sm" aria-label={t('common.previous')}>{t('common.previous')}</button>
          <span className="text-base">{page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="text-sm" aria-label={t('common.next')}>{t('common.next')}</button>
        </div>
      )}

      {/* Allocation Modal */}
      {showAllocModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="card w-400">
            <h3 className="m-0 mb text-lg">{t('resources.allocateResource')}</h3>
            <div className="text-base mb">
              <strong>{showAllocModal.name}</strong> — {showAllocModal.quantity} {showAllocModal.unit} available
            </div>
            <form onSubmit={handleAllocate}>
              <label className="small label-block" htmlFor="alloc-reqid">{t('resources.requestId')}</label>
              <input id="alloc-reqid" value={allocRequestId} onChange={(e) => setAllocRequestId(e.target.value)} placeholder={t('resources.pasteRequestId')} required className="w-full mb-sm text-base" />
              <label className="small label-block" htmlFor="alloc-qty">{t('resources.quantityToAllocate')}</label>
              <input id="alloc-qty" type="number" value={allocQty} onChange={(e) => setAllocQty(e.target.value)} min="1" max={showAllocModal.quantity} required className="w-full mb" />
              <div className="flex flex-gap-sm">
                <button type="submit" disabled={allocating} className="btnPrimary text-base" aria-label={t('resources.allocate')}>
                  {allocating ? '...' : t('resources.allocate')}
                </button>
                <button type="button" onClick={() => { setShowAllocModal(null); setAllocQty('') }} className="text-base" aria-label={t('resources.cancel')}>{t('resources.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {ConfirmDialog}
    </div>
  )
}
