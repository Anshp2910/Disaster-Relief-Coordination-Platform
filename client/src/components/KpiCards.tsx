import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { AnimatedCounter } from './ui'
import { TrendingUp, FileText, AlertTriangle, UserCheck, CheckCircle, ListChecks } from 'lucide-react'

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

const KPI_CONFIG = [
  { id: 'total', label: 'Total Requests', icon: FileText, color: 'var(--accent)' },
  { id: 'open', label: 'Open', icon: ListChecks, color: 'var(--warning)' },
  { id: 'resolved', label: 'Resolved', icon: CheckCircle, color: 'var(--success)' },
  { id: 'critical', label: 'Critical', icon: AlertTriangle, color: 'var(--danger)' },
  { id: 'volunteers', label: 'Volunteers', icon: UserCheck, color: 'var(--blue-500)' },
]

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

function KpiCard({ label, icon: Icon, color, value, loading }: { label: string; icon: React.ElementType; color: string; value: number; loading: boolean }) {
  return (
    <motion.div className="kpi-card" variants={cardVariants}>
      <div className="kpi-header">
        <span className="kpi-label">{label}</span>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="kpi-value" style={{ color }}>
        {loading ? <div className="sk-line" style={{ width: '60%', height: 28 }} /> : <AnimatedCounter to={value} duration={1.8} />}
      </div>
      <div className="kpi-change" style={{ color: 'var(--success)' }}>
        <TrendingUp size={12} />
        <span className="ml-xs">Live</span>
      </div>
    </motion.div>
  )
}

function KpiCardsInner({ stats, loading = false }: KpiCardsProps) {
  const values: Record<string, number> = useMemo(() => ({
    total: stats?.totalRequests ?? 0,
    open: stats?.byStatus?.Open ?? 0,
    resolved: (stats?.byStatus?.Resolved ?? 0) + (stats?.byStatus?.Fulfilled ?? 0),
    critical: stats?.byPriority?.Critical ?? 0,
    volunteers: stats?.totalUsers ?? 0,
  }), [stats])

  return (
    <div className="kpi-grid mb-lg">
      {KPI_CONFIG.map((kpi) => (
        <KpiCard key={kpi.id} label={kpi.label} icon={kpi.icon} color={kpi.color} value={values[kpi.id] ?? 0} loading={loading} />
      ))}
    </div>
  )
}

const KpiCards = memo(KpiCardsInner)
export default KpiCards
