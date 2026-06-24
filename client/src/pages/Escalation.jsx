import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { SkeletonList } from '../components/Skeleton'
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
    }).catch(() => { setAllRequests([]) })
  }, [load])

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
        <h2 className="pageTitle m-0 mb" style={{ fontSize: 20 }}>
          {t('nav.escalation') || 'Request Escalation Pipeline'}
        </h2>
        <div className="small muted mb">
          {t('escalation.subtitle')}
        </div>

        {error && <div className="errorText mb">{error}</div>}

        <form onSubmit={handleEscalate} className="mb-lg grid gap-8">
          <select
            value={requestId}
            onChange={(e) => setRequestId(e.target.value)}
            required
            className="rounded-sm" style={{ fontSize: 13, padding: '8px 12px', border: '1px solid var(--gov-border)' }}
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
            className="text-13"
          />
          <button type="submit" className="btnPrimary" style={{ fontSize: 13, padding: '8px 16px', justifySelf: 'start' }}>
            {t('escalation.escalateRequest')}
          </button>
        </form>

        <div className="flex flex-gap-sm mt">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('escalation.searchPlaceholder') || 'Search by title, reason, or user...'}
            className="flex-1 rounded-sm" style={{ padding: '8px 12px', border: '1px solid var(--gov-border)', fontSize: 13 }}
          />
        </div>
      </div>

      {loading ? (
        <div className="mt-lg"><SkeletonList count={3} lines={2} /></div>
      ) : filteredItems.length === 0 ? (
        <div className="card text-center p-xl">{search ? t('escalation.noMatch') : t('escalation.noEscalated')}</div>
      ) : (
        <div className="gridGap mt">
          {filteredItems.map((item) => (
            <div key={item._id} className="listCard" style={{ borderLeft: '4px solid var(--gov-danger)' }}>
              <div className="flex-between">
                <div className="flex-1">
                  <div className="text-bold text-base text-accent-blue">{item.title}</div>
                  <div className="text-sm" style={{ color: 'var(--gov-danger)', marginTop: 2 }}>
                    {t('escalation.escalated')} {new Date(item.escalatedAt).toLocaleString()}
                  </div>
                  <div className="mt-xs text-13">{item.escalationReason}</div>
                  <div className="small muted mt-xs">{t('escalation.by')} {item.createdBy?.displayName || 'Unknown'}</div>
                </div>
                <button
                  onClick={() => handleDeescalate(item._id)}
                  style={{
                    fontSize: 11, padding: '4px 10px', background: 'var(--success-soft)',
                    color: 'var(--accent-green)', border: '1px solid rgba(34,197,94,.3)',
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
