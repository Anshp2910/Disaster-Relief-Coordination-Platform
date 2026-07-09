import { useState, useMemo, useCallback, useRef, useEffect, memo, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, X, Download, Columns3, Check, Trash2, CheckSquare, Square } from 'lucide-react'

export interface ColumnDef<T> {
  id: string
  header: string
  accessor: ((row: T) => ReactNode) | keyof T
  sortable?: boolean
  filterable?: boolean
  visible?: boolean
  width?: string
  render?: (value: unknown, row: T) => ReactNode
}

interface ContextMenuAction<T> {
  label: string
  icon?: ReactNode
  danger?: boolean
  onClick: (row: T) => void
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  keyExtractor: (row: T) => string | number
  searchable?: boolean
  searchPlaceholder?: string
  pageSize?: number
  pageSizeOptions?: number[]
  sortable?: boolean
  filterable?: boolean
  exportable?: boolean
  columnVisibility?: boolean
  stickyHeader?: boolean
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  contextMenu?: ContextMenuAction<T>[]
  bulkActions?: boolean
  bulkActionLabel?: string
  onBulkAction?: (selected: T[]) => void
  onRowClick?: (row: T) => void
  getRowClass?: (row: T) => string
  getCellClass?: (row: T, column: ColumnDef<T>) => string
  className?: string
  renderTop?: ReactNode
}

