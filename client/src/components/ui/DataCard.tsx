import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface DataCardProps {
  title: string
  value: string | number
  icon?: ReactNode
  color?: string
  subtitle?: string
  trend?: { value: number; label: string; positive: boolean }
  onClick?: () => void
}

export default function DataCard({ title, value, icon, color, subtitle, trend, onClick }: DataCardProps) {
  return (
    <motion.div
      className="bento-card"
      whileHover={onClick ? { scale: 1.02, y: -2 } : undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === 'Enter') onClick() } : undefined}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      <div className="bento-header">
        <span className="bento-title">{title}</span>
        {icon && (
          <div className="bento-icon" style={{ background: color || 'var(--accent-soft)', color: color || 'var(--accent)' }}>
            {icon}
          </div>
        )}
      </div>
      <div className="bento-kpi-value">{value}</div>
      {subtitle && <div className="mt-sm text-xs text-muted">{subtitle}</div>}
      {trend && (
        <div className="flex items-center gap-xs mt-sm">
          <span className="text-sm text-semi" style={{ color: trend.positive ? 'var(--success)' : 'var(--danger)' }}>
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
          <span className="text-xs text-muted">{trend.label}</span>
        </div>
      )}
    </motion.div>
  )
}
