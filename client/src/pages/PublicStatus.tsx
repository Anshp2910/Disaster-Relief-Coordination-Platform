import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Activity, Users, CheckCircle, AlertTriangle, Clock, BarChart3, TrendingUp } from 'lucide-react'
import { PageHeader, DataCard, PageTransition, ErrorState } from '../components/ui'
import { SkeletonCard } from '../components/Skeleton'
import { clientApi } from '../api/client'
import { useAutoRefresh } from '../hooks/useAutoRefresh'

const STATUS_COLORS: Record<string, string> = {
  Open: 'var(--pri-400)', Assigned: 'var(--amber-400)', 'In Progress': 'var(--amber-500)',
  Resolved: 'var(--green-400)', Closed: 'var(--text-muted)',
}

interface StatCard {
  key: string
  labelKey: string
}

const STAT_CARDS: StatCard[] = [
  { key: 'activeRequests', labelKey: 'public.activeRequests' },
  { key: 'totalResources', labelKey: 'public.totalResources' },
  { key: 'deployedResources', labelKey: 'public.deployedResources' },
  { key: 'availableResources', labelKey: 'public.availableResources' },
  { key: 'activeIncidents', labelKey: 'public.activeIncidents' },
  { key: 'totalZones', labelKey: 'public.totalZones' },
  { key: 'activeSOS', labelKey: 'public.activeSOS' },
]

const ICON_MAP: Record<string, React.ReactNode> = {
  activeRequests: <Activity size={24} />,
  totalResources: <BarChart3 size={24} />,
  deployedResources: <TrendingUp size={24} />,
  availableResources: <CheckCircle size={24} />,
  activeIncidents: <AlertTriangle size={24} />,
  totalZones: <Users size={24} />,
  activeSOS: <Clock size={24} />,
}

export default function PublicStatus() {
  useEffect(() => { document.title = 'Disaster Relief - Public Status' }, [])
  const { t } = useTranslation()
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await clientApi.getPublicOverview() as Record<string, unknown>
      setData(res)
    } catch (err) {
      const e = err as Error
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useAutoRefresh(load, { interval: 30000 })

if (loading) return (
  <PageTransition>
    <div className="container" aria-label="Loading public status data">
      <SkeletonCard lines={3} />
    </div>
  </PageTransition>
)
  if (error) return (
    <PageTransition>
      <ErrorState message={error} onRetry={load} />
    </PageTransition>
  )

  return (
    <PageTransition>
      <motion.div
        className="container max-w-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
      <PageHeader title={t('public.title')} subtitle={t('public.subtitle')} />
      {data?.updatedAt ? (
        <div className="muted text-xs mt-xs">{t('public.lastUpdated')}: {new Date(data.updatedAt as string).toLocaleString()}</div>
      ) : null}

      <motion.div
        className="grid-3-responsive gap-md"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
      >
        {STAT_CARDS.map(({ key, labelKey }) => {
          const val = data?.[key]
          if (val === undefined) return null
          return (
            <motion.div
              key={key}
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            >
              <DataCard
                title={t(labelKey)}
                value={typeof val === 'number' ? val.toLocaleString() : String(val)}
                icon={ICON_MAP[key]}
              />
            </motion.div>
          )
        })}
      </motion.div>

      {data?.statusBreakdown != null && Object.keys(data.statusBreakdown as Record<string, unknown>).length > 0 && (
        <motion.div
          className="card mt-lg"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="m-0 mb-sm text-base">{t('public.byStatus')}</h3>
          <div className="flex gap-lg flex-wrap">
            {Object.entries(data.statusBreakdown as Record<string, number>).map(([status, count]) => (
              <div key={status} className="flex gap-xs items-center" aria-label={`${status}: ${count}`}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: STATUS_COLORS[status] || 'var(--text-muted)' }} aria-hidden="true" />
                <span className="text-sm">{status}: <strong>{count}</strong></span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
    </PageTransition>
  )
}
