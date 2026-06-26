import { motion } from 'framer-motion'
import { type ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <motion.div
      className="flex-between mb-lg flex-wrap gap-sm"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <div>
        <h1 className="text-2xl font-extrabold m-0" style={{ letterSpacing: 'var(--tracking-tight)' }}>{title}</h1>
        {subtitle && <p className="text-sm m-0 mt-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-sm">{actions}</div>}
    </motion.div>
  )
}
