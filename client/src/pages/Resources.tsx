import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Package, Plus, Edit, Trash2, CheckCircle, XCircle, Download, CheckSquare } from 'lucide-react'
import { Modal, PageHeader, ErrorState, FilterBar, DataCard, ModernSelect, RippleBtn, PageTransition } from '../components/ui'
import DataList from '../components/ui/DataList'
import Badge from '../components/Badge'
import { clientApi } from '../api/client'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { useDebounce } from '../hooks/useDebounce'
import { registerRefreshListener } from '../hooks/useSocket'
import { useToast } from '../components/Toast'
import { useConfirm } from '../hooks/useConfirm'
import { getErrorMessage } from '../utils/getErrorMessage'
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
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [summary, setSummary] = useState<SummaryItem[]>([])
  const { confirm, ConfirmDialog } = useConfirm()

  // Click outside handler for allocation request search
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

  const summaryCards = useMemo(() => summary.map((s) => {
    const catColors = CATEGORY_COLORS[s._id] || CATEGORY_COLORS.Other
    return (
      <DataCard
        key={s._id}
        title={t(`categories.${s._id}`) || s._id}
        value={`${s.totalQty} ${t('resources.units')}`}
        subtitle={`${s.count} ${t('resources.items')}`}
        icon={<Package size={18} />}
        color={catColors!.text}
      />
    )
  }), [summary, t])

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
      const data = await clientApi.getResources(params) as { items?: ResourceItem[]; pages?: number; total?: number; summary?: SummaryItem[] }
      setItems(data.items || [])
      setTotalPages(data.pages || 1)
      setTotal(data.total || 0)
      setSummary(data.summary || [])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [page, filterCategory, filterStatus, debouncedSearch])

  useEffect(() => { load() }, [load])

  useAutoRefresh(load, { interval: 20000 })

  useEffect(() => {
    return registerRefreshListener(['resource:created', 'resource:allocated', 'request:created', 'request:updated'], load)
  }, [load])

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
      setError(getErrorMessage(err))
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({ message: t('resources.deleteConfirm'), danger: true })
    if (!ok) return
    try {
      await clientApi.deleteResource(id)
      load()
    } catch (err) {
      setError(getErrorMessage(err))
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
      toast.error(getErrorMessage(err))
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
      toast.error(getErrorMessage(err))
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
        toast.error(`${id.slice(-6)}: ${getErrorMessage(err)}`)
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
    const sanitize = (v: string) => /^[=+\-@|]/.test(v) ? `'${v}` : v
    const csv = [headers.join(','), ...rows.map((row) => row.map(sanitize).join(','))].join('\n')
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
    <PageTransition>
      <div className="container">
      <PageHeader
        title={t('nav.resources') || 'Resource Inventory'}
        subtitle={`${total} ${t('resources.resourcesTracked')}`}
        actions={
          <>
            <RippleBtn
              onClick={toggleSelectMode}
              className="text-sm p-xs"
              aria-label={t('resources.selectMode') || 'Select Mode'}
              aria-pressed={selectMode}
            >
              <CheckSquare size={16} />
              <span className="ml-xs">{selectMode ? (t('resources.exitSelectMode') || 'Exit Select') : (t('resources.selectMode') || 'Select Mode')}</span>
            </RippleBtn>
            <button onClick={exportCSV} className="text-sm p-xs" aria-label={t('common.exportCSV')}>
              <Download size={16} />
              <span className="ml-xs">{t('resources.exportCSV')}</span>
            </button>
            <RippleBtn onClick={openCreate} aria-label={t('resources.addResource')}>
              <Plus size={16} />
              {t('resources.addResource')}
            </RippleBtn>
          </>
        }
      />

      {error && <ErrorState message={error} onRetry={load} />}

      {summaryCards.length > 0 && (
        <div className="grid-auto-sm gap-md mb-lg">
          {summaryCards}
        </div>
      )}

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder={t('resources.searchPlaceholder')}
        filters={[
          {
            key: 'category',
            label: t('resources.category') || 'Category',
            options: CATEGORIES.map((c) => ({ key: c, label: c === 'All' ? t('dashboard.filterAll') : t(`categories.${c}`) })),
            value: filterCategory,
            onChange: (v) => { setFilterCategory(v); setPage(1) },
          },
          {
            key: 'status',
            label: t('resources.status') || 'Status',
            options: STATUSES.map((s) => ({ key: s, label: s === 'All' ? t('dashboard.filterAll') : s })),
            value: filterStatus,
            onChange: (v) => { setFilterStatus(v); setPage(1) },
          },
        ]}
      />

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editItem ? t('resources.editResource') : t('resources.addNewResource')}
      >
        <form onSubmit={handleSubmit}>
          <div className="ff-group">
            <div className={`ff-wrap ${form.name ? 'ff-focused' : ''}`}>
              <input
                id="res-name"
                type="text"
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                required
                maxLength={200}
                className={`ff-input ${form.name ? 'ff-input-filled' : ''}`}
                placeholder={t('resources.resourceNamePlaceholder')}
              />
              <label htmlFor="res-name" className={`ff-label ${form.name ? 'ff-label-float' : ''}`}>
                {t('resources.resourceNamePlaceholder')}
              </label>
            </div>
          </div>

          <div className="ff-group">
            <ModernSelect
              label={t('resources.category')}
              options={CATEGORIES.filter((c) => c !== 'All').map((c) => ({ label: c, value: c }))}
              value={form.category}
              onChange={(v) => updateForm('category', v)}
            />
          </div>

          <div className="flex flex-gap-sm">
            <div className="ff-group flex-1">
              <div className={`ff-wrap ${form.quantity ? 'ff-focused' : ''}`}>
                <input
                  id="res-qty"
                  type="number"
                  value={form.quantity}
                  onChange={(e) => updateForm('quantity', e.target.value)}
                  required
                  min="0"
                  className={`ff-input ${form.quantity ? 'ff-input-filled' : ''}`}
                  placeholder={t('resources.quantity')}
                />
                <label htmlFor="res-qty" className={`ff-label ${form.quantity ? 'ff-label-float' : ''}`}>
                  {t('resources.quantity')}
                </label>
              </div>
            </div>
            <div className="ff-group flex-1">
              <div className={`ff-wrap ${form.unit ? 'ff-focused' : ''}`}>
                <input
                  id="res-unit"
                  type="text"
                  value={form.unit}
                  onChange={(e) => updateForm('unit', e.target.value)}
                  required
                  className={`ff-input ${form.unit ? 'ff-input-filled' : ''}`}
                  placeholder={t('resources.unitPlaceholder')}
                />
                <label htmlFor="res-unit" className={`ff-label ${form.unit ? 'ff-label-float' : ''}`}>
                  {t('resources.unitPlaceholder')}
                </label>
              </div>
            </div>
          </div>

          <div className="ff-group">
            <div className={`ff-wrap ${form.locationName ? 'ff-focused' : ''}`}>
              <input
                id="res-location"
                type="text"
                value={form.locationName}
                onChange={(e) => updateForm('locationName', e.target.value)}
                required
                className={`ff-input ${form.locationName ? 'ff-input-filled' : ''}`}
                placeholder={t('resources.location')}
              />
              <label htmlFor="res-location" className={`ff-label ${form.locationName ? 'ff-label-float' : ''}`}>
                {t('resources.location')}
              </label>
            </div>
          </div>

          <div className="ff-group">
            <div className={`ff-wrap ${form.notes ? 'ff-focused' : ''}`}>
              <textarea
                id="res-notes"
                value={form.notes}
                onChange={(e) => updateForm('notes', e.target.value)}
                rows={2}
                className="ff-input ff-textarea"
                placeholder={t('resources.notesOptional')}
              />
              <label htmlFor="res-notes" className={`ff-label ff-label-with-icon ${form.notes ? 'ff-label-float' : ''}`}>
                {t('resources.notesOptional')}
              </label>
            </div>
          </div>

          <div className="flex flex-gap-sm mt">
            <RippleBtn type="submit" className="" aria-label={editItem ? t('resources.update') : t('resources.create')}>
              <CheckCircle size={16} />
              <span className="ml-xs">{editItem ? t('resources.update') : t('resources.create')}</span>
            </RippleBtn>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost btn-sm" aria-label={t('resources.cancel')}>{t('resources.cancel')}</button>
          </div>
        </form>
      </Modal>

      <section aria-label={t('nav.resources')}>
        {selectMode && items.length > 0 && (
          <label
            className="listCard flex flex-gap-sm items-center cursor-pointer p-sm border-bottom"
          >
            <input
              type="checkbox"
              checked={selectedIds.size === items.length}
              onChange={handleSelectAll}
              className="input-checkbox"
              aria-label={t('resources.selectAll') || 'Select All'}
            />
            <span className="text-sm text-muted">{t('resources.selectAll') || 'Select All'} ({selectedIds.size}/{items.length})</span>
          </label>
        )}

        <DataList
          items={items}
          loading={loading}
          emptyTitle={t('resources.noResources')}
          emptyDescription={t('resources.noResourcesDesc') || 'No resources match your filters'}
          skeletonCount={4}
          skeletonLines={3}
          keyExtractor={(r) => r._id}
          renderItem={(r) => (
            <div className={`listCard ${selectMode ? 'p-sm' : ''}`}>
              <div className="flex flex-between flex-gap-sm">
                {selectMode && (
                  <label className="flex items-center cursor-pointer pr-sm">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(r._id)}
                      onChange={() => handleSelectOne(r._id)}
                      className="input-checkbox"
                      aria-label={`${t('resources.select') || 'Select'} ${r.name || r._id}`}
                    />
                  </label>
                )}
                <div className="flex-1">
                  <div className="flex flex-gap-sm flex-wrap">
                    <span className="text-bold text-lg">{r.name}</span>
                  <Badge label={t(`categories.${r.category || 'Other'}`)} colors={CATEGORY_COLORS} colorKey={r.category} />
                  <Badge label={r.status || 'Available'} colors={RESOURCE_STATUS_COLORS} colorKey={r.status} />
                  </div>
                  <div className="mt-xs text-base">
                    <strong>{r.quantity}</strong> {r.unit}
                    {(r.allocatedQuantity ?? 0) > 0 && <span className="text-warning ml-xs">({r.allocatedQuantity} {t('resources.allocated')})</span>}
                  </div>
                  <div className="small muted mt-xs">{r.locationName}</div>
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
                      <CheckSquare size={14} />
                      <span className="ml-xs">{t('resources.allocate')}</span>
                    </button>
                  )}
                  {(r.allocatedQuantity ?? 0) > 0 && (
                    <button
                      onClick={() => handleDeallocate(r._id)}
                      className="btn-pill"
                      aria-label={t('resources.deallocate')}
                    >
                      <XCircle size={14} />
                      <span className="ml-xs">{t('resources.deallocate')}</span>
                    </button>
                  )}
                  <button onClick={() => openEdit(r)} className="text-sm p-xs" aria-label={`${t('resources.editResource')} ${r.name || ''}`}>
                    <Edit size={14} />
                    <span>{t('resources.editResource')}</span>
                  </button>
                  <button onClick={() => handleDelete(r._id)} className="btn-danger btn-sm" aria-label={`${t('resources.delete')} ${r.name || ''}`}>
                    <Trash2 size={14} />
                    {t('resources.delete')}
                  </button>
                </div>
              </div>
            </div>
          )}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </section>

      <Modal
        open={bulkEditOpen}
        onClose={() => setBulkEditOpen(false)}
        title={t('resources.bulkEdit') || 'Bulk Edit'}
      >
        <form onSubmit={handleBulkEdit}>
          <div className="ff-group">
            <ModernSelect
              label={t('resources.status') || 'Status'}
              options={[
                { label: t('common.noChange') || '— No change —', value: '' },
                ...STATUSES.filter((s) => s !== 'All').map((s) => ({ label: s, value: s })),
              ]}
              value={bulkEditStatus}
              onChange={(v) => setBulkEditStatus(v)}
            />
          </div>
          <div className="ff-group">
            <ModernSelect
              label={t('resources.category') || 'Category'}
              options={[
                { label: t('common.noChange') || '— No change —', value: '' },
                ...CATEGORIES.filter((c) => c !== 'All').map((c) => ({ label: c, value: c })),
              ]}
              value={bulkEditCategory}
              onChange={(v) => setBulkEditCategory(v)}
            />
          </div>
          <div className="flex flex-gap-sm">
            <RippleBtn type="submit" disabled={bulkUpdating} className="" aria-label={t('resources.apply') || 'Apply'}>
              <CheckCircle size={16} />
              <span className="ml-xs">{t('resources.apply') || 'Apply'}</span>
            </RippleBtn>
            <button type="button" onClick={() => setBulkEditOpen(false)} className="btn-ghost btn-sm" aria-label={t('resources.cancel')}>{t('resources.cancel')}</button>
            {bulkUpdating && (
              <span className="text-sm text-muted" role="progressbar" aria-valuenow={bulkProgress.current} aria-valuemax={bulkProgress.total}>
                {bulkProgress.current}/{bulkProgress.total}
              </span>
            )}
          </div>
        </form>
      </Modal>

      <Modal
        open={!!showAllocModal}
        onClose={() => { setShowAllocModal(null); setAllocQty('') }}
        title={t('resources.allocateResource')}
      >
        {showAllocModal && (
          <>
            <div className="text-base mb">
              <strong>{showAllocModal.name}</strong> — {showAllocModal.quantity} {showAllocModal.unit} {t('resources.available')}
            </div>
            <form onSubmit={handleAllocate}>
              <div className="ff-group">
                <div ref={allocReqSearchRef} className="relative">
                  <div className={`ff-wrap ${allocReqSearch ? 'ff-focused' : ''}`}>
                    <input
                      id="alloc-reqid"
                      type="text"
                      value={allocReqSearch}
                      onChange={(e) => {
                        setAllocReqSearch(e.target.value)
                        setAllocShowReqDropdown(true)
                        if (allocRequestId) setAllocRequestId('')
                        setAllocReqActiveIndex(-1)
                      }}
                      onFocus={() => {
                        setAllocShowReqDropdown(true)
                        // Load requests on first focus
                        if (requestOptions.length === 0) {
                          ;(clientApi.getRequests({ limit: '500', status: 'Open' }) as Promise<{ items: { _id: string; title: string; status: string; locationName?: string }[] }>)
                            .then((data) => setRequestOptions(data.items || []))
                            .catch(() => {})
                        }
                      }}
                      onKeyDown={(e) => {
                        const filtered = requestOptions.filter((r) =>
                          (r.title || '').toLowerCase().includes(allocReqSearch.toLowerCase()) ||
                          (r.locationName || '').toLowerCase().includes(allocReqSearch.toLowerCase())
                        )
                        if (e.key === 'ArrowDown') {
                          e.preventDefault()
                          setAllocReqActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1))
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault()
                          setAllocReqActiveIndex((prev) => Math.max(prev - 1, 0))
                        } else if (e.key === 'Enter' && allocReqActiveIndex >= 0 && filtered[allocReqActiveIndex]) {
                          e.preventDefault()
                          const r = filtered[allocReqActiveIndex]
                          setAllocRequestId(r._id)
                          setAllocReqSearch(`${r.title} (${r.status || 'Open'}) — ${r.locationName || r._id}`)
                          setAllocShowReqDropdown(false)
                        } else if (e.key === 'Escape') {
                          setAllocShowReqDropdown(false)
                        }
                      }}
                      required
                      className={`ff-input ${allocReqSearch ? 'ff-input-filled' : ''}`}
                      placeholder={t('resources.searchRequestPlaceholder') || 'Search for a request...'}
                      aria-label={t('resources.searchRequest') || 'Search for a request'}
                    />
                    <label htmlFor="alloc-reqid" className={`ff-label ${allocReqSearch ? 'ff-label-float' : ''}`}>
                      {t('resources.requestId')}
                    </label>
                  </div>
                  {allocShowReqDropdown && (
                    <div className="ms-dropdown mt-xs" style={{ left: 0, right: 0, top: '100%', maxHeight: 280 }}>
                      {(() => {
                        const filtered = requestOptions.filter((r) =>
                          (r.title || '').toLowerCase().includes(allocReqSearch.toLowerCase()) ||
                          (r.locationName || '').toLowerCase().includes(allocReqSearch.toLowerCase())
                        )
                        if (filtered.length === 0) return (
                          <div className="ms-no-options">{t('common.noResults') || 'No matching requests'}</div>
                        )
                        return (
                          <div className="overflow-y-auto p-xs" style={{ maxHeight: 240 }}>
                            {filtered.map((r, idx) => (
                              <div
                                key={r._id}
                                role="option"
                                aria-selected={idx === allocReqActiveIndex}
                                onClick={() => {
                                  setAllocRequestId(r._id)
                                  setAllocReqSearch(`${r.title} (${r.status || 'Open'}) — ${r.locationName || r._id}`)
                                  setAllocShowReqDropdown(false)
                                }}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setAllocRequestId(r._id); setAllocReqSearch(`${r.title}`); setAllocShowReqDropdown(false) } }}
                                tabIndex={0}
                                onMouseEnter={() => setAllocReqActiveIndex(idx)}
                                className={`ms-option ${idx === allocReqActiveIndex ? 'ms-option-active' : ''}`}
                              >
                                <span className="text-semi">{r.title}</span>
                                <span className="text-muted"> ({r.status || 'Open'})</span>
                                {r.locationName && <span className="text-muted"> — {r.locationName}</span>}
                              </div>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              </div>
              <div className="ff-group">
                <div className={`ff-wrap ${allocQty ? 'ff-focused' : ''}`}>
                  <input
                    id="alloc-qty"
                    type="number"
                    value={allocQty}
                    onChange={(e) => setAllocQty(e.target.value)}
                    min="1"
                    max={showAllocModal.quantity}
                    required
                    className={`ff-input ${allocQty ? 'ff-input-filled' : ''}`}
                    placeholder={t('resources.quantityToAllocate')}
                  />
                  <label htmlFor="alloc-qty" className={`ff-label ${allocQty ? 'ff-label-float' : ''}`}>
                    {t('resources.quantityToAllocate')}
                  </label>
                </div>
              </div>
              <div className="flex flex-gap-sm">
                <RippleBtn type="submit" disabled={allocating} className="text-base" aria-label={t('resources.allocate')}>
                  {allocating ? '...' : (
                    <><CheckCircle size={16} /><span className="ml-xs">{t('resources.allocate')}</span></>
                  )}
                </RippleBtn>
                <button type="button" onClick={() => { setShowAllocModal(null); setAllocQty('') }} className="btn-ghost btn-sm" aria-label={t('resources.cancel')}>{t('resources.cancel')}</button>
              </div>
            </form>
          </>
        )}
      </Modal>

      {selectMode && selectedIds.size > 0 && (
        <div className="sticky-bar" role="toolbar" aria-label={t('resources.bulkActions') || 'Bulk actions'}>
          <RippleBtn onClick={openBulkEdit} className="text-sm" disabled={bulkUpdating} aria-label={t('resources.editSelected') || 'Edit Selected'}>
            <Edit size={16} />
            <span className="ml-xs">{t('resources.editSelected') || 'Edit Selected'} ({selectedIds.size})</span>
          </RippleBtn>
          <button onClick={exportSelectedCSV} className="text-sm p-xs" aria-label={t('resources.exportSelected') || 'Export Selected'}>
            <Download size={16} />
            <span className="ml-xs">{t('resources.exportSelected') || 'Export Selected'}</span>
          </button>
        </div>
      )}

      {ConfirmDialog}
    </div>
    </PageTransition>
  )
}
