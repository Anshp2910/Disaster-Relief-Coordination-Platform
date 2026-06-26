import { useEffect, useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { SkeletonList } from '../components/Skeleton'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useDebounce } from '../hooks/useDebounce'
import { registerRefreshListener } from '../hooks/useSocket'
import { useToast } from '../components/Toast'
import EmptyState from '../components/EmptyState'
import { useConfirm } from '../hooks/useConfirm'
import { CATEGORY_COLORS, RESOURCE_STATUS_COLORS, CATEGORY_OPTIONS, RESOURCE_STATUS_OPTIONS } from '../utils/constants'
import Badge from '../components/Badge'

interface ResourceItem {
  _id: string
  name?: string
  category?: string
  quantity?: number
  unit?: string
  status?: string
  locationName?: string
  notes?: string
  allocatedQuantity?: number
  allocatedTo?: {
    title?: string
  }
}

interface ResourceFormState {
  name: string
  category: string
  quantity: string
  unit: string
  locationName: string
  notes: string
}

interface SummaryItem {
  _id: string
  totalQty?: number
  count?: number
}

const CATEGORY_ICONS: Record<string, string> = {
  Food: '', Water: '', Medical: '', Shelter: '', Supplies: '', Healthcare: '', Sanitation: '', Clothing: '', Transportation: '', Communication: '', Power: '', Infrastructure: '', Other: '',
}

const CATEGORIES = ['All', ...CATEGORY_OPTIONS]
const STATUSES = ['All', ...RESOURCE_STATUS_OPTIONS]

const EMPTY_FORM: ResourceFormState = { name: '', category: 'Food', quantity: '', unit: '', locationName: '', notes: '' }

