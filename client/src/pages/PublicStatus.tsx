import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Activity, Users, CheckCircle, AlertTriangle, Clock, BarChart3, TrendingUp } from 'lucide-react'
import { PageHeader, DataCard } from '../components/ui'
import { clientApi } from '../api/client'
import { SkeletonList } from '../components/Skeleton'

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
    <motion.div
      className="max-w-lg mx-auto p-xl"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <PageHeader title={t('public.title')} subtitle={t('public.subtitle')} />
      {data?.updatedAt ? (
        <div className="muted text-xs mt-xs">{t('public.lastUpdated')}: {new Date(data.updatedAt as string).toLocaleString()}</div>
      ) : null}

      <motion.div
        className="grid-4-responsive flex-gap-md"
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
          <div className="flex flex-gap-lg flex-wrap">
            {Object.entries(data.statusBreakdown as Record<string, number>).map(([status, count]) => (
              <div key={status} className="flex flex-gap-xs items-center" aria-label={`${status}: ${count}`}>
                <div className="h-10 rounded-full" style={{ background: STATUS_COLORS[status] || 'var(--text-muted)' }} aria-hidden="true" />
                <span className="text-sm">{status}: <strong>{count}</strong></span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}