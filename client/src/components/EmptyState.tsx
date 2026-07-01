import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { RippleBtn } from '../components/ui'

interface EmptyStateAction {
  onClick: () => void
  label: string
}

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: EmptyStateAction
  compact?: boolean
  className?: string
}

export default function EmptyState({ icon, title, description, action, compact = false, className = '' }: EmptyStateProps) {
  return (
    <motion.div
      className={`empty-state ${compact ? 'empty-state--compact' : ''} ${className}`.trim()}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="empty-state-icon"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
        aria-hidden="true"
      >
        {icon}
      </motion.div>
      <motion.h3
        className="empty-state-title"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        {title}
      </motion.h3>
      {description && (
        <motion.p
          className="empty-state-desc"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {description}
        </motion.p>
      )}
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <RippleBtn onClick={action.onClick} className="btn-primary mt-md">
            {action.label}
          </RippleBtn>
        </motion.div>
      )}
    </motion.div>
  )
}