export default function Resources() {
  const { t } = useTranslation()
  const toast = useToast()

  const [items, setItems] = useState<ResourceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [summary, setSummary] = useState<SummaryItem[]>([])
  const { confirm, ConfirmDialog } = useConfirm()

  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<ResourceItem | null>(null)
  const [form, setForm] = useState<ResourceFormState>(EMPTY_FORM)

  const [showAllocModal, setShowAllocModal] = useState<ResourceItem | null>(null)
  const [allocQty, setAllocQty] = useState('')
  const [allocRequestId, setAllocRequestId] = useState('')
  const [allocating, setAllocating] = useState(false)

  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [bulkEditStatus, setBulkEditStatus] = useState('')
  const [bulkEditCategory, setBulkEditCategory] = useState('')
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params: Record<string, string | number | undefined> = { page, limit: 20 }
      if (filterCategory !== 'All') params.category = filterCategory
      if (filterStatus !== 'All') params.status = filterStatus
      if (debouncedSearch) params.search = debouncedSearch
      const data = await clientApi.getResources(params) as { items?: ResourceItem[]; pages?: number; total?: number; summary?: SummaryItem[] }
      setItems(data.items || [])
      setTotalPages(data.pages || 1)
      setTotal(data.total || 0)
      setSummary(data.summary || [])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [page, filterCategory, filterStatus, debouncedSearch])

  useEffect(() => { load() }, [load])

  useAutoRefresh(load, { interval: 20000 })

  useEffect(() => {
    return registerRefreshListener(['resource:created', 'resource:allocated', 'request:created', 'request:updated'], load)
  }, [load])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
  }

  function openCreate() {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(item: ResourceItem) {
    setEditItem(item)
    setForm({ name: item.name || '', category: item.category || 'Food', quantity: String(item.quantity ?? ''), unit: item.unit || '', locationName: item.locationName || '', notes: item.notes || '' })
    setShowForm(true)
  }

  function updateForm(field: keyof ResourceFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
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
      setError((err as Error).message)
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ message: t('resources.deleteConfirm'), danger: true })
    if (!ok) return
    try {
      await clientApi.deleteResource(id)
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function handleAllocate(e: React.FormEvent) {
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
      toast.error((err as Error).message)
    } finally {
      setAllocating(false)
    }
  }

  async function handleDeallocate(id: string) {
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
      toast.error((err as Error).message)
    }
  }

  function toggleSelectMode() {
    setSelectMode((prev) => {
      if (prev) {
        setSelectedIds(new Set())
        setBulkEditOpen(false)
      }
      return !prev
    })
  }

  function handleSelectAll() {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((r) => r._id)))
    }
  }

  function handleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function openBulkEdit() {
    setBulkEditStatus('')
    setBulkEditCategory('')
    setBulkEditOpen(true)
  }

  async function handleBulkEdit(e: React.FormEvent) {
    e.preventDefault()
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setBulkUpdating(true)
    setBulkProgress({ current: 0, total: ids.length })
    const payload: Record<string, unknown> = {}
    if (bulkEditStatus) payload.status = bulkEditStatus
    if (bulkEditCategory) payload.category = bulkEditCategory
    if (Object.keys(payload).length === 0) {
      toast.warning(t('resources.noChanges') || 'No changes selected')
      setBulkUpdating(false)
      return
    }
    for (const id of ids) {
      try {
        await clientApi.updateResource(id, payload)
        toast.success(`${t('resources.updated') || 'Updated'} ${id.slice(-6)}`)
      } catch (err) {
        toast.error(`${id.slice(-6)}: ${(err as Error).message}`)
      }
      setBulkProgress((prev) => ({ ...prev, current: prev.current + 1 }))
    }
    setBulkUpdating(false)
    setBulkEditOpen(false)
    setSelectedIds(new Set())
    load()
  }

  function exportSelectedCSV() {
    const selected = items.filter((r) => selectedIds.has(r._id))
    if (selected.length === 0) return
    const headers = ['Name', 'Category', 'Status', 'Quantity', 'Unit', 'Location', 'Notes']
    const rows = selected.map((r) => [
      r.name || '',
      r.category || '',
      r.status || '',
      String(r.quantity ?? ''),
      r.unit || '',
      r.locationName || '',
      (r.notes || '').replace(/,/g, ' '),
    ])
    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'selected-resources.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportCSV() {
    clientApi.exportResourcesCSV().catch((err: Error) => toast.error(err.message))
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
            <button onClick={toggleSelectMode} className={`text-sm p-xs ${selectMode ? 'btnPrimary' : ''}`} aria-label={t('resources.selectMode') || 'Select Mode'}>
              {selectMode ? (t('resources.exitSelectMode') || 'Exit Select') : (t('resources.selectMode') || 'Select Mode')}
            </button>
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
          {selectMode && items.length > 0 && (
            <label className="listCard flex flex-gap-sm items-center cursor-pointer" style={{ padding: '0.5rem 0.75rem', userSelect: 'none', borderBottom: '1px solid var(--border)' }}>
              <input
                type="checkbox"
                checked={selectedIds.size === items.length}
                onChange={handleSelectAll}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <span className="text-sm text-muted">{t('resources.selectAll') || 'Select All'} ({selectedIds.size}/{items.length})</span>
            </label>
          )}
          {items.length === 0 ? (
            <EmptyState icon='📦' title={t('resources.noResources')} description={t('resources.noResourcesDesc') || 'No resources match your filters'} />
          ) : (
            items.map((r) => (
              <div key={r._id} className="listCard" style={selectMode ? { paddingLeft: '0.5rem' } : undefined}>
                <div className="flex flex-between flex-gap-sm">
                  {selectMode && (
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', paddingRight: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r._id)}
                        onChange={() => handleSelectOne(r._id)}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                      />
                    </label>
                  )}
                  <div className="flex-1">
                    <div className="flex flex-gap-sm flex-wrap">
                      <span className="text-bold text-lg">{r.name}</span>
                      <Badge label={r.category || 'Other'} colors={CATEGORY_COLORS} colorKey={r.category} />
                      <Badge label={r.status || 'Available'} colors={RESOURCE_STATUS_COLORS} colorKey={r.status} />
                    </div>
                    <div className="mt-xs text-base">
                      <strong>{r.quantity}</strong> {r.unit}
                      {(r.allocatedQuantity ?? 0) > 0 && <span className="text-accent-orange ml-sm">({r.allocatedQuantity} {t('resources.allocated')})</span>}
                    </div>
                    <div className="small muted mt-xs">📍 {r.locationName}</div>
                    {r.allocatedTo && (
                      <div className="small mt-xs">{r.allocatedTo.title || 'Request'}
                      </div>
                    )}
                    {r.notes && <div className="small muted mt-xs">{r.notes}</div>}
                  </div>
                  <div className="flex flex-col flex-gap-xs">
                    {r.status === 'Available' && (r.quantity ?? 0) > 0 && (
                      <button
                        onClick={() => { setShowAllocModal(r); setAllocQty(''); setAllocRequestId('') }}
                        className="btn-pill"
                        aria-label={t('resources.allocate')}
                      >
                        {t('resources.allocate')}
                      </button>
                    )}
                    {(r.allocatedQuantity ?? 0) > 0 && (
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

      {/* Bulk Edit Form */}
      {bulkEditOpen && (
        <div className="card mt-md">
          <h3 className="m-0 mb text-base">{t('resources.bulkEdit') || 'Bulk Edit'}</h3>
          <form onSubmit={handleBulkEdit} className="flex flex-gap-sm flex-wrap items-end">
            <div>
              <label className="small label-block">{t('resources.status') || 'Status'}</label>
              <select value={bulkEditStatus} onChange={(e) => setBulkEditStatus(e.target.value)}>
                <option value="">{t('common.noChange') || '— No change —'}</option>
                {STATUSES.filter((s) => s !== 'All').map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="small label-block">{t('resources.category') || 'Category'}</label>
              <select value={bulkEditCategory} onChange={(e) => setBulkEditCategory(e.target.value)}>
                <option value="">{t('common.noChange') || '— No change —'}</option>
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={bulkUpdating} className="btnPrimary">{t('resources.apply') || 'Apply'}</button>
            <button type="button" onClick={() => setBulkEditOpen(false)} className="text-muted">{t('resources.cancel')}</button>
            {bulkUpdating && (
              <span className="text-sm text-muted">
                {bulkProgress.current}/{bulkProgress.total}
              </span>
            )}
          </form>
        </div>
      )}

      {/* Floating Action Bar */}
      {selectMode && selectedIds.size > 0 && (
        <div className="sticky-bar z-50">
          <button onClick={openBulkEdit} className="btnPrimary text-sm" disabled={bulkUpdating}>
            {t('resources.editSelected') || 'Edit Selected'} ({selectedIds.size})
          </button>
          <button onClick={exportSelectedCSV} className="text-sm p-xs">
            {t('resources.exportSelected') || 'Export Selected'}
          </button>
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
