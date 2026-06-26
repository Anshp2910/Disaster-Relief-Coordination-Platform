import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Upload, FileText, CheckCircle, AlertTriangle, Download, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react'
import { PageHeader, ErrorState, RippleBtn, PageTransition } from '../components/ui'
import { clientApi } from '../api/client'
import { useToast } from '../components/Toast'
import { downloadBlob } from '../utils/export'

interface ColumnMap {
  csvCol: string
  systemCol: string
}

type ImportStep = 'upload' | 'mapping' | 'preview'

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
  const [previewPage, setPreviewPage] = useState(1)
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
  }

  function switchTab(newTab: string) {
    setTab(newTab)
    cancelPreview()
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setError('')

    try {
      let text = await file.text()
      text = text.replace(/^\uFEFF/, '')
      const rows = parseCSV(text)

      if (rows.length < 2) throw new Error(t('bulkImport.csvMustHaveRows'))

      const h = rows[0].map((c) => c.trim())
      const dataRows = rows.slice(1).filter((row) => row.some((v) => v.trim() !== ''))

      if (dataRows.length === 0) throw new Error(t('bulkImport.csvNoDataRows'))

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
      setRawData(dataRows)
      setColumnMaps(initialMaps)
      setStep('mapping')
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
        row[col] = vals[cleanColIndices[i]]?.trim() || ''
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
      toast.error((err as Error).message)
    }
  }

  const unmatchedCount = columnMaps.filter((m) => m.systemCol === '').length

  return (
    <PageTransition>
      <div className="container">
      <div className="card">
        <PageHeader title={t('bulkImport.title')} />

        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        >
          <motion.div className="flex mb-lg gap-6" variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}>
            <button onClick={() => switchTab('requests')} className={`filter-pill ${tab === 'requests' ? 'active' : ''}`} aria-label={t('bulkImport.requestsTab')}>{t('bulkImport.requestsTab')}</button>
            <button onClick={() => switchTab('resources')} className={`filter-pill ${tab === 'resources' ? 'active' : ''}`} aria-label={t('bulkImport.resourcesTab')}>{t('bulkImport.resourcesTab')}</button>
          </motion.div>

          {error && <ErrorState message={error} />}

          {step === 'upload' && (
            <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
              <div className="flex flex-gap-sm mb-lg">
                <button onClick={downloadTemplate} className="rounded-sm cursor-pointer p-sm border-gov bg-gov-white text-13 flex items-center gap-xs" aria-label={t('bulkImport.downloadTemplate')}>
                  <Download size={16} />
                  {t('bulkImport.downloadTemplate')}
                </button>
                <RippleBtn onClick={exportData} className="text-13 p-sm flex items-center gap-xs" aria-label={t('bulkImport.exportCSV')}>
                  <Download size={16} />
                  {t('bulkImport.exportCSV')}
                </RippleBtn>
              </div>

              <div className="p-2xl text-center border-dashed-2 rounded">
                <div className="mb-sm text-accent-blue">
                  <Upload size={32} className="inline-block" aria-hidden="true" />
                </div>
                <div className="text-base mb-sm text-accent-blue">{t('bulkImport.importFromCSV', { tab })}</div>
                <div className="small muted mb">{t('bulkImport.uploadHint')}</div>
                <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden" id="csv-upload" aria-label="Upload CSV file" />
                <RippleBtn onClick={() => document.getElementById('csv-upload')?.click()} className="cursor-pointer inline-block text-13 p-sm">
                  {importing ? t('bulkImport.loading') : t('bulkImport.chooseFile')}
                </RippleBtn>
              </div>
            </motion.div>
          )}

          {step === 'mapping' && (
            <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
              <div className="flex-between mb">
                <div className="text-base text-semi flex items-center gap-xs">
                  <FileText size={16} aria-hidden="true" />
                  {t('bulkImport.columnMapping')}
                </div>
                <div className="text-sm text-muted">{t('bulkImport.dataRowsParsed', { count: rawData.length })}</div>
              </div>

              {unmatchedCount > 0 && (
                <div className="mb p-sm rounded-sm bg-warning-soft">
                  <span className="text-13 text-semi flex items-center gap-xs text-warning">
                    <AlertTriangle size={14} />
                    {unmatchedCount} column{unmatchedCount > 1 ? 's' : ''} will be ignored. Assign a system field or they will be skipped.
                  </span>
                  <ul className="mt-xs mb-0 text-sm text-warning">
                    {columnMaps.filter((m) => m.systemCol === '').map((m) => (
                      <li key={m.csvCol}>"{m.csvCol}"</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="overflow-x-auto rounded-sm border-gov mb">
                <div className="w-full text-sm dt-inline-table" role="grid" aria-label={t('bulkImport.columnMapping')}>
                  <div className="dt-inline-row dt-inline-header" role="row">
                    <div className="dt-inline-cell text-left" role="columnheader">{t('bulkImport.csvColumn')}</div>
                    <div className="dt-inline-cell text-center" role="columnheader"><ArrowRight size={14} aria-hidden="true" /></div>
                    <div className="dt-inline-cell text-left" role="columnheader">{t('bulkImport.systemField')}</div>
                  </div>
                  {columnMaps.map((m) => (
                    <div key={m.csvCol} className="dt-inline-row" role="row">
                      <div className="dt-inline-cell text-nowrap" role="gridcell">{m.csvCol}</div>
                      <div className="dt-inline-cell text-center" role="gridcell"><ArrowRight size={14} className="text-muted" aria-hidden="true" /></div>
                      <div className="dt-inline-cell" role="gridcell">
                        <select
                          value={m.systemCol}
                          onChange={(e) => updateColumnMap(m.csvCol, e.target.value)}
                          className="rounded-sm border-gov text-sm w-100 p-xs"
                          aria-label={`Map column "${m.csvCol}" to system field`}
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

              <div className="flex flex-gap-sm">
                <button onClick={cancelPreview} className="text-sm btn-pill">{t('bulkImport.cancel')}</button>
                <RippleBtn onClick={confirmMapping} className="text-sm p-sm flex items-center gap-xs">
                  {t('bulkImport.confirmMapping')} <ArrowRight size={14} />
                </RippleBtn>
              </div>
            </motion.div>
          )}

          {step === 'preview' && preview && (
            <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
              <div className="flex-between mb">
                <div className="text-base text-semi">{t('bulkImport.rowsParsed', { count: preview.length })}</div>
                <div className="flex flex-gap-sm">
                  <button onClick={cancelPreview} className="text-sm btn-pill">{t('bulkImport.cancel')}</button>
                  <RippleBtn
                    onClick={handleSubmitImport}
                    disabled={importing || selected.size === 0}
                    className="text-sm p-xs flex items-center gap-xs"
                  >
                    {importing ? t('bulkImport.importing') : t('bulkImport.importRows', { count: selected.size })}
                  </RippleBtn>
                </div>
              </div>

              <div className="overflow-x-auto rounded-sm border-gov">
                <div className="w-full text-sm dt-inline-table" role="grid" aria-label="Data preview">
                  <div className="dt-inline-row dt-inline-header" role="row">
                    <div className="dt-inline-cell text-center dt-inline-shrink" role="columnheader">
                      <label htmlFor="bulk-selectall" className="sr-only">Select all</label>
                      <input id="bulk-selectall" type="checkbox" checked={selected.size === preview.length} onChange={toggleSelectAll} title="Select all" aria-label="Select all rows" />
                    </div>
                    <div className="dt-inline-cell text-center dt-inline-shrink" role="columnheader">#</div>
                    {headers.map((h) => (
                      <div key={h} className="dt-inline-cell text-nowrap" role="columnheader">{h}</div>
                    ))}
                    <div className="dt-inline-cell dt-inline-shrink" role="columnheader">{t('bulkImport.edit')}</div>
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
                      className={`dt-inline-row ${isEditing ? 'dt-inline-editing' : ''} ${isSelected ? 'dt-inline-selected' : ''}`}
                      role="row"
                    >
                      <div className="dt-inline-cell text-center dt-inline-shrink" role="gridcell">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleRow(rowId)} aria-label={`Select row ${rowOffset + idx + 1}`} />
                      </div>
                      <div className="dt-inline-cell text-center dt-inline-shrink text-muted" role="gridcell">{rowOffset + idx + 1}</div>
                      {headers.map((h) => (
                        <div key={h} className="dt-inline-cell text-ellipsis" role="gridcell" style={{ maxWidth: 200 }}>
                          {isEditing ? (
                            <input
                              value={row[h] as string || ''}
                              onChange={(e) => updateCell(rowId, h, e.target.value)}
                              className="w-full text-sm border-gov rounded-sm p-xs"
                              aria-label={`Edit ${h}`}
                            />
                          ) : (
                            (row[h] as string) || <span className="text-muted">-</span>
                          )}
                        </div>
                      ))}
                      <div className="dt-inline-cell text-center dt-inline-shrink" role="gridcell">
                        <button
                          onClick={() => setEditingRow(isEditing ? null : rowId)}
                          className="bg-none border-none cursor-pointer text-sm p-xs text-accent-blue"
                          aria-label={isEditing ? 'Done editing' : `Edit row ${rowOffset + idx + 1}`}
                        >
                          {isEditing ? t('bulkImport.done') : t('bulkImport.edit')}
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
                  <div className="flex flex-center flex-gap-sm mt-sm">
                    <button
                      disabled={previewPage <= 1}
                      onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                      className="text-sm p-xs border-gov rounded-sm cursor-pointer flex items-center gap-xs"
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={14} /> {t('dashboard.previous') || 'Previous'}
                    </button>
                    <span className="text-sm p-xs">{previewPage} / {totalPages}</span>
                    <button
                      disabled={previewPage >= totalPages}
                      onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
                      className="text-sm p-xs border-gov rounded-sm cursor-pointer flex items-center gap-xs"
                      aria-label="Next page"
                    >
                      {t('dashboard.next') || 'Next'} <ChevronRight size={14} />
                    </button>
                  </div>
                )
              })()}
            </motion.div>
          )}

          {result && (
            <motion.div
              variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
              className="mt-lg p rounded-sm"
              style={{ background: 'var(--success-soft)', border: '1px solid rgba(34,197,94,.2)' }}
            >
              <div className="text-semi text-13 text-accent-green flex items-center gap-xs">
                <CheckCircle size={16} />
                {t('bulkImport.importComplete')} {t('bulkImport.recordsImported', { count: result.imported })}
              </div>
              {(result.errors as Array<Record<string, unknown>>)?.length > 0 && (
                <div className="mt-sm">
                  <div className="text-sm text-semi text-red flex items-center gap-xs">
                    <AlertTriangle size={14} />
                    {t('bulkImport.rowsHadErrors', { count: (result.errors as Array<Record<string, unknown>>).length })}
                  </div>
                  {(result.errors as Array<Record<string, unknown>>).slice(0, 10).map((e: Record<string, unknown>, i: number) => (
                    <div key={i} className="text-sm text-muted mt-xs">Row {e.row as string}: {(e.errors as string[]).join(', ')}</div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
    </PageTransition>
  )
}