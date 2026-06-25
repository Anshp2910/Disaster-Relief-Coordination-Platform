import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import { SkeletonList } from '../components/Skeleton'

const STATUS_COLORS: Record<string, string> = {
  Open: 'var(--pri-400)', Assigned: 'var(--amber-400)', 'In Progress': 'var(--amber-500)',
  Resolved: 'var(--green-400)', Closed: 'var(--text-muted)',
}

interface StatCard {
  key: string
  icon: string
  labelKey: string
}

const STAT_CARDS: StatCard[] = [
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
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await clientApi.getPublicOverview() as Record<string, unknown>
        if (mounted) setData(res)
      } catch (err) {
        const e = err as Error
        if (mounted) setError(e.message)
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
        {data?.updatedAt ? (
          <div className="muted text-xs mt-xs">{t('public.lastUpdated')}: {new Date(data.updatedAt as string).toLocaleString()}</div>
        ) : null}
      </div>

      <div className="grid-4-responsive flex-gap-md">
        {STAT_CARDS.map(({ key, icon, labelKey }) => {
          const val = data?.[key]
          if (val === undefined) return null
          return (
            <div key={key} className="card text-center p">
              <div className="text-3xl mb-sm">{icon}</div>
              <div className="text-bold text-32 text-accent-blue">
                {typeof val === 'number' ? val.toLocaleString() : String(val)}
              </div>
              <div className="muted text-sm">{t(labelKey)}</div>
            </div>
          )
        })}
      </div>

      {data?.statusBreakdown != null && Object.keys(data.statusBreakdown as Record<string, unknown>).length > 0 && (
        <div className="card mt-lg">
          <h3 className="m-0 mb-sm text-base">{t('public.byStatus')}</h3>
          <div className="flex flex-gap-lg flex-wrap">
            {Object.entries(data.statusBreakdown as Record<string, number>).map(([status, count]) => (
              <div key={status} className="flex flex-gap-xs items-center">
                <div className="h-10 rounded-full" style={{ background: STATUS_COLORS[status] || '#999' }} aria-hidden="true" />
                <span className="text-sm">{status}: <strong>{count}</strong></span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
