import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { useToast } from '../components/Toast'

function detectDelimiter(text) {
  const firstLine = text.split(/[\r\n]+/)[0] || ''
  const tabs = (firstLine.match(/\t/g) || []).length
  const semicolons = (firstLine.match(/;/g) || []).length
  const pipes = (firstLine.match(/\|/g) || []).length
  if (tabs >= semicolons && tabs >= pipes && tabs > 0) return '\t'
  if (semicolons >= tabs && semicolons >= pipes && semicolons > 0) return ';'
  if (pipes >= tabs && pipes >= semicolons && pipes > 0) return '|'
  return ','
}

function parseCSV(text, delimiter) {
  const delim = delimiter || detectDelimiter(text)
  const result = []
  let row = []
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

function downloadBlob(content, filename, mimeType = 'text/csv') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
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
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null)
  const [headers, setHeaders] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [editingRow, setEditingRow] = useState(null)
  const fileRef = useRef(null)

  function cancelPreview() {
    setPreview(null)
    setSelected(new Set())
    setEditingRow(null)
    setError('')
  }

  function switchTab(newTab) {
    setTab(newTab)
    cancelPreview()
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setError('')
    setResult(null)

    try {
      let text = await file.text()
      text = text.replace(/^\uFEFF/, '')
      const rows = parseCSV(text)

      if (rows.length < 2) throw new Error('CSV must have a header row and at least one data row')

      const h = rows[0].map((c) => c.trim().replace(/^\uFEFF/, ''))
      const normalizedHeaders = h.map((col) => {
        const lc = col.toLowerCase()
        const aliases = {
          locationname: 'locationName',
          peoplecount: 'peopleCount',
          createdat: 'createdAt',
          updatedat: 'updatedAt',
        }
        return aliases[lc] || lc
      })
      const isRequestCSV = normalizedHeaders.includes('title')
      const isResourceCSV = normalizedHeaders.includes('name')

      if (tab === 'requests' && isResourceCSV && !isRequestCSV) {
        throw new Error('This looks like a Resources CSV. Switch to the Resources tab.')
      }
      if (tab === 'resources' && isRequestCSV && !isResourceCSV) {
        throw new Error('This looks like a Requests CSV. Switch to the Requests tab.')
      }

      const validRequestCols = ['title', 'description', 'category', 'priority', 'status', 'location', 'locationname', 'lat', 'lng', 'peoplecount']
      const validResourceCols = ['name', 'category', 'quantity', 'unit', 'status', 'location', 'locationname', 'lat', 'lng']
      const validCols = tab === 'requests' ? validRequestCols : validResourceCols

      const cleanHeaders = []
      const cleanColIndices = []
      normalizedHeaders.forEach((col, i) => {
        if (validCols.includes(col) || validCols.includes(col.toLowerCase())) {
          cleanHeaders.push(col)
          cleanColIndices.push(i)
        }
      })

      if (cleanHeaders.length === 0) {
        throw new Error(`No valid columns found. Expected headers like: ${validCols.slice(0, 5).join(', ')}...`)
      }

      const dataRows = rows.slice(1).map((vals) => {
        const row = {}
        cleanHeaders.forEach((col, i) => { row[col] = vals[cleanColIndices[i]]?.trim() || '' })
        row._rowId = Date.now() + Math.random()
        return row
      }).filter((row) => {
        return Object.values(row).some((v) => v.trim() !== '')
      })

      setHeaders(cleanHeaders)
      setPreview(dataRows)
      setSelected(new Set(dataRows.map((r) => r._rowId)))
      setEditingRow(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function toggleSelectAll() {
    if (selected.size === preview.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(preview.map((r) => r._rowId)))
    }
  }

  function toggleRow(rowId) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })
  }

  function updateCell(rowId, col, val) {
    setPreview((prev) => {
      const next = [...prev]
      const idx = next.findIndex((r) => r._rowId === rowId)
      if (idx >= 0) next[idx] = { ...next[idx], [col]: val }
      return next
    })
  }

  async function handleSubmitImport() {
    const rowsToImport = preview.filter((_, i) => selected.has(i))
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
      setResult(data)
      if (data.imported > 0) {
        setPreview(null)
        setSelected(new Set())
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setImporting(false)
    }
  }

  function downloadTemplate() {
    const headers = tab === 'requests' ? REQUEST_HEADERS : RESOURCE_HEADERS
    const example = tab === 'requests' ? REQUEST_EXAMPLE : RESOURCE_EXAMPLE
    downloadBlob(`${headers}\n${example}`, `${tab}_template.csv`)
  }

  function exportData() {
    const promise = tab === 'requests' ? clientApi.exportRequestsCSV() : clientApi.exportResourcesCSV()
    promise.catch((err) => toast.error(err.message))
  }

  return (
    <div className="container">
      <div className="card">
        <h2 className="pageTitle m-0 mb" style={{ fontSize: 20 }}>{t('bulkImport.title')}</h2>

        <div className="flex mb-lg" style={{ gap: 6 }}>
          <button onClick={() => switchTab('requests')} className={`filter-pill ${tab === 'requests' ? 'active' : ''}`}>{t('bulkImport.requestsTab')}</button>
          <button onClick={() => switchTab('resources')} className={`filter-pill ${tab === 'resources' ? 'active' : ''}`}>{t('bulkImport.resourcesTab')}</button>
        </div>

        {error && <div className="errorText mb">{error}</div>}

        {!preview && (
          <>
            <div className="flex flex-gap-sm mb-lg">
              <button onClick={downloadTemplate} className="rounded-sm cursor-pointer" style={{ padding: '8px 16px', border: '1px solid var(--gov-border)', background: 'var(--gov-white)', fontSize: 13 }}>
                {t('bulkImport.downloadTemplate')}
              </button>
              <button onClick={exportData} className="btnPrimary" style={{ fontSize: 13, padding: '8px 16px' }}>{t('bulkImport.exportCSV')}</button>
            </div>

            <div className="p-2xl text-center" style={{ border: '2px dashed var(--gov-border)', borderRadius: 8 }}>
              <div className="text-base mb-sm" style={{ color: 'var(--gov-blue)' }}>{t('bulkImport.importFromCSV', { tab })}</div>
              <div className="small muted mb">{t('bulkImport.uploadHint')}</div>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} style={{ display: 'none' }} id="csv-upload" />
              <label htmlFor="csv-upload" className="btnPrimary cursor-pointer" style={{ display: 'inline-block', fontSize: 13, padding: '8px 20px' }}>
                {importing ? t('bulkImport.loading') : t('bulkImport.chooseFile')}
              </label>
            </div>
          </>
        )}

        {preview && (
          <>
            <div className="flex-between mb">
              <div className="text-base text-semi">{t('bulkImport.rowsParsed', { count: preview.length })}</div>
              <div className="flex flex-gap-sm">
                <button onClick={cancelPreview} className="text-sm" style={{ padding: '6px 14px' }}>{t('bulkImport.cancel')}</button>
                <button
                  onClick={handleSubmitImport}
                  disabled={importing || selected.size === 0}
                  className="btnPrimary text-sm"
                  style={{ padding: '6px 14px' }}
                >
                  {importing ? t('bulkImport.importing') : t('bulkImport.importRows', { count: selected.size })}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-sm" style={{ border: '1px solid var(--gov-border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--gov-bg)' }}>
                    <th className="text-center" style={{ padding: '8px 10px', borderBottom: '1px solid var(--gov-border)', width: 40 }}>
                      <input type="checkbox" checked={selected.size === preview.length} onChange={toggleSelectAll} title="Select all" />
                    </th>
                    <th className="text-center" style={{ padding: '8px 10px', borderBottom: '1px solid var(--gov-border)', width: 40 }}>#</th>
                    {headers.map((h) => (
                      <th key={h} className="text-nowrap" style={{ padding: '8px 10px', borderBottom: '1px solid var(--gov-border)' }}>{h}</th>
                    ))}
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--gov-border)', width: 60 }}>{t('bulkImport.edit')}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, idx) => (
                    <tr
                      key={row._rowId}
                      style={{
                        background: editingRow === row._rowId ? 'rgba(0,0,128,0.04)' : selected.has(row._rowId) ? 'rgba(19,136,8,0.03)' : 'var(--gov-bg)',
                        opacity: selected.has(row._rowId) ? 1 : 0.5,
                      }}
                    >
                      <td className="text-center" style={{ padding: '6px 10px', borderBottom: '1px solid var(--gov-border)' }}>
                        <input type="checkbox" checked={selected.has(row._rowId)} onChange={() => toggleRow(row._rowId)} />
                      </td>
                      <td className="text-center text-muted" style={{ padding: '6px 10px', borderBottom: '1px solid var(--gov-border)' }}>{idx + 1}</td>
                      {headers.map((h) => (
                        <td key={h} className="text-ellipsis" style={{ padding: '4px 10px', borderBottom: '1px solid var(--gov-border)', maxWidth: 200 }}>
                          {editingRow === row._rowId ? (
                            <input
                              value={row[h]}
                              onChange={(e) => updateCell(row._rowId, h, e.target.value)}
                              className="w-full text-sm" style={{ padding: '3px 6px', border: '1px solid var(--gov-border)', borderRadius: 3 }}
                            />
                          ) : (
                            row[h] || <span className="text-muted">-</span>
                          )}
                        </td>
                      ))}
                      <td className="text-center" style={{ padding: '4px 10px', borderBottom: '1px solid var(--gov-border)' }}>
                        <button
                          onClick={() => setEditingRow(editingRow === row._rowId ? null : row._rowId)}
                          className="bg-none border-none cursor-pointer text-sm p-xs"
                          style={{ color: 'var(--gov-blue)' }}
                        >
                          {editingRow === row._rowId ? t('bulkImport.done') : t('bulkImport.edit')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {result && (
          <div className="mt-lg p rounded-sm" style={{ background: 'rgba(19,136,8,.06)', border: '1px solid rgba(19,136,8,.2)' }}>
            <div className="text-semi" style={{ fontSize: 13, color: 'var(--accent-green)' }}>{t('bulkImport.importComplete')} {t('bulkImport.recordsImported', { count: result.imported })}</div>
            {result.errors?.length > 0 && (
              <div className="mt-sm">
                <div className="text-sm text-semi" style={{ color: 'var(--gov-danger)' }}>{t('bulkImport.rowsHadErrors', { count: result.errors.length })}</div>
                {result.errors.slice(0, 10).map((e, i) => (
                  <div key={i} className="text-sm text-muted" style={{ marginTop: 2 }}>Row {e.row}: {e.errors.join(', ')}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
