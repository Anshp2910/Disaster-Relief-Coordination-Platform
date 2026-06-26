import { AlertCircle, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'

interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <motion.div
      className="flex-center flex-col text-center py-2xl px-lg"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="mb-md" style={{ color: 'var(--danger)', opacity: 0.6 }}>
        <AlertCircle size={40} />
      </div>
      <p className="text-sm font-medium m-0 mb-sm" style={{ color: 'var(--text)' }}>{message}</p>
      {onRetry && (
        <button className="btn-ghost btn-sm" onClick={onRetry}>
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </motion.div>
  )
}
