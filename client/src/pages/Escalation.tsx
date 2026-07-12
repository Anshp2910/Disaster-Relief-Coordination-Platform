import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react'
import { PageHeader, ErrorState, FilterBar } from '../components/ui'
import DataList from '../components/ui/DataList'
import { clientApi } from '../api/client'
import { useAutoRefresh } from '../hooks/useAutoRefresh'
import { registerRefreshListener } from '../hooks/useSocket'
import { useDebounce } from '../hooks/useDebounce'
import { useConfirm } from '../hooks/useConfirm'
import { useToast } from '../components/Toast'
import PageTransition from '../components/ui/PageTransition'

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
  useEffect(() => { document.title = 'Disaster Relief - Escalations' }, [])
  const { t } = useTranslation()
  const toast = useToast()
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
  const [escalating, setEscalating] = useState(false)

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
    setEscalating(true)
  try {
    await clientApi.escalateRequest(requestId, reason)
    setRequestId('')
    setReason('')
    toast.success(t('escalation.escalated') || 'Escalation submitted')
    load()
  } catch (e) {
    const err = e as Error
    setError(err.message)
  } finally {
    setEscalating(false)
  }
}

async function handleDeescalate(id: string) {
  const ok = await confirm({ message: t('escalation.deEscalateConfirm'), danger: true })
  if (!ok) return
  try {
    await clientApi.deescalateRequest(id)
    toast.success(t('escalation.deEscalated') || 'De-escalation completed')
    load()
  } catch (e) {
    const err = e as Error
    setError(err.message)
  }
}

  return (
    <PageTransition>
      <div className="container">
      <div className="card">
        <PageHeader
          title={t('nav.escalation') || 'Request Escalation Pipeline'}
          subtitle={t('escalation.subtitle')}
        />

        {error && <ErrorState message={error} onRetry={load} />}

        <form onSubmit={handleEscalate} className="mb-lg">
          <div className="ff-group">
            <div className="text-sm text-semi mb-xs flex items-center gap-xs">
              <Search size={14} />
              {t('escalation.searchRequest') || 'Search for a request...'}
            </div>
            <div ref={reqSearchRef} className="relative">
              <div className={`ff-wrap ${reqSearch ? 'ff-focused' : ''}`}>
                <input
                  id="esc-search"
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
                  required
                  className={`ff-input ${reqSearch ? 'ff-input-filled' : ''}`}
                  placeholder=" "
                  aria-label={t('escalation.searchRequest') || 'Search for a request'}
                />
                <label htmlFor="esc-search" className={`ff-label ${reqSearch ? 'ff-label-float' : ''}`}>
                  {t('escalation.searchRequest') || 'Search for a request...'}
                </label>
              </div>
              {showReqDropdown && (
                <div className="ms-dropdown mt-xs">
                  {filteredRequests.length === 0 ? (
                    <div className="ms-no-options">{t('common.noResults') || 'No matching requests'}</div>
                  ) : (
                    <div className="overflow-y-auto p-xs">
                      {filteredRequests.map((r, idx) => (
                        <div
                          key={r._id}
                          role="option"
                          aria-selected={idx === reqActiveIndex}
                          onClick={() => selectRequest(r)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); selectRequest(r) } }}
                          tabIndex={0}
                          onMouseEnter={() => setReqActiveIndex(idx)}
                          className={`ms-option ${idx === reqActiveIndex ? 'ms-option-active' : ''}`}
                        >
                          <span className="text-semi">{r.title}</span>
                          <span className="text-muted"> ({r.status || 'Open'})</span>
                          {r.locationName && <span className="text-muted"> — {r.locationName}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="ff-group">
            <div className={`ff-wrap ${reason ? 'ff-focused' : ''}`}>
              <textarea
                id="esc-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                required
                maxLength={2000}
                className="ff-input ff-textarea"
                placeholder={t('escalation.reasonForEscalation')}
                aria-label={t('escalation.reasonForEscalation')}
              />
              <label htmlFor="esc-reason" className={`ff-label ${reason ? 'ff-label-float' : ''}`}>
                {t('escalation.reasonForEscalation')}
              </label>
            </div>
          </div>
          <button type="submit" className="btn-primary btn-sm" aria-label={t('escalation.escalateRequest')} disabled={escalating}>
            {escalating ? <span className="spinner-sm" aria-hidden="true" /> : <ArrowUp size={16} />}
            {escalating ? 'Escalating...' : t('escalation.escalateRequest')}
          </button>
        </form>

        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('escalation.searchPlaceholder') || 'Search by title, reason, or user...'}
          filters={[]}
        />
      </div>

      <DataList
        items={filteredItems}
        loading={loading}
        emptyTitle={search ? t('escalation.noMatch') : t('escalation.noEscalated')}
        renderItem={(item) => (
          <div className="list-card border-l-4 border-l-danger">
            <div className="flex-between">
              <div className="flex-1">
                <div className="text-bold text-base text-accent">{item.title}</div>
                <div className="text-sm text-danger mt-xs">
                  <AlertTriangle size={14} className="inline-block mr-xs" aria-hidden="true" />
                  {t('escalation.escalated')} {new Date(item.escalatedAt).toLocaleString()}
                </div>
                <div className="mt-xs text-sm">{item.escalationReason}</div>
                <div className="text-xs text-muted mt-xs">{t('escalation.by')} {item.createdBy?.displayName || t('common.unknown')}</div>
              </div>
              <button
                onClick={() => handleDeescalate(item._id)}
                className="btn-danger btn-sm flex items-center gap-xs"
                aria-label={`${t('escalation.deEscalate')} ${item.title}`}
              >
                <ArrowDown size={14} />
                {t('escalation.deEscalate')}
              </button>
            </div>
          </div>
        )}
        keyExtractor={(item) => item._id}
        skeletonCount={3}
        skeletonLines={2}
      />

      {ConfirmDialog}
    </div>
    </PageTransition>
  )
}