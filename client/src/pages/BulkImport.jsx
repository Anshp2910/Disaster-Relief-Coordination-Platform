import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'

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
        return row
      }).filter((row) => {
        return Object.values(row).some((v) => v.trim() !== '')
      })

      setHeaders(cleanHeaders)
      setPreview(dataRows)
      setSelected(new Set(dataRows.map((_, i) => i)))
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
      setSelected(new Set(preview.map((_, i) => i)))
    }
  }

  function toggleRow(i) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  function updateCell(rowIdx, col, val) {
    setPreview((prev) => {
      const next = [...prev]
      next[rowIdx] = { ...next[rowIdx], [col]: val }
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
    const url = tab === 'requests' ? clientApi.exportRequestsCSV() : clientApi.exportResourcesCSV()
    window.open(url, '_blank')
  }

  return (
    <div className="container">
      <div className="card">
        <h2 className="pageTitle" style={{ fontSize: 20, margin: '0 0 12px' }}>{t('bulkImport.title')}</h2>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <button onClick={() => switchTab('requests')} className={`filter-pill ${tab === 'requests' ? 'active' : ''}`}>{t('bulkImport.requestsTab')}</button>
          <button onClick={() => switchTab('resources')} className={`filter-pill ${tab === 'resources' ? 'active' : ''}`}>{t('bulkImport.resourcesTab')}</button>
        </div>

        {error && <div className="errorText" style={{ marginBottom: 12 }}>{error}</div>}

        {!preview && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={downloadTemplate} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--gov-border)', background: 'var(--gov-white)', cursor: 'pointer', fontSize: 13 }}>
                {t('bulkImport.downloadTemplate')}
              </button>
              <button onClick={exportData} className="btnPrimary" style={{ fontSize: 13, padding: '8px 16px' }}>{t('bulkImport.exportCSV')}</button>
            </div>

            <div style={{ border: '2px dashed var(--gov-border)', borderRadius: 8, padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--gov-blue)', marginBottom: 8 }}>{t('bulkImport.importFromCSV', { tab })}</div>
              <div className="small muted" style={{ marginBottom: 12 }}>{t('bulkImport.uploadHint')}</div>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} style={{ display: 'none' }} id="csv-upload" />
              <label htmlFor="csv-upload" className="btnPrimary" style={{ display: 'inline-block', cursor: 'pointer', fontSize: 13, padding: '8px 20px' }}>
                {importing ? t('bulkImport.loading') : t('bulkImport.chooseFile')}
              </label>
            </div>
          </>
        )}

        {preview && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{t('bulkImport.rowsParsed', { count: preview.length })}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={cancelPreview} style={{ fontSize: 12, padding: '6px 14px' }}>{t('bulkImport.cancel')}</button>
                <button
                  onClick={handleSubmitImport}
                  disabled={importing || selected.size === 0}
                  className="btnPrimary"
                  style={{ fontSize: 12, padding: '6px 14px' }}
                >
                  {importing ? t('bulkImport.importing') : t('bulkImport.importRows', { count: selected.size })}
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto', border: '1px solid var(--gov-border)', borderRadius: 6 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--gov-bg)' }}>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--gov-border)', textAlign: 'center', width: 40 }}>
                      <input type="checkbox" checked={selected.size === preview.length} onChange={toggleSelectAll} title="Select all" />
                    </th>
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--gov-border)', textAlign: 'center', width: 40 }}>#</th>
                    {headers.map((h) => (
                      <th key={h} style={{ padding: '8px 10px', borderBottom: '1px solid var(--gov-border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                    <th style={{ padding: '8px 10px', borderBottom: '1px solid var(--gov-border)', width: 60 }}>{t('bulkImport.edit')}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr
                      key={i}
                      style={{
                        background: editingRow === i ? 'rgba(0,0,128,0.04)' : selected.has(i) ? 'rgba(19,136,8,0.03)' : 'var(--gov-bg)',
                        opacity: selected.has(i) ? 1 : 0.5,
                      }}
                    >
                      <td style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '1px solid var(--gov-border)' }}>
                        <input type="checkbox" checked={selected.has(i)} onChange={() => toggleRow(i)} />
                      </td>
                      <td style={{ padding: '6px 10px', textAlign: 'center', borderBottom: '1px solid var(--gov-border)', color: 'var(--gov-muted)' }}>{i + 1}</td>
                      {headers.map((h) => (
                        <td key={h} style={{ padding: '4px 10px', borderBottom: '1px solid var(--gov-border)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {editingRow === i ? (
                            <input
                              value={row[h]}
                              onChange={(e) => updateCell(i, h, e.target.value)}
                              style={{ width: '100%', padding: '3px 6px', border: '1px solid var(--gov-border)', borderRadius: 3, fontSize: 12, boxSizing: 'border-box' }}
                            />
                          ) : (
                            row[h] || <span style={{ color: 'var(--gov-muted)' }}>-</span>
                          )}
                        </td>
                      ))}
                      <td style={{ padding: '4px 10px', borderBottom: '1px solid var(--gov-border)', textAlign: 'center' }}>
                        <button
                          onClick={() => setEditingRow(editingRow === i ? null : i)}
                          style={{ background: 'none', border: 'none', color: 'var(--gov-blue)', cursor: 'pointer', fontSize: 12, padding: 4 }}
                        >
                          {editingRow === i ? t('bulkImport.done') : t('bulkImport.edit')}
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
          <div style={{ marginTop: 16, padding: 12, borderRadius: 6, background: 'rgba(19,136,8,.06)', border: '1px solid rgba(19,136,8,.2)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--neon-green)' }}>{t('bulkImport.importComplete')} {t('bulkImport.recordsImported', { count: result.imported })}</div>
            {result.errors?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: 'var(--gov-danger)', fontWeight: 600 }}>{t('bulkImport.rowsHadErrors', { count: result.errors.length })}</div>
                {result.errors.slice(0, 10).map((e, i) => (
                  <div key={i} style={{ fontSize: 12, color: 'var(--gov-muted)', marginTop: 2 }}>Row {e.row}: {e.errors.join(', ')}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
