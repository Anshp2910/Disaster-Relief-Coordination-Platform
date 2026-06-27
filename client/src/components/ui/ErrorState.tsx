import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

interface ErrorStateProps {
  message: string
  onRetry?: () => void
  fullPage?: boolean
}

export default function ErrorState({ message, onRetry, fullPage = false }: ErrorStateProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <motion.div
      className={`flex-center flex-col text-center ${fullPage ? 'min-h-60vh' : ''}`}
      style={{
        padding: fullPage ? 'var(--space-3xl) var(--space-lg)' : 'var(--space-2xl) var(--space-lg)',
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      role="alert"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
        style={{
          marginBottom: 'var(--space-md)',
          color: 'var(--danger)',
          opacity: 0.7,
          width: 48,
          height: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-full)',
          background: 'var(--danger-soft)',
        }}
      >
        <AlertCircle size={28} />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
        style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          margin: '0 0 var(--space-xs)',
          color: 'var(--text)',
          maxWidth: 400,
          lineHeight: 1.6,
        }}
      >
        {message}
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="flex flex-gap-sm mt-md"
      >
        {onRetry && (
          <button
            className="btnSecondary btn-sm"
            onClick={onRetry}
            aria-label={t('errorState.retry')}
          >
            <RefreshCw size={14} aria-hidden="true" />
            {t('errorState.retry')}
          </button>
        )}
        {fullPage && (
          <button
            className="btnPrimary btn-sm"
            onClick={() => navigate('/dashboard')}
          >
            <Home size={14} aria-hidden="true" />
            {t('common.goToDashboard') || 'Dashboard'}
          </button>
        )}
      </motion.div>
    </motion.div>
  )
}
