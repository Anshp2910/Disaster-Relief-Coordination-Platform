import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'

function parseCSV(text) {
  const result = []
  let row = []
  let cell = ''
  let inQuotes = false
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++
      row.push(cell)
      if (row.some(f => f.trim())) result.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }
  row.push(cell)
  if (row.some(f => f.trim())) result.push(row)
  return result
}

export default function BulkImport() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('requests')
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setError('')
    setResult(null)

    try {
      const text = await file.text()
      const rows = parseCSVToRows(text)
      if (rows.length < 2) throw new Error('CSV must have a header row and at least one data row')

      const headers = rows[0].map((h) => h.trim().toLowerCase())
      const dataRows = rows.slice(1).map((values) => {
        const row = {}
        headers.forEach((h, i) => { row[h] = values[i]?.trim() || '' })
        return row
      })

      const data = tab === 'requests' ? await clientApi.importRequests(dataRows) : await clientApi.importResources(dataRows)
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function downloadTemplate() {
    const headers = tab === 'requests' ? 'title,description,category,priority,status,locationName,lat,lng' : 'name,category,quantity,unit,status,locationName,lat,lng'
    const example = tab === 'requests' ? 'Flood relief needed,Water and food needed,Food,High,Open,Chennai,13.0827,80.2707' : 'Rice bags,Food,100,kg,Available,Chennai,13.0827,80.2707'
    const csv = `${headers}\n${example}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${tab}_template.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function exportData() {
    const url = tab === 'requests' ? clientApi.exportRequestsCSV() : clientApi.exportResourcesCSV()
    window.open(url, '_blank')
  }

  return (
    <div className="container">
      <div className="card">
        <h2 className="pageTitle" style={{ fontSize: 20, margin: '0 0 12px' }}>{t('nav.bulkImport') || 'Bulk Import & CSV Export'}</h2>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <button onClick={() => setTab('requests')} className={`filter-pill ${tab === 'requests' ? 'active' : ''}`}>Requests</button>
          <button onClick={() => setTab('resources')} className={`filter-pill ${tab === 'resources' ? 'active' : ''}`}>Resources</button>
        </div>

        {error && <div className="errorText" style={{ marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={downloadTemplate} style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid var(--gov-border)', background: 'white', cursor: 'pointer', fontSize: 13 }}>Download Template</button>
          <button onClick={exportData} className="btnPrimary" style={{ fontSize: 13, padding: '8px 16px' }}>Export CSV</button>
        </div>

        <div style={{ border: '2px dashed var(--gov-border)', borderRadius: 8, padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--gov-blue)', marginBottom: 8 }}>Import {tab} from CSV</div>
          <div className="small muted" style={{ marginBottom: 12 }}>Upload a CSV file with the correct headers</div>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} style={{ display: 'none' }} id="csv-upload" />
          <label htmlFor="csv-upload" className="btnPrimary" style={{ display: 'inline-block', cursor: 'pointer', fontSize: 13, padding: '8px 20px' }}>
            {importing ? 'Importing...' : 'Choose CSV File'}
          </label>
        </div>

        {result && (
          <div style={{ marginTop: 16, padding: 12, borderRadius: 6, background: 'rgba(19,136,8,.06)', border: '1px solid rgba(19,136,8,.2)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#138808' }}>Import complete: {result.imported} records imported</div>
            {result.errors?.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: '#cc0000', fontWeight: 600 }}>{result.errors.length} rows had errors:</div>
                {result.errors.slice(0, 5).map((e, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Row {e.row}: {e.errors.join(', ')}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
