import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { registerRefreshListener } from '../hooks/useSocket'
import { useDebounce } from '../hooks/useDebounce'

export default function Escalation() {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestId, setRequestId] = useState('')
  const [reason, setReason] = useState('')
  const [allRequests, setAllRequests] = useState([])
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await clientApi.getEscalated()
      setItems(data.items || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    clientApi.getRequests({ limit: 1000 }).then((data) => {
      setAllRequests(data.items || [])
    }).catch(() => {})
  }, [])

  useAutoRefresh(load, { interval: 20000 })

  useEffect(() => {
    return registerRefreshListener(['request:escalated', 'request:updated'], load)
  }, [load])

  const filteredItems = useMemo(() => {
    if (!debouncedSearch) return items
    const q = debouncedSearch.toLowerCase()
    return items.filter((item) =>
      (item.title || '').toLowerCase().includes(q) ||
      (item.escalationReason || '').toLowerCase().includes(q) ||
      (item.createdBy?.displayName || '').toLowerCase().includes(q)
    )
  }, [items, debouncedSearch])

  async function handleEscalate(e) {
    e.preventDefault()
    setError('')
    try {
      await clientApi.escalateRequest(requestId, reason)
      setRequestId('')
      setReason('')
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDeescalate(id) {
    if (!confirm(t('escalation.deEscalateConfirm'))) return
    try {
      await clientApi.deescalateRequest(id)
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2 className="pageTitle" style={{ fontSize: 20, margin: '0 0 12px' }}>
          {t('nav.escalation') || 'Request Escalation Pipeline'}
        </h2>
        <div className="small muted" style={{ marginBottom: 12 }}>
          {t('escalation.subtitle')}
        </div>

        {error && <div className="errorText" style={{ marginBottom: 12 }}>{error}</div>}

        <form onSubmit={handleEscalate} style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
          <select
            value={requestId}
            onChange={(e) => setRequestId(e.target.value)}
            required
            style={{ fontSize: 13, padding: '8px 12px', border: '1px solid var(--gov-border)', borderRadius: 6 }}
          >
            <option value="">{t('escalation.selectRequest') || 'Select a request...'}</option>
            {allRequests.map((r) => (
              <option key={r._id} value={r._id}>
                {r.title} ({r.status || 'Open'}) — {r.locationName || r._id}
              </option>
            ))}
          </select>
          <textarea
            placeholder={t('escalation.reasonForEscalation')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            required
            maxLength={2000}
            style={{ fontSize: 13 }}
          />
          <button type="submit" className="btnPrimary" style={{ fontSize: 13, padding: '8px 16px', justifySelf: 'start' }}>
            {t('escalation.escalateRequest')}
          </button>
        </form>

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('escalation.searchPlaceholder') || 'Search by title, reason, or user...'}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--gov-border)', borderRadius: 6, fontSize: 13 }}
          />
        </div>
      </div>

      {loading ? (
        <div className="small muted" style={{ marginTop: 16 }}>{t('escalation.loading')}</div>
      ) : filteredItems.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>{search ? t('escalation.noMatch') : t('escalation.noEscalated')}</div>
      ) : (
        <div className="gridGap" style={{ marginTop: 12 }}>
          {filteredItems.map((item) => (
            <div key={item._id} className="listCard" style={{ borderLeft: '4px solid var(--gov-danger)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent-blue)' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--gov-danger)', marginTop: 2 }}>
                    {t('escalation.escalated')} {new Date(item.escalatedAt).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>{item.escalationReason}</div>
                  <div className="small muted" style={{ marginTop: 4 }}>{t('escalation.by')} {item.createdBy?.displayName || 'Unknown'}</div>
                </div>
                <button
                  onClick={() => handleDeescalate(item._id)}
                  style={{
                    fontSize: 11, padding: '4px 10px', background: 'rgba(63,185,80,.1)',
                    color: 'var(--accent-green)', border: '1px solid rgba(63,185,80,.3)',
                    borderRadius: 4, cursor: 'pointer', alignSelf: 'start',
                  }}
                >
                   {t('escalation.deEscalate')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
