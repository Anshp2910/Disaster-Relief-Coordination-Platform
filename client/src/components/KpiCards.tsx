import { memo, useMemo } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { AnimatedCounter } from './ui'
import { TrendingUp, FileText, AlertTriangle, UserCheck, CheckCircle, ListChecks } from 'lucide-react'
import useReducedMotion from '../hooks/useReducedMotion'

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
}

interface AdminStats {
  totalUsers: number
  totalRequests: number
  byStatus?: Record<string, number>
  byCategory?: Record<string, number>
  byPriority?: Record<string, number>
  dailyRequests?: Array<{ _id: string; count: number }>
}

interface KpiCardsProps {
  stats: AdminStats | null
  loading?: boolean
}

const KPI_CONFIG = (t: (key: string) => string) => [
  { id: 'total', label: t('kpi.totalRequests'), icon: FileText, color: 'var(--accent)' },
  { id: 'open', label: t('kpi.open'), icon: ListChecks, color: 'var(--warning)' },
  { id: 'resolved', label: t('kpi.resolved'), icon: CheckCircle, color: 'var(--success)' },
  { id: 'critical', label: t('kpi.critical'), icon: AlertTriangle, color: 'var(--danger)' },
  { id: 'volunteers', label: t('kpi.volunteers'), icon: UserCheck, color: 'var(--blue-500)' },
]

function KpiCard({ label, icon: Icon, color, value, loading, reduced, liveLabel }: { label: string; icon: React.ElementType; color: string; value: number; loading: boolean; reduced: boolean; liveLabel: string }) {
  return (
    <motion.div className="kpi-card" variants={reduced ? {} : cardVariants}>
      <div className="kpi-header">
        <span className="kpi-label">{label}</span>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="kpi-value" style={{ color }}>
        {loading ? <div className="sk-line" style={{ width: '60%', height: 28 }} /> : <AnimatedCounter to={value} duration={1.8} />}
      </div>
      <div className="kpi-change" style={{ color: 'var(--success)' }}>
        <TrendingUp size={12} />
        <span className="ml-xs">{liveLabel}</span>
      </div>
    </motion.div>
  )
}

function KpiCardsInner({ stats, loading = false }: KpiCardsProps) {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const config = KPI_CONFIG(t)
  const values: Record<string, number> = useMemo(() => ({
    total: stats?.totalRequests ?? 0,
    open: stats?.byStatus?.Open ?? 0,
    resolved: (stats?.byStatus?.Resolved ?? 0) + (stats?.byStatus?.Fulfilled ?? 0),
    critical: stats?.byPriority?.Critical ?? 0,
    volunteers: stats?.totalUsers ?? 0,
  }), [stats])

  return (
    <motion.div
      className="kpi-grid mb-lg"
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
      }}
    >
      {config.map((kpi) => (
        <KpiCard key={kpi.id} label={kpi.label} icon={kpi.icon} color={kpi.color} value={values[kpi.id] ?? 0} loading={loading} reduced={reduced} liveLabel={t('kpi.live')} />
      ))}
    </motion.div>
  )
}

const KpiCards = memo(KpiCardsInner)
export default KpiCards
