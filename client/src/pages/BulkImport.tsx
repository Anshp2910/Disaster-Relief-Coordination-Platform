import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  Upload, FileText, CheckCircle, AlertTriangle, Download,
  ChevronLeft, ChevronRight, ArrowRight, Table, LayoutGrid, FileSpreadsheet
} from 'lucide-react'
import { PageHeader, ErrorState, RippleBtn, PageTransition } from '../components/ui'
import { clientApi } from '../api/client'
import { useToast } from '../components/Toast'
import { downloadBlob } from '../utils/export'
import { getErrorMessage } from '../utils/getErrorMessage'

interface ColumnMap {
  csvCol: string
  systemCol: string
}

type ImportStep = 'upload' | 'mapping' | 'preview'

const STEP_META: Record<ImportStep, { icon: typeof Upload; label: string }> = {
  upload: { icon: Upload, label: 'Upload CSV' },
  mapping: { icon: LayoutGrid, label: 'Map Columns' },
  preview: { icon: Table, label: 'Review & Import' },
}

const REQUEST_FIELDS = ['title', 'description', 'category', 'priority', 'status', 'locationName', 'lat', 'lng', 'peopleCount']
const RESOURCE_FIELDS = ['name', 'category', 'quantity', 'unit', 'status', 'locationName', 'lat', 'lng']

const FIELD_ALIASES: Record<string, string[]> = {
  title: ['title', 'request', 'request title', 'subject'],
  description: ['description', 'desc', 'details', 'detail', 'additional info', 'notes', 'information', 'info'],
  category: ['category', 'type', 'kind', 'classification', 'class'],
  priority: ['priority', 'priority level', 'level', 'urgency', 'severity'],
  status: ['status', 'state', 'condition', 'current status'],
  locationName: ['location', 'locationname', 'location name', 'place', 'area', 'address', 'region', 'city', 'district', 'loc', 'site'],
  lat: ['lat', 'latitude', 'latitud', 'y coordinate', 'y'],
  lng: ['lng', 'lon', 'longitude', 'longitud', 'long', 'x coordinate', 'x'],
  peopleCount: ['peoplecount', 'people count', 'people', 'persons', 'affected people', 'affected', 'no of people', 'number of people'],
  name: ['name', 'item', 'resource', 'resource name', 'item name'],
  quantity: ['quantity', 'qty', 'amount', 'count', 'number'],
  unit: ['unit', 'units', 'uom', 'measurement', 'measure', 'metric'],
}

/** Check if text looks like binary content (ZIP, Office file, etc.) rather than CSV. */
function isBinaryContent(text: string): boolean {
  // ZIP archives used by .xlsx, .docx, .pptx start with PK\x03\x04
  if (text.length >= 4 && text.charCodeAt(0) === 0x50 && text.charCodeAt(1) === 0x4b &&
      text.charCodeAt(2) === 0x03 && text.charCodeAt(3) === 0x04) {
    return true
  }
  // Check for null bytes — CSV files should never have them
  for (let i = 0; i < Math.min(text.length, 1024); i++) {
    if (text.charCodeAt(i) === 0) return true
  }
  // Count printable ASCII / UTF-8 vs control characters in the first 512 bytes
  let controlChars = 0
  const len = Math.min(text.length, 512)
  for (let i = 0; i < len; i++) {
    const code = text.charCodeAt(i)
    // Null, bell, backspace, escape, and other binary control characters
    // Allow whitespace (tab=9, newline=10, carriage return=13, space=32)
    if (code < 8 || (code > 13 && code < 32 && code !== 27)) {
      controlChars++
    }
  }
  // If more than 10% of the first 512 bytes are binary control chars, it's likely binary
  return controlChars > len * 0.1
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/[\r\n]+/)[0] || ''
  const tabs = (firstLine.match(/\t/g) || []).length
  const semicolons = (firstLine.match(/;/g) || []).length
  const pipes = (firstLine.match(/\|/g) || []).length
  if (tabs >= semicolons && tabs >= pipes && tabs > 0) return '\t'
  if (semicolons >= tabs && semicolons >= pipes && semicolons > 0) return ';'
  if (pipes >= tabs && pipes >= semicolons && pipes > 0) return '|'
  return ','
}

