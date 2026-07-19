import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Package, Plus, Edit, CheckCircle, XCircle, Download, CheckSquare, Search } from 'lucide-react'
import { Modal, ErrorState, DataCard, ModernSelect } from '../components/ui'
import Badge from '../components/Badge'
import { clientApi } from '../api/client'
import { useDebounce } from '../hooks/useDebounce'
import { useToast } from '../components/Toast'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { registerRefreshListener } from '../hooks/useSocket'
import { useConfirm } from '../hooks/useConfirm'
import { getErrorMessage } from '../utils/getErrorMessage'
import PageTransition from '../components/ui/PageTransition'
import { SkeletonList } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import { createStagger } from '../utils/animations'
import { CATEGORY_COLORS, RESOURCE_STATUS_COLORS, CATEGORY_OPTIONS, RESOURCE_STATUS_OPTIONS } from '../utils/constants'

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
  allocatedTo?: { title?: string }
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

const containerVariants = createStagger(0.05)

const CATEGORIES = ['All', ...CATEGORY_OPTIONS]
const STATUSES = ['All', ...RESOURCE_STATUS_OPTIONS]
const EMPTY_FORM: ResourceFormState = { name: '', category: 'Food', quantity: '', unit: '', locationName: '', notes: '' }

export default function Resources() {
  useEffect(() => { document.title = 'Disaster Relief - Resources' }, [])
  const { t } = useTranslation()
  const toast = useToast()

  const [items, setItems] = useState<ResourceItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [total, setTotal] = useState(0)
  const [summary, setSummary] = useState<SummaryItem[]>([])
const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [search, setSearch] = useState('')
const debouncedSearch = useDebounce(search, 300)
const { confirm, ConfirmDialog } = useConfirm()

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (allocReqSearchRef.current && !allocReqSearchRef.current.contains(e.target as Node)) {
        setAllocShowReqDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<ResourceItem | null>(null)
  const [form, setForm] = useState<ResourceFormState>(EMPTY_FORM)

  const [showAllocModal, setShowAllocModal] = useState<ResourceItem | null>(null)
  const [allocQty, setAllocQty] = useState('')
  const [allocRequestId, setAllocRequestId] = useState('')
  const [allocating, setAllocating] = useState(false)
  const [allocReqSearch, setAllocReqSearch] = useState('')
  const [allocShowReqDropdown, setAllocShowReqDropdown] = useState(false)
  const [allocReqActiveIndex, setAllocReqActiveIndex] = useState(-1)
  const [requestOptions, setRequestOptions] = useState<{ _id: string; title: string; status: string; locationName?: string }[]>([])
  const allocReqSearchRef = useRef<HTMLDivElement>(null)

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
      const data = await clientApi.getResources(params) as { items?: ResourceItem[]; pages?: number; total?: number }
      setItems(data.items || [])
      setTotalPages(data.pages || 1)
      setTotal(data.total || 0)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [page, filterCategory, filterStatus, debouncedSearch])

  const loadSummary = useCallback(async () => {
    try {
      const data = await clientApi.getResourceStats() as { summaryByCategory?: SummaryItem[] }
      setSummary(data.summaryByCategory || [])
    } catch { /* silent */ }
  }, [])

  useEffect(() => { load(); loadSummary() }, [load, loadSummary])
  useAutoRefresh(load, { interval: 20000 })
  useEffect(() => { return registerRefreshListener(['resource:created', 'resource:allocated', 'request:created', 'request:updated'], load) }, [load])

  function openCreate() { setEditItem(null); setForm(EMPTY_FORM); setShowForm(true) }
  function openEdit(item: ResourceItem) {
    setEditItem(item)
    setForm({ name: item.name || '', category: item.category || 'Food', quantity: String(item.quantity ?? ''), unit: item.unit || '', locationName: item.locationName || '', notes: item.notes || '' })
    setShowForm(true)
  }
  function updateForm(field: keyof ResourceFormState, value: string) { setForm((prev) => ({ ...prev, [field]: value })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const payload = { ...form, quantity: Number(form.quantity) }
      if (editItem) { await clientApi.updateResource(editItem._id, payload) }
      else { await clientApi.createResource(payload) }
      toast.success(editItem ? (t('resources.resourceUpdated') || 'Resource updated') : (t('resources.resourceCreated') || 'Resource created'))
      setShowForm(false)
      load()
    } catch (err) { setError(getErrorMessage(err)) }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ message: t('resources.deleteConfirm'), danger: true })
    if (!ok) return
    try { await clientApi.deleteResource(id); toast.success(t('resources.resourceDeleted') || 'Resource deleted'); load() }
    catch (err) { toast.error(getErrorMessage(err)) }
  }

  async function handleAllocate(e: React.FormEvent) {
    e.preventDefault()
    if (!showAllocModal || !allocQty || !allocRequestId) return
    setAllocating(true)
    try {
      await clientApi.allocateResource(showAllocModal._id, { requestId: allocRequestId.trim(), allocQuantity: Number(allocQty) })
      setShowAllocModal(null); setAllocQty(''); setAllocRequestId(''); load()
      toast.success(t('resources.resourceAllocated'))
    } catch (err) { toast.error(getErrorMessage(err)) }
    finally { setAllocating(false) }
  }

  async function handleDeallocate(id: string) {
    const ok = await confirm({ message: t('resources.deallocatedConfirm'), danger: true })
    if (!ok) return
    try {
      const resource = items.find((r) => r._id === id)
      if (!resource || (resource.allocatedQuantity ?? 0) <= 0) { toast.warning(t('resources.nothingToDeallocate')); return }
      await clientApi.deallocateResource(id, { deallocQuantity: resource.allocatedQuantity })
      load()
    } catch (err) { toast.error(getErrorMessage(err)) }
  }

  function toggleSelectMode() {
    setSelectMode((prev) => { if (prev) { setSelectedIds(new Set()); setBulkEditOpen(false) }; return !prev })
  }
  function handleSelectAll() {
    if (selectedIds.size === items.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(items.map((r) => r._id)))
  }
  function handleSelectOne(id: string) {
    setSelectedIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }
  function openBulkEdit() { setBulkEditStatus(''); setBulkEditCategory(''); setBulkEditOpen(true) }

  async function handleBulkEdit(e: React.FormEvent) {
    e.preventDefault()
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setBulkUpdating(true)
    setBulkProgress({ current: 0, total: ids.length })
    const payload: Record<string, unknown> = {}
    if (bulkEditStatus) payload.status = bulkEditStatus
    if (bulkEditCategory) payload.category = bulkEditCategory
    if (Object.keys(payload).length === 0) { toast.warning(t('resources.noChanges') || 'No changes selected'); setBulkUpdating(false); return }
    let successCount = 0
    for (const id of ids) {
      try { await clientApi.updateResource(id, payload); successCount++ }
      catch (err) { toast.error(`${id.slice(-6)}: ${getErrorMessage(err)}`) }
      setBulkProgress((prev) => ({ ...prev, current: prev.current + 1 }))
    }
    setBulkUpdating(false); setBulkEditOpen(false); setSelectedIds(new Set())
    if (successCount > 0) toast.success(`${successCount} ${t('resources.updated') || 'resource(s) updated'}`)
    load()
  }

  function exportCSV() { clientApi.exportResourcesCSV().catch((err: Error) => toast.error(err.message)) }

  return (
    <PageTransition>
      <div className="container">
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          {/* Dashboard-style Header */}
          <div className="flex-between mb-md mt-md">
            <div>
              <h1 className="page-title">{t('nav.resources') || 'Resource Inventory'}</h1>
              <p className="text-sm text-muted mt-xs">
                {total} {t('resources.resourcesTracked')}
              </p>
            </div>
            <div className="flex gap-sm items-center">
              <button onClick={toggleSelectMode} className="btn-secondary btn-sm" aria-pressed={selectMode}>
                <CheckSquare size={14} />
                <span>{selectMode ? (t('resources.exitSelectMode') || 'Exit') : (t('resources.selectMode') || 'Select')}</span>
              </button>
              <button onClick={exportCSV} className="btn-ghost btn-sm" aria-label={t('resources.exportCSV')}>
                <Download size={14} />
                <span>{t('resources.exportCSV')}</span>
              </button>
              <button onClick={openCreate} className="btn-primary btn-sm" aria-label={t('resources.addResource')}>
                <Plus size={14} />
                <span>{t('resources.addResource')}</span>
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          {summary.length > 0 && (
            <div className="grid-auto-sm gap-md mb-md">
              {summary.map((s) => {
                const catColors = CATEGORY_COLORS[s._id] || CATEGORY_COLORS.Other
                return (
                  <DataCard
                    key={s._id}
                    title={t(`categories.${s._id}`) || s._id}
                    value={`${s.totalQty ?? 0} ${t('resources.units')}`}
                    subtitle={`${s.count ?? 0} ${t('resources.items')}`}
                    icon={<Package size={18} />}
                    color={catColors!.text}
                  />
                )
              })}
            </div>
          )}

          {/* Card wrapper */}
          <div className="card">
            <div className="flex-between mb-sm">
              <h2 className="page-title-sm flex items-center gap-xs">
                <Package size={18} />
                {t('dashboard.allRequests') || 'All Resources'}
              </h2>
            </div>

            {error && <ErrorState message={error} onRetry={load} />}

            {/* Search */}
            <div className="search-input-wrapper" style={{ flex: '1 1 200px', maxWidth: 320, marginBottom: 'var(--space-sm)' }}>
              <Search size={16} className="search-input-icon" />
              <input
                className="search-input"
                placeholder={t('resources.searchPlaceholder')}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                aria-label={t('resources.searchPlaceholder')}
              />
            </div>

            {/* Category Filter Buttons */}
            <div className="dashboard-filter-row">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => { setFilterCategory(c); setPage(1) }}
                  className={`btn-filter ${filterCategory === c ? 'active' : ''}`}
                  aria-pressed={filterCategory === c}
                >
                  {c === 'All' ? t('dashboard.filterAll') : t(`categories.${c}`)}
                </button>
              ))}
            </div>

            {/* Status Filter Buttons */}
            <div className="dashboard-filter-row">
              {STATUSES.map((s) => (
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

            {/* Select Mode UI */}
            {selectMode && items.length > 0 && (
              <div className="flex gap-sm items-center mb-sm">
                <input
                  id="select-all-checkbox"
                  type="checkbox"
                  checked={selectedIds.size === items.length}
                  onChange={handleSelectAll}
                  className="cursor-pointer"
                />
                <label htmlFor="select-all-checkbox" className="text-sm text-muted cursor-pointer">
                  {t('resources.selectAll') || 'Select All'} ({selectedIds.size}/{items.length})
                </label>
              </div>
            )}

            {/* Items Grid */}
            {loading ? (
              <SkeletonList count={4} lines={3} />
            ) : items.length === 0 ? (
              <EmptyState
                icon={<Package size={32} />}
                title={t('resources.noResources')}
                description={t('resources.noResourcesDesc') || 'No resources match your filters.'}
                action={{ onClick: openCreate, label: t('resources.addResource') || 'Add Resource' }}
              />
            ) : (
              <div className="grid-gap">
                {items.map((r) => (
                  <div
                    key={r._id}
                    className={`list-card ${selectMode ? 'list-card--select' : ''}`}
                  >
                    <div className="flex-between gap-sm">
                      {selectMode && (
                        <input
                          id={`res-check-${r._id}`}
                          type="checkbox"
                          checked={selectedIds.has(r._id)}
                          onChange={() => handleSelectOne(r._id)}
                          className="cursor-pointer mt-xs"
                          aria-label={`${t('resources.select') || 'Select'} ${r.name || r._id}`}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        {/* Title row */}
                        <div className="flex items-center gap-xs mb-xs">
                          <span className="text-bold text-accent">{r.name}</span>
                        </div>
                        {/* Badges */}
                        <div className="flex gap-sm flex-wrap mb-xs">
                          <Badge label={t(`categories.${r.category || 'Other'}`)} colors={CATEGORY_COLORS} colorKey={r.category} />
                          <Badge label={r.status || 'Available'} colors={RESOURCE_STATUS_COLORS} colorKey={r.status} />
                        </div>
                        {/* Quantity & allocation info */}
                        <div className="flex items-center gap-sm mt-xs">
                          <span className="text-base text-semi">{r.quantity} {r.unit}</span>
                          {(r.allocatedQuantity ?? 0) > 0 && (
                            <span className="govt-badge govt-badge-saffron">
                              {t('resources.allocated')}: {r.allocatedQuantity}
                            </span>
                          )}
                        </div>
                        {/* Location & notes */}
                        {r.locationName && (
                          <div className="text-xs text-muted mt-xs">{r.locationName}</div>
                        )}
                        {r.allocatedTo && (
                          <div className="text-xs text-muted mt-xs">
                            {r.allocatedTo.title || t('resources.allocatedToRequest')}
                          </div>
                        )}
                      </div>
                      {/* Action buttons */}
                      <div className="resource-actions">
                        {r.status === 'Available' && (r.quantity ?? 0) > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setShowAllocModal(r); setAllocQty(''); setAllocRequestId('') }}
                            className="btn-ghost btn-sm"
                            aria-label={t('resources.allocate')}
                          >
                            <CheckSquare size={12} /> {t('resources.allocate')}
                          </button>
                        )}
                        {(r.allocatedQuantity ?? 0) > 0 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeallocate(r._id) }}
                            className="btn-ghost btn-sm text-danger"
                            aria-label={t('resources.deallocate')}
                          >
                            <XCircle size={12} /> {t('resources.deallocate')}
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(r) }}
                          className="btn-ghost btn-sm"
                          aria-label={t('resources.editResource') || 'Edit resource'}
                        >
                          <Edit size={12} /> {t('resources.editResource')}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(r._id) }}
                          className="btn-ghost btn-sm text-danger"
                          aria-label={t('resources.delete') || 'Delete resource'}
                        >
                          <XCircle size={12} /> {t('resources.delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-sm mt-lg">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="btn-ghost btn-sm"
                  aria-label={t('dashboard.previous') || 'Previous'}
                >
                  {t('dashboard.previous') || 'Previous'}
                </button>
                <span className="text-sm text-muted">{page} / {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="btn-ghost btn-sm"
                  aria-label={t('dashboard.next') || 'Next'}
                >
                  {t('dashboard.next') || 'Next'}
                </button>
              </div>
            )}
          </div>

          {/* Create / Edit Resource Modal */}
          <Modal open={showForm} onClose={() => setShowForm(false)} title={editItem ? t('resources.editResource') : t('resources.addNewResource')}>
            <form onSubmit={handleSubmit}>
              <div className="ff-group">
                <div className={`ff-wrap ${form.name ? 'ff-focused' : ''}`}>
                  <input id="res-name" type="text" value={form.name} onChange={(e) => updateForm('name', e.target.value)} required maxLength={200} className={`ff-input ${form.name ? 'ff-input-filled' : ''}`} placeholder={t('resources.resourceNamePlaceholder')} />
                  <label htmlFor="res-name" className={`ff-label ${form.name ? 'ff-label-float' : ''}`}>{t('resources.resourceNamePlaceholder')}</label>
                </div>
              </div>
              <div className="ff-group">
                <ModernSelect label={t('resources.category')} options={CATEGORIES.filter((c) => c !== 'All').map((c) => ({ label: c, value: c }))} value={form.category} onChange={(v) => updateForm('category', v)} />
              </div>
              <div className="flex gap-sm">
                <div className="ff-group flex-1">
                  <div className={`ff-wrap ${form.quantity ? 'ff-focused' : ''}`}>
                    <input id="res-qty" type="number" value={form.quantity} onChange={(e) => updateForm('quantity', e.target.value)} required min="0" className={`ff-input ${form.quantity ? 'ff-input-filled' : ''}`} placeholder={t('resources.quantity')} />
                    <label htmlFor="res-qty" className={`ff-label ${form.quantity ? 'ff-label-float' : ''}`}>{t('resources.quantity')}</label>
                  </div>
                </div>
                <div className="ff-group flex-1">
                  <div className={`ff-wrap ${form.unit ? 'ff-focused' : ''}`}>
                    <input id="res-unit" type="text" value={form.unit} onChange={(e) => updateForm('unit', e.target.value)} required className={`ff-input ${form.unit ? 'ff-input-filled' : ''}`} placeholder={t('resources.unitPlaceholder')} />
                    <label htmlFor="res-unit" className={`ff-label ${form.unit ? 'ff-label-float' : ''}`}>{t('resources.unitPlaceholder')}</label>
                  </div>
                </div>
              </div>
              <div className="ff-group">
                <div className={`ff-wrap ${form.locationName ? 'ff-focused' : ''}`}>
                  <input id="res-location" type="text" value={form.locationName} onChange={(e) => updateForm('locationName', e.target.value)} required className={`ff-input ${form.locationName ? 'ff-input-filled' : ''}`} placeholder={t('resources.location')} />
                  <label htmlFor="res-location" className={`ff-label ${form.locationName ? 'ff-label-float' : ''}`}>{t('resources.location')}</label>
                </div>
              </div>
              <div className="ff-group">
                <div className={`ff-wrap ${form.notes ? 'ff-focused' : ''}`}>
                  <textarea id="res-notes" value={form.notes} onChange={(e) => updateForm('notes', e.target.value)} rows={2} className="ff-input ff-textarea" placeholder={t('resources.notesOptional')} />
                  <label htmlFor="res-notes" className={`ff-label ${form.notes ? 'ff-label-float' : ''}`}>{t('resources.notesOptional')}</label>
                </div>
              </div>
              <div className="flex gap-sm mt-sm">
                <button type="submit" className="btn-primary btn-sm">
                  <CheckCircle size={16} /> {editItem ? t('resources.update') : t('resources.create')}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-ghost btn-sm">{t('resources.cancel')}</button>
              </div>
            </form>
          </Modal>

          {/* Bulk Edit Modal */}
          <Modal open={bulkEditOpen} onClose={() => setBulkEditOpen(false)} title={t('resources.bulkEdit') || 'Bulk Edit'}>
            <form onSubmit={handleBulkEdit}>
              <div className="ff-group">
                <ModernSelect label={t('resources.status') || 'Status'} options={[{ label: t('common.noChange') || 'No change', value: '' }, ...STATUSES.filter((s) => s !== 'All').map((s) => ({ label: s, value: s }))]} value={bulkEditStatus} onChange={(v) => setBulkEditStatus(v)} />
              </div>
              <div className="ff-group">
                <ModernSelect label={t('resources.category') || 'Category'} options={[{ label: t('common.noChange') || 'No change', value: '' }, ...CATEGORIES.filter((c) => c !== 'All').map((c) => ({ label: c, value: c }))]} value={bulkEditCategory} onChange={(v) => setBulkEditCategory(v)} />
              </div>
              <div className="flex gap-sm">
                <button type="submit" disabled={bulkUpdating} className="btn-primary btn-sm">
                  {bulkUpdating ? <><span className="spinner-sm" aria-hidden="true" /> {t('resources.applying') || 'Applying...'}</> : <>{t('resources.apply') || 'Apply'}</>}
                </button>
                <button type="button" onClick={() => setBulkEditOpen(false)} className="btn-ghost btn-sm">{t('resources.cancel')}</button>
                {bulkUpdating && <span className="text-sm text-muted">{bulkProgress.current}/{bulkProgress.total}</span>}
              </div>
            </form>
          </Modal>

          {/* Allocate Resource Modal */}
          <Modal open={!!showAllocModal} onClose={() => { setShowAllocModal(null); setAllocQty('') }} title={t('resources.allocateResource')}>
            {showAllocModal && (
              <>
                <div className="text-base mb"><strong>{showAllocModal.name}</strong> &mdash; {showAllocModal.quantity} {showAllocModal.unit} {t('resources.available')}</div>
                <form onSubmit={handleAllocate}>
                  <div className="ff-group">
                    <div ref={allocReqSearchRef} className="relative">
                      <div className={`ff-wrap ${allocReqSearch ? 'ff-focused' : ''}`}>
                        <input id="alloc-reqid" type="text" value={allocReqSearch}
                          onChange={(e) => { setAllocReqSearch(e.target.value); setAllocShowReqDropdown(true); if (allocRequestId) setAllocRequestId(''); setAllocReqActiveIndex(-1) }}
                          onFocus={() => { setAllocShowReqDropdown(true); if (requestOptions.length === 0) { void (clientApi.getRequests({ limit: '500', status: 'Open' }) as Promise<{ items: { _id: string; title: string; status: string; locationName?: string }[] }>).then((data) => setRequestOptions(data.items || [])).catch(() => {}) } }}
                          onKeyDown={(e) => {
                            const filtered = requestOptions.filter((r) => (r.title || '').toLowerCase().includes(allocReqSearch.toLowerCase()) || (r.locationName || '').toLowerCase().includes(allocReqSearch.toLowerCase()))
                            if (e.key === 'ArrowDown') { e.preventDefault(); setAllocReqActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1)) }
                            else if (e.key === 'ArrowUp') { e.preventDefault(); setAllocReqActiveIndex((prev) => Math.max(prev - 1, 0)) }
                            else if (e.key === 'Enter' && allocReqActiveIndex >= 0 && filtered[allocReqActiveIndex]) { e.preventDefault(); const r = filtered[allocReqActiveIndex]; setAllocRequestId(r._id); setAllocReqSearch(`${r.title}`); setAllocShowReqDropdown(false) }
                            else if (e.key === 'Escape') { setAllocShowReqDropdown(false) }
                          }}
                          required className={`ff-input ${allocReqSearch ? 'ff-input-filled' : ''}`} placeholder={t('resources.requestId')} />
                        <label htmlFor="alloc-reqid" className={`ff-label ${allocReqSearch ? 'ff-label-float' : ''}`}>{t('resources.requestId')}</label>
                      </div>
                      {allocShowReqDropdown && (
                        <div className="ms-dropdown">
                          {(() => {
                            const filtered = requestOptions.filter((opt) => (opt.title || '').toLowerCase().includes(allocReqSearch.toLowerCase()) || (opt.locationName || '').toLowerCase().includes(allocReqSearch.toLowerCase()))
                            if (filtered.length === 0) return <div className="ms-no-options">{t('common.noResults') || 'No matching requests'}</div>
                            return <div className="overflow-y-auto p-xs">{filtered.map((r, idx) => (
                              <div key={r._id} role="option" aria-selected={idx === allocReqActiveIndex}
                                onClick={() => { setAllocRequestId(r._id); setAllocReqSearch(`${r.title}`); setAllocShowReqDropdown(false) }}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setAllocRequestId(r._id); setAllocReqSearch(`${r.title}`); setAllocShowReqDropdown(false) } }} tabIndex={0}
                                onMouseEnter={() => setAllocReqActiveIndex(idx)} className={`ms-option ${idx === allocReqActiveIndex ? 'ms-option-active' : ''}`}>
                                <span className="text-semi">{r.title}</span><span className="text-muted"> ({r.status})</span>
                              </div>
                            ))}</div>
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ff-group">
                    <div className={`ff-wrap ${allocQty ? 'ff-focused' : ''}`}>
                      <input id="alloc-qty" type="number" value={allocQty} onChange={(e) => setAllocQty(e.target.value)} min="1" max={showAllocModal.quantity} required className={`ff-input ${allocQty ? 'ff-input-filled' : ''}`} placeholder={t('resources.quantityToAllocate')} />
                      <label htmlFor="alloc-qty" className={`ff-label ${allocQty ? 'ff-label-float' : ''}`}>{t('resources.quantityToAllocate')}</label>
                    </div>
                  </div>
                  <div className="flex gap-sm">
                    <button type="submit" disabled={allocating} className="btn-primary btn-sm">
                      {allocating ? <><span className="spinner-sm" aria-hidden="true" /> Allocating...</> : <><CheckCircle size={16} /> {t('resources.allocate')}</>}
                    </button>
                    <button type="button" onClick={() => { setShowAllocModal(null); setAllocQty('') }} className="btn-ghost btn-sm">{t('resources.cancel')}</button>
                  </div>
                </form>
              </>
            )}
          </Modal>

          {/* Sticky Bulk Action Bar */}
          {selectMode && selectedIds.size > 0 && (
            <div className="sticky-bar">
              <button onClick={openBulkEdit} className="btn-primary btn-sm" disabled={bulkUpdating}>
                <Edit size={16} /> {t('resources.editSelected') || 'Edit Selected'} ({selectedIds.size})
              </button>
              <button onClick={() => {
                const selected = items.filter((r) => selectedIds.has(r._id))
                if (selected.length === 0) return
                const headers = ['Name', 'Category', 'Status', 'Quantity', 'Unit', 'Location', 'Notes']
                const rows = selected.map((r) => [r.name || '', r.category || '', r.status || '', String(r.quantity ?? ''), r.unit || '', r.locationName || '', (r.notes || '').replace(/,/g, ' ')])
                const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\\n')
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                a.download = 'selected-resources.csv'
                a.click()
              }} className="btn-ghost btn-sm">
                <Download size={16} /> {t('resources.exportSelected') || 'Export'}
              </button>
            </div>
          )}

          {ConfirmDialog}
        </motion.div>
      </div>
    </PageTransition>
  )
}

