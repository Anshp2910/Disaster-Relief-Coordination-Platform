import { memo } from 'react'
import { COLORS_FALLBACK } from '../utils/constants'

interface BadgeProps {
  label: string
  colors: Record<string, { bg: string; border: string; text: string }>
  colorKey?: string
}

const Badge = memo(function Badge({ label, colors, colorKey }: BadgeProps) {
  const c = (colors || {})[colorKey || label] || COLORS_FALLBACK
  return (
    <span className="govt-badge" role="status" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {label}
    </span>
  )
})

export default Badge
