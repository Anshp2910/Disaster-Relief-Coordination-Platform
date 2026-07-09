import { memo } from 'react'
import { COLORS_FALLBACK } from '../utils/constants'

interface BadgeProps {
  label: string
  colors: Record<string, { bg: string; border: string; text: string }>
  colorKey?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  ribbon?: boolean
  severity?: 'critical' | 'high' | 'medium' | 'low'
}

const Badge = memo(function Badge({ label, colors, colorKey, size = 'md', className = '', ribbon, severity }: BadgeProps) {
  const severityLabel = severity ? `${severity} severity: ` : ''
  const c = (colors || {})[colorKey || label] || COLORS_FALLBACK
  const sizeClass = size === 'sm' ? 'govt-badge--sm' : size === 'lg' ? 'govt-badge--lg' : ''

  if (ribbon && severity) {
    return (
      <div className={`severity-ribbon severity-ribbon--${severity} ${className}`.trim()}>
        {label}
      </div>
    )
  }

  return (
    <span className={`govt-badge ${sizeClass} ${className}`.trim()} role="status" aria-label={`${severityLabel}${label}`} style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {label}
    </span>
  )
})

export default Badge