function parseCSV(text: string, delimiter?: string): string[][] {
  const delim = delimiter || detectDelimiter(text)
  const result: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delim && !inQuotes) {
      row.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++
      row.push(cell)
      if (row.some((f) => f.trim())) result.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  row.push(cell)
  if (row.some((f) => f.trim())) result.push(row)
  return result
}

function autoDetectField(csvCol: string, systemFields: string[]): string {
  const cleaned = csvCol.toLowerCase().replace(/^["'\s]+|["'\s]+$/g, '').trim()
  const stripped = cleaned.replace(/[^a-z0-9]/g, '')
  for (const field of systemFields) {
    const aliases = FIELD_ALIASES[field] || []
    if (aliases.includes(cleaned) || aliases.some((a) => a.replace(/[^a-z0-9]/g, '') === stripped)) {
      return field
    }
  }
  for (const field of systemFields) {
    if (field.toLowerCase() === cleaned || field.toLowerCase().replace(/[^a-z0-9]/g, '') === stripped) {
      return field
    }
  }
  return ''
}

const REQUEST_HEADERS = 'title,description,category,priority,status,location,lat,lng'
const RESOURCE_HEADERS = 'name,category,quantity,unit,status,location,lat,lng'
const REQUEST_EXAMPLE = 'Flood relief needed,Water and food needed,Food,High,Open,Chennai 13.08 80.27,13.0827,80.2707'
const RESOURCE_EXAMPLE = 'Rice bags,Food,100,kg,Available,Chennai Depot,13.0827,80.2707'

export default function BulkImport() {
  useEffect(() => { document.title = 'Disaster Relief - Bulk Import' }, [])
  const { t } = useTranslation()
  const toast = useToast()
  const [tab, setTab] = useState('requests')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<Record<string, unknown>[] | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string | number>>(new Set())
  const [editingRow, setEditingRow] = useState<string | number | null>(null)
  const [step, setStep] = useState<ImportStep>('upload')
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [rawData, setRawData] = useState<string[][]>([])
  const [columnMaps, setColumnMaps] = useState<ColumnMap[]>([])
  const fileRef = useRef<HTMLInputElement | null>(null)
  const dropRef = useRef<HTMLDivElement | null>(null)
  const [previewPage, setPreviewPage] = useState(1)
  const [dragOver, setDragOver] = useState(false)
  const PREVIEW_PAGE_SIZE = 25

  const systemFields = tab === 'requests' ? REQUEST_FIELDS : RESOURCE_FIELDS

  function cancelPreview() {
    setStep('upload')
    setPreview(null)
    setRawHeaders([])
    setRawData([])
    setColumnMaps([])
    setSelected(new Set())
    setEditingRow(null)
    setError('')
    setResult(null)
    setDragOver(false)
  }

  function switchTab(newTab: string) {
    setTab(newTab)
    cancelPreview()
  }

  /** Parse raw CSV text and advance to the mapping step. Shared by file input and drag-and-drop. */
  async function processCSVText(text: string): Promise<void> {
    // Reject binary files (Office .xlsx/.docx, PDF, images, etc.) before parsing
    if (isBinaryContent(text)) {
      throw new Error('Invalid file format. Please upload a valid CSV file (not an Office document, PDF, or image).')
    }
    // Strip all BOM characters (\uFEFF) from the entire text, not just position 0.
    // Excel on Windows often prepends a BOM to UTF-8 CSV files.
    const cleaned = text.replace(/\uFEFF/g, '')
    const rows = parseCSV(cleaned)

    if (rows.length < 2) throw new Error(t('bulkImport.csvMustHaveRows'))

    const h = rows[0]!.map((c) => c.trim())
    // Sanitise each cell: remove any lingering BOM characters
    const sanitisedRows = rows.slice(1).filter((row) => row.some((v) => v.trim() !== ''))
      .map((row) => row.map((v) => v.replace(/\uFEFF/g, '')))

    if (sanitisedRows.length === 0) throw new Error(t('bulkImport.csvNoDataRows'))

    const isRequestCSV = h.some((c) => /^title$/i.test(c.trim()))
    const isResourceCSV = h.some((c) => /^name$/i.test(c.trim()))

    if (tab === 'requests' && isResourceCSV && !isRequestCSV) {
      throw new Error(t('bulkImport.wrongCSVType', { type: 'Resources' }))
    }
    if (tab === 'resources' && isRequestCSV && !isResourceCSV) {
      throw new Error(t('bulkImport.wrongCSVType', { type: 'Requests' }))
    }

    const initialMaps: ColumnMap[] = h.map((col) => ({
      csvCol: col,
      systemCol: autoDetectField(col, systemFields),
    }))

    setRawHeaders(h)
    setRawData(sanitisedRows)
    setColumnMaps(initialMaps)
    setStep('mapping')
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setError('')

    try {
      await processCSVText(await file.text())
    } catch (e) {
      const err = e as Error
      setError(err.message)
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function updateColumnMap(csvCol: string, systemCol: string) {
    setColumnMaps((prev) => prev.map((m) => (m.csvCol === csvCol ? { ...m, systemCol } : m)))
  }

  function confirmMapping() {
    const activeMaps = columnMaps.filter((m) => m.systemCol !== '')

    const cleanHeaders = activeMaps.map((m) => m.systemCol)
    const cleanColIndices = activeMaps.map((m) => rawHeaders.indexOf(m.csvCol))

    const mappedData = rawData.map((vals) => {
      const row: Record<string, unknown> = {}
      cleanHeaders.forEach((col, i) => {
        row[col] = vals[cleanColIndices[i]!]?.trim() || ''
      })
      row._rowId = Date.now() + Math.random()
      return row
    })

    setHeaders(cleanHeaders)
    setPreview(mappedData)
    setSelected(new Set(mappedData.map((r) => r._rowId as string | number)))
    setEditingRow(null)
    setPreviewPage(1)
    setStep('preview')
  }

  function toggleSelectAll() {
    if (!preview) return
    if (selected.size === preview.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(preview.map((r) => r._rowId as string | number)))
    }
  }

  function toggleRow(rowId: string | number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })
  }

  function updateCell(rowId: string | number, col: string, val: string) {
    setPreview((prev) => {
      if (!prev) return prev
      const next = [...prev]
      const idx = next.findIndex((r) => r._rowId === rowId)
      if (idx >= 0) next[idx] = { ...next[idx], [col]: val }
      return next
    })
  }

  async function handleSubmitImport() {
    if (!preview) return
    const rowsToImport = preview.filter((r) => selected.has((r as Record<string, unknown>)._rowId as string | number))
    if (rowsToImport.length === 0) {
      setError(t('bulkImport.noRowsSelected'))
      return
    }

    setImporting(true)
    setError('')
    try {
      const data = tab === 'requests'
        ? await clientApi.importRequests(rowsToImport)
        : await clientApi.importResources(rowsToImport)
      const importResult = data as Record<string, unknown>
      setResult(importResult)
      if (Number(importResult.imported) > 0) {
        setPreview(null)
        setSelected(new Set())
      }
    } catch (e) {
      const err = e as Error
      setError(err.message)
    } finally {
      setImporting(false)
    }
  }

  function downloadTemplate() {
    const headers = tab === 'requests' ? REQUEST_HEADERS : RESOURCE_HEADERS
    const example = tab === 'requests' ? REQUEST_EXAMPLE : RESOURCE_EXAMPLE
    downloadBlob(`${headers}\n${example}`, `${tab}_template.csv`)
  }

  async function exportData() {
    try {
      await (tab === 'requests' ? clientApi.exportRequestsCSV() : clientApi.exportResourcesCSV())
      toast.success(t('bulkImport.exportSuccess') || 'CSV exported successfully')
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const unmatchedCount = columnMaps.filter((m) => m.systemCol === '').length

  const stepOrder: ImportStep[] = ['upload', 'mapping', 'preview']
  const currentStepIndex = stepOrder.indexOf(step)

  return (
    <PageTransition>
      <div className="container">
        <PageHeader title={t('bulkImport.title')} />

        {/* Step progress indicator */}
        <div className="import-steps mb-lg">
          {stepOrder.map((s, i) => {
            const StepIcon = STEP_META[s].icon
            const isActive = i === currentStepIndex
            const isComplete = i < currentStepIndex
            return (
              <div
                key={s}
                className={`import-step ${isActive ? 'import-step--active' : ''} ${isComplete ? 'import-step--complete' : ''}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <div className="import-step-indicator">
                  {isComplete ? <CheckCircle size={16} /> : <StepIcon size={16} />}
                </div>
                <span className="import-step-label">{STEP_META[s].label}</span>
              </div>
            )
          })}
        </div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        >
          {/* Data type tabs */}
          <motion.div className="import-tabs mb-lg" variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
            <button
              onClick={() => switchTab('requests')}
              className={`import-tab ${tab === 'requests' ? 'import-tab--active' : ''}`}
              aria-label={t('bulkImport.requestsTab')}
            >
              <FileSpreadsheet size={16} />
              {t('bulkImport.requestsTab')}
            </button>
            <button
              onClick={() => switchTab('resources')}
              className={`import-tab ${tab === 'resources' ? 'import-tab--active' : ''}`}
              aria-label={t('bulkImport.resourcesTab')}
            >
              <Table size={16} />
              {t('bulkImport.resourcesTab')}
            </button>
          </motion.div>

          {error && (
            <div className="mb-md">
              <ErrorState message={error} onRetry={cancelPreview} />
            </div>
          )}

          {/* ── UPLOAD STEP ── */}
          {step === 'upload' && (
            <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
              <div className="flex gap-sm mb-lg">
                <RippleBtn onClick={downloadTemplate} className="btn-ghost btn-sm" aria-label={t('bulkImport.downloadTemplate')}>
                  <Download size={16} />
                  {t('bulkImport.downloadTemplate')}
                </RippleBtn>
                <RippleBtn onClick={exportData} className="btn-ghost btn-sm" aria-label={t('bulkImport.exportCSV')}>
                  <Download size={16} />
                  {t('bulkImport.exportCSV')}
                </RippleBtn>
              </div>

              <div
                ref={dropRef}
                className={`import-dropzone ${dragOver ? 'import-dropzone--active' : ''}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    document.getElementById('csv-upload')?.click()
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                }}
                onDrop={async (e) => {
                  e.preventDefault()
                  setDragOver(false)
                  const file = e.dataTransfer.files?.[0]
                  if (file) {
                    setImporting(true)
                    setError('')
                    try {
                      await processCSVText(await file.text())
                    } catch (err) {
                      setError((err as Error).message)
                    } finally {
                      setImporting(false)
                    }
                  }
                }}
              >
                <div className="import-dropzone-icon">
                  {importing ? (
                    <div className="import-spinner" />
                  ) : (
                    <Upload size={40} />
                  )}
                </div>
                <div className="import-dropzone-title">
                  {importing
                    ? t('bulkImport.loading') || 'Loading...'
                    : t('bulkImport.importFromCSV', { tab })}
                </div>
                <div className="import-dropzone-hint">
                  {t('bulkImport.dragDropHint') || 'Drag & drop a CSV file here'}
                </div>                        <div className="import-dropzone-divider">
                          <span>or</span>
                        </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={handleImport}
                  className="hidden"
                  id="csv-upload"
                  aria-label={t('bulkImport.uploadCSV')}
                />
                <RippleBtn
                  onClick={() => document.getElementById('csv-upload')?.click()}
                  className="btn-primary btn-sm import-choose-btn"
                  disabled={importing}
                >
                  {importing ? (
                    <><div className="spinner-sm" aria-hidden="true" /> {t('bulkImport.loading')}</>
                  ) : (
                    <><Upload size={14} /> {t('bulkImport.chooseFile')}</>
                  )}
                </RippleBtn>
              </div>
            </motion.div>
          )}

          {/* ── MAPPING STEP ── */}
          {step === 'mapping' && (
            <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
              <div className="import-section-header">
                <div className="import-section-title">
                  <LayoutGrid size={18} />
                  {t('bulkImport.columnMapping')}
                </div>
                <div className="import-section-meta">
                  <FileText size={14} />
                  {t('bulkImport.dataRowsParsed', { count: rawData.length })}
                </div>
              </div>

              {unmatchedCount > 0 && (
                <div className="import-warning mb-md">
                  <AlertTriangle size={16} />
                  <div>
                    <strong>{unmatchedCount}</strong> {t('bulkImport.columnDisplay', { count: unmatchedCount })} {t('bulkImport.willBeIgnored')}
                    <ul>
                      {columnMaps.filter((m) => m.systemCol === '').map((m) => (
                        <li key={m.csvCol}>"{m.csvCol}"</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="import-table-wrap mb-md">
                <div className="import-table" role="grid" aria-label={t('bulkImport.columnMapping')}>
                  <div className="import-tr import-tr--header" role="row">
                    <div className="import-th" role="columnheader">{t('bulkImport.csvColumn')}</div>
                    <div className="import-th import-th--arrow" role="columnheader">
                      <ArrowRight size={14} />
                    </div>
                    <div className="import-th" role="columnheader">{t('bulkImport.systemField')}</div>
                  </div>
                  {columnMaps.map((m) => (
                    <div
                      key={m.csvCol}
                      className={`import-tr ${m.systemCol ? 'import-tr--mapped' : 'import-tr--unmapped'}`}
                      role="row"
                    >
                      <div className="import-td import-td--csv" role="gridcell">
                        <span className="import-csv-col">{m.csvCol}</span>
                      </div>
                      <div className="import-td import-td--arrow" role="gridcell">
                        <ArrowRight size={14} className={`import-arrow ${m.systemCol ? 'import-arrow--active' : ''}`} />
                      </div>
                      <div className="import-td" role="gridcell">
                        <select
                          value={m.systemCol}
                          onChange={(e) => updateColumnMap(m.csvCol, e.target.value)}
                          className="import-select"
                          aria-label={t('bulkImport.mapColumnToField', { column: m.csvCol })}
                        >
                          <option value="">{t('bulkImport.ignoreColumn')}</option>
                          {systemFields.map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="import-actions">
                <button onClick={cancelPreview} className="btn-pill">{t('bulkImport.cancel')}</button>
                <RippleBtn onClick={confirmMapping} className="btn-primary btn-sm flex items-center gap-xs">
                  {t('bulkImport.confirmMapping')} <ArrowRight size={14} />
                </RippleBtn>
              </div>
            </motion.div>
          )}

          {/* ── PREVIEW STEP ── */}
          {step === 'preview' && preview && (
            <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
              <div className="import-section-header">
                <div className="import-section-title">
                  <Table size={18} />
                  {t('bulkImport.dataPreview')}
                  <span className="import-row-count">{preview.length} rows</span>
                </div>
                <div className="flex gap-sm">
                  <button onClick={cancelPreview} className="btn-pill">{t('bulkImport.cancel')}</button>
                  <RippleBtn
                    onClick={handleSubmitImport}
                    disabled={importing || selected.size === 0}
                    className="btn-primary btn-sm"
                  >
                    {importing ? (
                      <><div className="spinner-sm" aria-hidden="true" /> {t('bulkImport.importing')}</>
                    ) : (
                      <><Upload size={14} /> {t('bulkImport.importRows', { count: selected.size })}</>
                    )}
                  </RippleBtn>
                </div>
              </div>

              {selected.size < preview.length && (
                <div className="import-warning import-warning--info mb-md">
                  <AlertTriangle size={16} />
                  <span>{selected.size} of {preview.length} rows selected for import</span>
                </div>
              )}

              <div className="import-preview-wrap">
                <div className="import-table import-table--preview" role="grid" aria-label={t('bulkImport.dataPreview')}>
                  <div className="import-tr import-tr--header" role="row">
                    <div className="import-th import-th--checkbox" role="columnheader">
                      <label className="import-checkbox">
                        <input
                          type="checkbox"
                          checked={selected.size === preview.length}
                          onChange={toggleSelectAll}
                          aria-label={t('bulkImport.selectAll')}
                        />
                        <span className="import-checkbox-visual" />
                      </label>
                    </div>
                    <div className="import-th import-th--num" role="columnheader">#</div>
                    {headers.map((h) => (
                      <div key={h} className="import-th" role="columnheader">{h}</div>
                    ))}
                    <div className="import-th import-th--action" role="columnheader">{t('bulkImport.edit')}</div>
                  </div>
                  {(() => {
                    const rowOffset = (previewPage - 1) * PREVIEW_PAGE_SIZE
                    const paginatedPreview = preview.slice(rowOffset, rowOffset + PREVIEW_PAGE_SIZE)
                    return paginatedPreview.map((row, idx) => {
                      const rowId = row._rowId as string | number
                      const isEditing = editingRow === rowId
                      const isSelected = selected.has(rowId)
                      return (
                        <div
                          key={rowId}
                          className={`import-tr ${isEditing ? 'import-tr--editing' : ''} ${isSelected ? 'import-tr--selected' : ''}`}
                          role="row"
                        >
                          <div className="import-td import-td--checkbox" role="gridcell">
                            <label className="import-checkbox">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleRow(rowId)}
                                aria-label={t('bulkImport.selectRow', { num: rowOffset + idx + 1 })}
                              />
                              <span className="import-checkbox-visual" />
                            </label>
                          </div>
                          <div className="import-td import-td--num" role="gridcell">{rowOffset + idx + 1}</div>
                          {headers.map((h) => (
                            <div key={h} className="import-td import-td--data" role="gridcell">
                              {isEditing ? (
                                <input
                                  value={row[h] as string || ''}
                                  onChange={(e) => updateCell(rowId, h, e.target.value)}
                                  className="import-edit-input"
                                  aria-label={t('bulkImport.editField', { field: h })}
                                />
                              ) : (
                                <span className="import-cell-value" title={row[h] as string}>
                                  {(row[h] as string) || <span className="import-cell-empty">&mdash;</span>}
                                </span>
                              )}
                            </div>
                          ))}
                          <div className="import-td import-td--action" role="gridcell">
                            <button
                              onClick={() => setEditingRow(isEditing ? null : rowId)}
                              className="import-edit-btn"
                              aria-label={isEditing ? t('bulkImport.doneEditing') : t('bulkImport.editRow', { num: rowOffset + idx + 1 })}
                            >
                              {isEditing ? <CheckCircle size={14} /> : <FileText size={14} />}
                            </button>
                          </div>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

              {(() => {
                const totalPages = Math.ceil(preview.length / PREVIEW_PAGE_SIZE)
                if (totalPages <= 1) return null
                return (
                  <div className="import-pagination">
                    <button
                      disabled={previewPage <= 1}
                      onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                      className="import-page-btn"
                      aria-label={t('dashboard.previous')}
                    >
                      <ChevronLeft size={14} /> {t('dashboard.previous')}
                    </button>
                    <span className="import-page-info">{previewPage} / {totalPages}</span>
                    <button
                      disabled={previewPage >= totalPages}
                      onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                      className="import-page-btn"
                      aria-label={t('dashboard.next')}
                    >
                      {t('dashboard.next')} <ChevronRight size={14} />
                    </button>
                  </div>
                )
              })()}
            </motion.div>
          )}

          {/* ── RESULT ── */}
          {result && (
            <motion.div
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
              className="import-result mt-lg"
            >
              <div className="import-result-icon import-result-icon--success">
                <CheckCircle size={24} />
              </div>
              <div className="import-result-body">
                <div className="import-result-title">
                  {t('bulkImport.importComplete')}
                </div>
                <div className="import-result-stats">
                  <div className="import-stat import-stat--success">
                    <CheckCircle size={14} />
                    <span>{t('bulkImport.recordsImported', { count: Number(result.imported) || 0 })}</span>
                  </div>
                  {(result.errors as Array<Record<string, unknown>>)?.length > 0 && (
                    <div className="import-stat import-stat--error">
                      <AlertTriangle size={14} />
                      <span>{t('bulkImport.rowsHadErrors', { count: (result.errors as Array<Record<string, unknown>>).length })}</span>
                    </div>
                  )}
                </div>
                {(result.errors as Array<Record<string, unknown>>)?.length > 0 && (
                  <div className="import-result-errors">
                    {(result.errors as Array<Record<string, unknown>>).slice(0, 10).map((e: Record<string, unknown>, i: number) => (
                      <div key={i} className="import-error-item">
                        <span className="import-error-row">{t('bulkImport.rowNum', { row: e.row })}</span>
                        <span>{(e.errors as string[]).join(', ')}</span>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={cancelPreview} className="btn-primary btn-sm mt-sm">
                  <Upload size={14} /> Start New Import
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </PageTransition>
  )
}
