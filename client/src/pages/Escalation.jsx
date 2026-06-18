import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { registerRefreshListener } from '../hooks/useSocket'

export default function Escalation() {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestId, setRequestId] = useState('')
  const [reason, setReason] = useState('')
  const [allRequests, setAllRequests] = useState([])

  async function load() {
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
  }

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
            style={{ fontSize: 13 }}
          />
          <button type="submit" className="btnPrimary" style={{ fontSize: 13, padding: '8px 16px', justifySelf: 'start' }}>
            {t('escalation.escalateRequest')}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="small muted" style={{ marginTop: 16 }}>{t('escalation.loading')}</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>{t('escalation.noEscalated')}</div>
      ) : (
        <div className="gridGap" style={{ marginTop: 12 }}>
          {items.map((item) => (
            <div key={item._id} className="listCard" style={{ borderLeft: '4px solid #cc0000' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#000080' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: '#cc0000', marginTop: 2 }}>
                    {t('escalation.escalated')} {new Date(item.escalatedAt).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>{item.escalationReason}</div>
                  <div className="small muted" style={{ marginTop: 4 }}>{t('escalation.by')} {item.createdBy?.displayName || 'Unknown'}</div>
                </div>
                <button
                  onClick={() => handleDeescalate(item._id)}
                  style={{
                    fontSize: 11, padding: '4px 10px', background: 'rgba(19,136,8,.1)',
                    color: '#138808', border: '1px solid rgba(19,136,8,.3)',
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
