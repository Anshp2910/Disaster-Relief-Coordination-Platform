import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Search, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react'
import { PageHeader, ErrorState, DataList, FilterBar, PageTransition } from '../components/ui'
import { clientApi } from '../api/client'
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
    <PageTransition>
      <div className="container">
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <PageHeader
          title={t('nav.escalation') || 'Request Escalation Pipeline'}
          subtitle={t('escalation.subtitle')}
        />

        {error && <ErrorState message={error} />}

        <form onSubmit={handleEscalate} className="mb-lg">
          <div className="ff-group">
            <div className="ff-label-text mb-xs flex items-center gap-xs">
              <Search size={14} />
              {t('escalation.searchRequest') || 'Search for a request...'}
            </div>
            <div ref={reqSearchRef} className="relative">
              <div className="ff-wrap">
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
                  required
                  className="ff-input"
                  placeholder={t('escalation.searchRequest') || 'Search for a request...'}
                  aria-label={t('escalation.searchRequest') || 'Search for a request'}
                />
              </div>
              {showReqDropdown && (
                <div className="ms-dropdown mt-xs" style={{ left: 0, right: 0, top: '100%', maxHeight: 280 }}>
                  {filteredRequests.length === 0 ? (
                    <div className="ms-no-options">{t('common.noResults') || 'No matching requests'}</div>
                  ) : (
                    <div className="overflow-y-auto p-xs" style={{ maxHeight: 240 }}>
                      {filteredRequests.map((r, idx) => (
                        <div
                          key={r._id}
                          role="option"
                          aria-selected={idx === reqActiveIndex}
                          onClick={() => selectRequest(r)}
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
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                required
                maxLength={2000}
                className="ff-input ff-textarea"
                placeholder={t('escalation.reasonForEscalation')}
                aria-label={t('escalation.reasonForEscalation')}
              />
              <label className={`ff-label ff-label-with-icon ${reason ? 'ff-label-float' : ''}`}>
                {t('escalation.reasonForEscalation')}
              </label>
            </div>
          </div>
          <button type="submit" className="sf-btn sf-btn-next" aria-label="Escalate request">
            <ArrowUp size={16} />
            {t('escalation.escalateRequest')}
          </button>
        </form>

        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t('escalation.searchPlaceholder') || 'Search by title, reason, or user...'}
          filters={[]}
        />
      </motion.div>

      <DataList
        items={filteredItems}
        loading={loading}
        emptyTitle={search ? t('escalation.noMatch') : t('escalation.noEscalated')}
        renderItem={(item) => (
          <div className="listCard border-l-4" style={{ borderLeftColor: 'var(--gov-danger)' }}>
            <div className="flex-between">
              <div className="flex-1">
                <div className="text-bold text-base text-accent-blue">{item.title}</div>
                <div className="text-sm text-red mt-xs">
                  <AlertTriangle size={14} className="inline-block mr-xs" aria-hidden="true" />
                  {t('escalation.escalated')} {new Date(item.escalatedAt).toLocaleString()}
                </div>
                <div className="mt-xs text-13">{item.escalationReason}</div>
                <div className="small muted mt-xs">{t('escalation.by')} {item.createdBy?.displayName || 'Unknown'}</div>
              </div>
              <button
                onClick={() => handleDeescalate(item._id)}
                className="deescalate-btn flex items-center gap-xs"
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