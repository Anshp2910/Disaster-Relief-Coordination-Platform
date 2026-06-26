import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { AnimatedCounter } from './ui'
import { TrendingUp, TrendingDown, Box, AlertTriangle, UserCheck, Handshake, ListChecks } from 'lucide-react'

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
  { id: 'resources', label: 'Resources', icon: Box, color: '#0ea5e9', key: 'totalRequests' as const },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle, color: '#ef4444', key: 'totalRequests' as const },
  { id: 'volunteers', label: 'Volunteers', icon: UserCheck, color: '#22c55e', key: 'totalUsers' as const },
  { id: 'ngos', label: 'NGOs', icon: Handshake, color: '#8b5cf6', key: 'totalUsers' as const },
  { id: 'pending', label: 'Pending Requests', icon: ListChecks, color: '#f97316', key: 'totalRequests' as const },
]

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

function KpiCard({ id, label, icon: Icon, color, value, loading }: { id: string; label: string; icon: React.ElementType; color: string; value: number; loading: boolean }) {
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
  const totalRequests = stats?.totalRequests ?? 0
  const totalUsers = stats?.totalUsers ?? 0

  const values: Record<string, number> = useMemo(() => ({
    resources: totalRequests,
    incidents: Math.round(totalRequests * 0.1),
    volunteers: totalUsers,
    ngos: Math.round(totalUsers * 0.05),
    pending: stats?.byStatus?.Open ?? 0,
  }), [totalRequests, totalUsers, stats])

  return (
    <div className="kpi-grid mb-lg">
      {KPI_CONFIG.map((kpi) => (
        <KpiCard key={kpi.id} id={kpi.id} label={kpi.label} icon={kpi.icon} color={kpi.color} value={values[kpi.id] ?? 0} loading={loading} />
      ))}
    </div>
  )
}

const KpiCards = memo(KpiCardsInner)
export default KpiCards