function DataTable<T>({
  columns: rawColumns, data, keyExtractor,
  searchable = true, searchPlaceholder: _,
  pageSize = 10, pageSizeOptions = [10, 25, 50, 100],
  sortable: globalSortable = true,
  filterable = true,
  exportable = true,
  columnVisibility: showColumnVisibility = true,
  stickyHeader = true,
  loading = false,
  emptyTitle: emptyTitleProp,
  emptyDescription,
  contextMenu,
  bulkActions = false,
  bulkActionLabel: bulkActionLabelProp,
  onBulkAction,
  onRowClick,
  getRowClass,
  getCellClass,
  className = '',
  renderTop,
}: DataTableProps<T>) {
  const { t } = useTranslation()
  const emptyTitle = emptyTitleProp ?? t('dataTable.noData')
  const bulkActionLabel = bulkActionLabelProp ?? t('dataTable.deleteSelected')
  const [globalSearch, setGlobalSearch] = useState('')
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null)
  const [page, setPage] = useState(0)
  const [pageSz, setPageSz] = useState(pageSize)
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<Set<string | number>>(new Set())
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [contextMenuRow, setContextMenuRow] = useState<T | null>(null)
  const [showColMenu, setShowColMenu] = useState(false)
  const colMenuRef = useRef<HTMLDivElement>(null)
  const ctxMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const vis: Record<string, boolean> = {}
    rawColumns.forEach(c => { vis[c.id] = c.visible ?? true })
    setVisibleColumns(prev => Object.keys(prev).length ? prev : vis)
  }, [rawColumns])

  const filtered = useMemo(() => {
    let items = data
    const q = globalSearch.toLowerCase().trim()
    if (q) {
      items = items.filter(row => {
        return rawColumns.some(col => {
          const val = typeof col.accessor === 'function' ? '' : String(row[col.accessor] ?? '')
          return val.toLowerCase().includes(q)
        })
      })
    }
    Object.entries(columnFilters).forEach(([colId, filterVal]) => {
      if (!filterVal || filterVal === 'all') return
      const col = rawColumns.find(c => c.id === colId)
      if (!col) return
      items = items.filter(row => {
        const val = typeof col.accessor === 'function' ? '' : String(row[col.accessor] ?? '')
        return val.toLowerCase() === filterVal.toLowerCase()
      })
    })
    return items
  }, [data, globalSearch, columnFilters, rawColumns])

  const sorted = useMemo(() => {
    if (!sortColumn || !sortDirection) return filtered
    const col = rawColumns.find(c => c.id === sortColumn)
    if (!col || typeof col.accessor === 'function') return filtered
    return [...filtered].sort((a, b) => {
      const aVal = String(a[col.accessor as keyof T] ?? '')
      const bVal = String(b[col.accessor as keyof T] ?? '')
      const cmp = aVal.localeCompare(bVal)
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortColumn, sortDirection, rawColumns])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSz))
  const paged = useMemo(() => {
    const start = page * pageSz
    return sorted.slice(start, start + pageSz)
  }, [sorted, page, pageSz])

  useEffect(() => { setPage(0) }, [globalSearch, columnFilters, sortColumn, sortDirection, pageSz])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) setShowColMenu(false)
      if (ctxMenuRef.current && !ctxMenuRef.current.contains(e.target as Node)) setContextMenuPos(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleSort = useCallback((colId: string) => {
    if (sortColumn !== colId) {
      setSortColumn(colId)
      setSortDirection('asc')
    } else {
      setSortDirection(prev => prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc')
    }
  }, [sortColumn])

  const getFilterValues = useCallback((colId: string) => {
    const col = rawColumns.find(c => c.id === colId)
    if (!col || typeof col.accessor === 'function') return []
    const vals = new Set(data.map(r => String(r[col.accessor as keyof T] ?? '')))
    return Array.from(vals).filter(Boolean).sort()
  }, [data, rawColumns])

  const selectAll = useCallback(() => {
    if (selected.size === paged.length) setSelected(new Set())
    else setSelected(new Set(paged.map(r => keyExtractor(r))))
  }, [paged, selected, keyExtractor])

  const toggleSelect = useCallback((id: string | number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }, [])

  const exportCSV = useCallback(() => {
    const visCols = rawColumns.filter(c => visibleColumns[c.id])
    const header = visCols.map(c => `"${c.header.replace(/"/g, '""')}"`).join(',')
    const rows = sorted.map(row =>
      visCols.map(col => {
        const val = typeof col.accessor === 'function' ? '' : String(row[col.accessor as keyof T] ?? '')
        return `"${val.replace(/"/g, '""')}"`
      }).join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'export.csv'; a.click()
    URL.revokeObjectURL(url)
  }, [sorted, rawColumns, visibleColumns])

  const handleContextMenu = useCallback((e: React.MouseEvent, row: T) => {
    if (!contextMenu || contextMenu.length === 0) return
    e.preventDefault()
    setContextMenuPos({ x: e.clientX, y: e.clientY })
    setContextMenuRow(row)
  }, [contextMenu])

  const clearFilters = useCallback(() => {
    setGlobalSearch('')
    setColumnFilters({})
    setSortColumn(null)
    setSortDirection(null)
  }, [])

  const hasActiveFilters = globalSearch || Object.values(columnFilters).some(v => v && v !== 'all') || sortColumn

  const colFilterOptions = useMemo(() => {
    return rawColumns.filter(c => c.filterable !== false && typeof c.accessor !== 'function')
  }, [rawColumns])

  if (loading) {
    return (
      <div className={`dt-container ${className}`}>
        <div className="dt-loading">
          <div className="dt-loading-spinner" />
          <span>{t('dataTable.loadingData')}</span>
        </div>
      </div>
    )
  }

  const visibleCols = rawColumns.filter(c => visibleColumns[c.id] !== false)

  return (
    <div className={`dt-container ${className}`}>
      {/* Toolbar */}
      <div className="dt-toolbar">
        <div className="dt-toolbar-left">
          {searchable && (
            <div className="dt-search-wrap">
              <Search size={15} className="dt-search-icon" />
                <input
                  className="dt-search-input"
                  placeholder={t('dataTable.searchPlaceholder')}
                  value={globalSearch}
                  onChange={e => setGlobalSearch(e.target.value)}
                  aria-label={t('dataTable.searchPlaceholder')}
                />
                {globalSearch && (
                  <button className="dt-clear-btn" onClick={() => setGlobalSearch('')} aria-label={t('dataTable.clearSearch')}>
                    <X size={14} />
                  </button>
                )}
            </div>
          )}

          {filterable && colFilterOptions.length > 0 && (
            <div className="dt-filters">
              {colFilterOptions.map(col => {
                const vals = getFilterValues(col.id)
                if (vals.length <= 1) return null
                return (
                  <select
                    key={col.id}
                    className="dt-filter-select"
                    value={columnFilters[col.id] || 'all'}
                    onChange={e => {
                      setColumnFilters(prev => ({ ...prev, [col.id]: e.target.value }))
                    }}
                    aria-label={t('dataTable.filterBy', { name: col.header })}
                  >
                    <option value="all">{col.header}</option>
                    {vals.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                )
              })}
            </div>
          )}

          {hasActiveFilters && (
            <button className="dt-clear-all" onClick={clearFilters} aria-label={t('dataTable.clearAllFilters')}>
              <X size={13} /> {t('dataTable.clear')}
            </button>
          )}
        </div>

        <div className="dt-toolbar-right">
          <span className="dt-count">{t('dataTable.rowsCount', { count: sorted.length })}</span>

          {exportable && (
            <button className="dt-tool-btn" onClick={exportCSV} aria-label={t('dataTable.exportCSV')} title={t('dataTable.exportCSV')}>
              <Download size={15} />
            </button>
          )}

          {showColumnVisibility && (
            <div className="dt-col-vis" ref={colMenuRef}>
              <button className="dt-tool-btn" onClick={() => setShowColMenu(p => !p)} aria-label={t('dataTable.columns')} title={t('dataTable.columns')}>
                <Columns3 size={15} />
              </button>
              <AnimatePresence>
                {showColMenu && (
                  <motion.div
                    className="dt-col-menu"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                  >
                    {rawColumns.map(col => (
                      <label key={col.id} className="dt-col-option">
                        <input
                          type="checkbox"
                          checked={visibleColumns[col.id] !== false}
                          onChange={() => setVisibleColumns(prev => ({ ...prev, [col.id]: prev[col.id] === false }))}
                        />
                        <Check size={12} className="dt-col-check" />
                        {col.header}
                      </label>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {renderTop}

      <div className="dt-scroll-hint" aria-hidden="true">{t('dataTable.scrollHint') || 'Scroll horizontally for more columns'}</div>

      {/* Bulk actions bar */}
      {bulkActions && selected.size > 0 && (
        <motion.div
          className="dt-bulk-bar"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
        >
          <span className="dt-bulk-count">{t('dataTable.selectedCount', { count: selected.size })}</span>
          {onBulkAction && (
            <button className="dt-bulk-action" onClick={() => { onBulkAction(paged.filter(r => selected.has(keyExtractor(r)))); setSelected(new Set()) }}>
              <Trash2 size={14} /> {bulkActionLabel}
            </button>
          )}
        </motion.div>
      )}

      {/* Table */}
      {paged.length === 0 ? (
        <div className="dt-empty">
          <div className="dt-empty-icon">
            <Search size={32} />
          </div>
          <div className="dt-empty-title">{emptyTitle}</div>
          {emptyDescription && <div className="dt-empty-desc">{emptyDescription}</div>}
          {hasActiveFilters && (
            <button className="dt-clear-all" onClick={clearFilters}>{t('dataTable.clearFilters')}</button>
          )}
        </div>
      ) : (
        <div className="dt-table-wrap">
          <div className="dt-table" role="grid" aria-label={t('dataTable.label')}>
            {/* Header */}
            <div className={`dt-thead ${stickyHeader ? 'dt-sticky' : ''}`} role="rowgroup">
              <div className="dt-tr dt-tr-header" role="row">
                {bulkActions && (
                  <div
                    className="dt-th dt-th-shrink"
                    role="columnheader"
                    onClick={selectAll}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); selectAll() } }}
                    tabIndex={0}
                  >
                    {selected.size === paged.length ? <CheckSquare size={16} /> : <Square size={16} />}
                  </div>
                )}
                {visibleCols.map(col => (
                  <div
                    key={col.id}
                    className={`dt-th ${col.sortable !== false && globalSortable ? 'dt-th-sortable' : ''}`}
                    style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                    role="columnheader"
                    onClick={() => { if (col.sortable !== false && globalSortable) toggleSort(col.id) }}
                    onKeyDown={e => { if (e.key === 'Enter') { if (col.sortable !== false && globalSortable) toggleSort(col.id) } }}
                    tabIndex={col.sortable !== false && globalSortable ? 0 : undefined}
                    aria-sort={sortColumn === col.id ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    <span className="dt-th-text">{col.header}</span>
                    {col.sortable !== false && globalSortable && (
                      <span className="dt-sort-icon">
                        {sortColumn === col.id ? (
                          sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        ) : <ChevronsUpDown size={13} />}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="dt-tbody" role="rowgroup">
              {paged.map((row, i) => {
                const rowId = keyExtractor(row)
                const isSelected = selected.has(rowId)
                return (
                  <motion.div
                    key={rowId}
                    className={`dt-tr ${isSelected ? 'dt-tr-selected' : ''} ${onRowClick ? 'dt-tr-clickable' : ''} ${contextMenu ? 'dt-tr-ctx' : ''} ${getRowClass ? getRowClass(row) : ''}`}
                    role="row"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: i * 0.02 }}
                    onClick={() => { onRowClick?.(row) }}
                    onContextMenu={e => handleContextMenu(e, row)}
                    tabIndex={onRowClick || contextMenu ? 0 : undefined}
                    onKeyDown={e => { if (e.key === 'Enter' && onRowClick) onRowClick(row) }}
                  >
                    {bulkActions && (
                      <div className="dt-td dt-td-shrink" role="gridcell" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Enter') e.stopPropagation() }} tabIndex={0}>
                        <button
                          className="dt-check-btn"
                          onClick={() => toggleSelect(rowId)}
                          aria-label={isSelected ? t('dataTable.deselectRow') : t('dataTable.selectRow')}
                          aria-checked={isSelected}
                          role="checkbox"
                        >
                          {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                      </div>
                    )}
                    {visibleCols.map(col => {
                      const value = typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor as keyof T]
                      const rendered = col.render ? col.render(value, row) : (value as ReactNode)
                      return (
                        <div
                          key={col.id}
                          className={`dt-td ${getCellClass ? getCellClass(row, col) : ''}`}
                          role="gridcell"
                          style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                        >
                          {rendered ?? '\u2014'}
                        </div>
                      )
                    })}
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="dt-pagination">
          <div className="dt-page-size">
            <span>{t('dataTable.rowsPerPage')}</span>
            <select
              value={pageSz}
              onChange={e => { setPageSz(Number(e.target.value)); setPage(0) }}
              aria-label="Rows per page"
            >
              {pageSizeOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="dt-page-info">
            {t('dataTable.pageInfo', { start: page * pageSz + 1, end: Math.min((page + 1) * pageSz, sorted.length), total: sorted.length })}
          </div>

          <div className="dt-page-nav" role="navigation" aria-label="Pagination">
            <button
              className="dt-page-btn"
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              aria-label={t('dataTable.previousPage')}
            >
              <ChevronDown size={14} style={{ rotate: '90deg' }} />
            </button>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const start = Math.max(0, Math.min(page - 2, totalPages - 5))
              const pageNum = start + i
              if (pageNum >= totalPages) return null
              return (
                <button
                  key={pageNum}
                  className={`dt-page-btn ${pageNum === page ? 'dt-page-active' : ''}`}
                  onClick={() => setPage(pageNum)}
                  aria-label={`Page ${pageNum + 1}`}
                  aria-current={pageNum === page ? 'page' : undefined}
                >
                  {pageNum + 1}
                </button>
              )
            })}

            <button
              className="dt-page-btn"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              aria-label={t('dataTable.nextPage')}
            >
              <ChevronDown size={14} style={{ rotate: '-90deg' }} />
            </button>
          </div>
        </div>
      )}

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenuPos && contextMenuRow && contextMenu && (
          <motion.div
            ref={ctxMenuRef}
            className="dt-ctx-menu"
            style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.1 }}
          >
            {contextMenu.map((action, i) => (
              <button
                key={i}
                className={`dt-ctx-item ${action.danger ? 'dt-ctx-danger' : ''}`}
                onClick={() => {
                  action.onClick(contextMenuRow)
                  setContextMenuPos(null)
                  setContextMenuRow(null)
                }}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default memo(DataTable) as typeof DataTable
