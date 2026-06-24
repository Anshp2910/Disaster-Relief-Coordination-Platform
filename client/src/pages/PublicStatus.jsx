import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { SkeletonList } from '../components/Skeleton'

const STATUS_COLORS = {
  Open: '#4a80c0', Assigned: '#cc7a00', 'In Progress': '#f08b3a',
  Resolved: '#2b8a3e', Closed: '#666',
}

const STAT_CARDS = [
  { key: 'activeRequests', icon: '📋', labelKey: 'public.activeRequests' },
  { key: 'totalResources', icon: '📦', labelKey: 'public.totalResources' },
  { key: 'deployedResources', icon: '🚚', labelKey: 'public.deployedResources' },
  { key: 'availableResources', icon: '✅', labelKey: 'public.availableResources' },
  { key: 'activeIncidents', icon: '⚠️', labelKey: 'public.activeIncidents' },
  { key: 'totalZones', icon: '🗺️', labelKey: 'public.totalZones' },
  { key: 'activeSOS', icon: '🆘', labelKey: 'public.activeSOS' },
]

export default function PublicStatus() {
  const { t } = useTranslation()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await clientApi.getPublicOverview()
        if (mounted) setData(res)
      } catch (err) {
        if (mounted) setError(err.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (loading) return <SkeletonList count={8} lines={1} />
  if (error) return <div className="text-center p-lg"><div className="muted">{t('public.error')}</div><div className="small muted">{error}</div></div>

  return (
    <div className="max-w-lg mx-auto p-xl">
      <div className="text-center mb-lg">
        <h1 className="m-0 text-xl">{t('public.title')}</h1>
        <div className="muted text-sm mt-sm">{t('public.subtitle')}</div>
        {data?.updatedAt && (
          <div className="muted text-xs mt-xs">{t('public.lastUpdated')}: {new Date(data.updatedAt).toLocaleString()}</div>
        )}
      </div>

      <div className="grid-4-responsive flex-gap-md">
        {STAT_CARDS.map(({ key, icon, labelKey }) => {
          const val = data?.[key]
          if (val === undefined) return null
          return (
            <div key={key} className="card text-center" style={{ padding: 20 }}>
              <div className="text-3xl mb-sm">{icon}</div>
              <div className="text-bold" style={{ fontSize: 32, color: 'var(--accent-blue)' }}>
                {typeof val === 'number' ? val.toLocaleString() : val}
              </div>
              <div className="muted text-sm">{t(labelKey)}</div>
            </div>
          )
        })}
      </div>

      {data?.statusBreakdown && Object.keys(data.statusBreakdown).length > 0 && (
        <div className="card mt-lg">
          <h3 className="m-0 mb-sm text-base">{t('public.byStatus')}</h3>
          <div className="flex flex-gap-lg flex-wrap">
            {Object.entries(data.statusBreakdown).map(([status, count]) => (
              <div key={status} className="flex flex-gap-xs" style={{ alignItems: 'center' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_COLORS[status] || '#999' }} />
                <span className="text-sm">{status}: <strong>{count}</strong></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
