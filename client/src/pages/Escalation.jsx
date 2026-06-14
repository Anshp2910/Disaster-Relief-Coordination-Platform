import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'

export default function Escalation() {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestId, setRequestId] = useState('')
  const [reason, setReason] = useState('')

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

  useEffect(() => { load() }, [])

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
    if (!confirm('De-escalate this request?')) return
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
          Escalate urgent requests that need immediate admin attention
        </div>

        {error && <div className="errorText" style={{ marginBottom: 12 }}>{error}</div>}

        <form onSubmit={handleEscalate} style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
          <input
            placeholder="Request ID"
            value={requestId}
            onChange={(e) => setRequestId(e.target.value)}
            required
            style={{ fontSize: 13 }}
          />
          <textarea
            placeholder="Reason for escalation"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            style={{ fontSize: 13 }}
          />
          <button type="submit" className="btnPrimary" style={{ fontSize: 13, padding: '8px 16px', justifySelf: 'start' }}>
            Escalate Request
          </button>
        </form>
      </div>

      {loading ? (
        <div className="small muted" style={{ marginTop: 16 }}>Loading...</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 24 }}>No escalated requests</div>
      ) : (
        <div className="gridGap" style={{ marginTop: 12 }}>
          {items.map((item) => (
            <div key={item._id} className="listCard" style={{ borderLeft: '4px solid #cc0000' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#000080' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: '#cc0000', marginTop: 2 }}>
                    Escalated: {new Date(item.escalatedAt).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>{item.escalationReason}</div>
                  <div className="small muted" style={{ marginTop: 4 }}>By: {item.createdBy?.displayName || 'Unknown'}</div>
                </div>
                <button
                  onClick={() => handleDeescalate(item._id)}
                  style={{
                    fontSize: 11, padding: '4px 10px', background: 'rgba(19,136,8,.1)',
                    color: '#138808', border: '1px solid rgba(19,136,8,.3)',
                    borderRadius: 4, cursor: 'pointer', alignSelf: 'start',
                  }}
                >
                  De-escalate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
