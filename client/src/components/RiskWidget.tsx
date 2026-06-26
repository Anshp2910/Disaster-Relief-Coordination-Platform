import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

interface AdminStats {
  totalUsers: number
  totalRequests: number
  byStatus?: Record<string, number>
  byCategory?: Record<string, number>
  byPriority?: Record<string, number>
  dailyRequests?: Array<{ _id: string; count: number }>
}

interface RiskWidgetProps {
  stats: AdminStats | null
  loading?: boolean
}

interface RiskInfo {
  level: string
  score: number
  color: string
}

function calcRisk(stats: AdminStats | null): RiskInfo {
  if (!stats) return { level: 'Unknown', score: 0, color: '#64748b' }
  const total = stats.totalRequests || 1
  const open = stats.byStatus?.Open ?? 0
  const critical = stats.byPriority?.Critical ?? 0
  const ratio = (open + critical * 2) / total
  const score = Math.min(Math.round(ratio * 100), 100)

  if (score >= 70) return { level: 'Critical', score, color: '#ef4444' }
  if (score >= 40) return { level: 'High', score, color: '#f97316' }
  if (score >= 20) return { level: 'Moderate', score, color: '#eab308' }
  return { level: 'Low', score, color: '#22c55e' }
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
}

function RiskWidgetInner({ stats, loading = false }: RiskWidgetProps) {
  const risk = useMemo(() => calcRisk(stats), [stats])

  return (
    <motion.div className="bento-card" variants={cardVariants}>
      <div className="flex-between mb-sm">
        <span className="bento-title">Disaster Risk</span>
        {loading ? <div className="sk-line" style={{ width: 18, height: 18, borderRadius: '50%' }} /> : <AlertTriangle size={18} style={{ color: risk.color }} />}
      </div>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="sk-line" style={{ width: '30%', height: 32 }} />
          <div className="sk-line" style={{ width: '100%', height: 4, borderRadius: 4 }} />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-sm">
            <span className="text-3xl font-extrabold" style={{ color: risk.color, letterSpacing: 'var(--tracking-tight)' }}>{risk.score}%</span>
            <span className="text-sm" style={{ color: risk.color }}>{risk.level}</span>
          </div>
          <div className="mt-sm" style={{ background: 'var(--border)', borderRadius: 4, height: 4, overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${risk.score}%` }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              style={{ height: '100%', background: risk.color, borderRadius: 4 }}
            />
          </div>
        </>
      )}
    </motion.div>
  )
}

const RiskWidget = memo(RiskWidgetInner)
export default RiskWidget
