import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { SkeletonList } from '../components/Skeleton'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { registerRefreshListener } from '../hooks/useSocket'
import { useDebounce } from '../hooks/useDebounce'
import { useConfirm } from '../hooks/useConfirm'

interface EscalatedItem {
  _id: string
  title: string
  escalationReason: string
  escalatedAt: string
  createdBy?: {
    displayName?: string
  }
}

interface RequestOption {
  _id: string
  title: string
  status: string
  locationName?: string
}

export default function Escalation() {
  const { t } = useTranslation()
  const [items, setItems] = useState<EscalatedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestId, setRequestId] = useState('')
  const [reason, setReason] = useState('')
  const [allRequests, setAllRequests] = useState<RequestOption[]>([])
  const [search, setSearch] = useState('')
  const { confirm, ConfirmDialog } = useConfirm()
  const debouncedSearch = useDebounce(search, 300)
  const [reqSearch, setReqSearch] = useState('')
  const [showReqDropdown, setShowReqDropdown] = useState(false)
  const [reqActiveIndex, setReqActiveIndex] = useState(-1)
  const reqSearchRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = (await clientApi.getEscalated()) as { items: EscalatedItem[] }
      setItems(data.items || [])
    } catch (e) {
      const err = e as Error
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    ;(clientApi.getRequests({ limit: '1000' }) as Promise<{ items: RequestOption[] }>).then((data) => {
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

  const filteredRequests = useMemo(() => {
    if (!reqSearch.trim()) return allRequests
    const q = reqSearch.toLowerCase()
    return allRequests.filter((r) =>
      (r.title || '').toLowerCase().includes(q) ||
      (r.locationName || '').toLowerCase().includes(q)
    )
  }, [allRequests, reqSearch])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (reqSearchRef.current && !reqSearchRef.current.contains(e.target as Node)) {
        setShowReqDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectRequest(r: RequestOption) {
    setRequestId(r._id)
    setReqSearch(`${r.title} (${r.status || 'Open'}) — ${r.locationName || r._id}`)
    setShowReqDropdown(false)
  }

  async function handleEscalate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await clientApi.escalateRequest(requestId, reason)
      setRequestId('')
      setReason('')
      load()
    } catch (e) {
      const err = e as Error
      setError(err.message)
    }
  }

  async function handleDeescalate(id: string) {
    const ok = await confirm({ message: t('escalation.deEscalateConfirm'), danger: true })
    if (!ok) return
    try {
      await clientApi.deescalateRequest(id)
      load()
    } catch (e) {
      const err = e as Error
      setError(err.message)
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2 className="pageTitle m-0 mb text-20">
          {t('nav.escalation') || 'Request Escalation Pipeline'}
        </h2>
        <div className="small muted mb">
          {t('escalation.subtitle')}
        </div>

        {error && <div className="errorText mb">{error}</div>}

        <form onSubmit={handleEscalate} className="mb-lg grid gap-8">
          <div ref={reqSearchRef} className="relative">
            <input
              type="text"
              value={reqSearch}
              onChange={(e) => {
                setReqSearch(e.target.value)
                setShowReqDropdown(true)
                if (requestId) setRequestId('')
                setReqActiveIndex(-1)
              }}
              onFocus={() => setShowReqDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault()
                  setReqActiveIndex((prev) => Math.min(prev + 1, filteredRequests.length - 1))
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault()
                  setReqActiveIndex((prev) => Math.max(prev - 1, 0))
                } else if (e.key === 'Enter' && reqActiveIndex >= 0 && filteredRequests[reqActiveIndex]) {
                  e.preventDefault()
                  selectRequest(filteredRequests[reqActiveIndex])
                } else if (e.key === 'Escape') {
                  setShowReqDropdown(false)
                }
              }}
              placeholder={t('escalation.searchRequest') || 'Search for a request...'}
              required
              className="rounded-sm text-13 border-gov p-sm w-full"
            />
            {showReqDropdown && (
              <div className="absolute z-1000 bg-white border-gov rounded-sm mt-1 w-full shadow-lg" style={{ maxHeight: 280, overflowY: 'auto' }}>
                {filteredRequests.length === 0 ? (
                  <div className="p-sm text-muted text-13">{t('common.noResults') || 'No matching requests'}</div>
                ) : (
                  filteredRequests.map((r, idx) => (
                    <div
                      key={r._id}
                      role="option"
                      aria-selected={idx === reqActiveIndex}
                      onClick={() => selectRequest(r)}
                      onMouseEnter={() => setReqActiveIndex(idx)}
                      className="p-sm cursor-pointer text-13 border-bottom"
                      style={{
                        background: idx === reqActiveIndex ? 'var(--accent-soft)' : 'transparent',
                      }}
                    >
                      <span className="text-semi">{r.title}</span>
                      <span className="text-muted"> ({r.status || 'Open'})</span>
                      {r.locationName && <span className="text-muted"> — {r.locationName}</span>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <textarea
            placeholder={t('escalation.reasonForEscalation')}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            required
            maxLength={2000}
            className="text-13"
          />
          <button type="submit" className="btnPrimary text-13 p-sm justify-self-start">
            {t('escalation.escalateRequest')}
          </button>
        </form>

        <div className="flex flex-gap-sm mt">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('escalation.searchPlaceholder') || 'Search by title, reason, or user...'}
            className="flex-1 rounded-sm p-sm border-gov text-13"
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
            <div key={item._id} className="listCard border-l-4" style={{ borderLeftColor: 'var(--gov-danger)' }}>
              <div className="flex-between">
                <div className="flex-1">
                  <div className="text-bold text-base text-accent-blue">{item.title}</div>
                  <div className="text-sm text-red mt-xs">
                    {t('escalation.escalated')} {new Date(item.escalatedAt).toLocaleString()}
                  </div>
                  <div className="mt-xs text-13">{item.escalationReason}</div>
                  <div className="small muted mt-xs">{t('escalation.by')} {item.createdBy?.displayName || 'Unknown'}</div>
                </div>
                <button
                  onClick={() => handleDeescalate(item._id)}
                  className="deescalate-btn"
                >
                   {t('escalation.deEscalate')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {ConfirmDialog}
    </div>
  )
}
