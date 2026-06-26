import { AlertCircle, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useTranslation()
  return (
    <motion.div
      className="flex-center flex-col text-center py-2xl px-lg"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
    >
      <div className="mb-md" style={{ color: 'var(--danger)', opacity: 0.6 }}>
        <AlertCircle size={40} />
      </div>
      <p className="text-sm font-medium m-0 mb-sm" style={{ color: 'var(--text)' }}>{message}</p>
      {onRetry && (
        <button className="btn-ghost btn-sm" onClick={onRetry}>
          <RefreshCw size={14} /> {t('errorState.retry')}
        </button>
      )}
    </motion.div>
  )
}
