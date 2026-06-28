import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowLeft, LayoutDashboard } from 'lucide-react'
import { PageTransition } from '../components/ui'
import { RippleBtn } from '../components/ui'

export default function NotFound() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <PageTransition>
      <motion.main
        className="flex-center flex-col text-center px-lg"
        style={{ minHeight: '60vh' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
      <motion.h1
        className="text-5xl font-extrabold m-0 mb-sm text-gradient"
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        404
      </motion.h1>
      <p className="text-lg font-semibold m-0 mb-sm" style={{ color: 'var(--text)' }}>
        {t('notFound.title') || 'Page Not Found'}
      </p>
      <p className="text-sm m-0 mb-lg" style={{ color: 'var(--text-muted)', maxWidth: 400 }}>
        {t('notFound.description') || 'The page you are looking for doesn\'t exist or has been moved.'}
      </p>
      <div className="flex-center gap-sm">
        <RippleBtn className="" onClick={() => navigate('/dashboard')}>
          <LayoutDashboard size={16} /> {t('notFound.goHome') || 'Go to Dashboard'}
        </RippleBtn>
        <motion.button className="btn-ghost" onClick={() => navigate(-1)} whileTap={{ scale: 0.97 }}>
          <ArrowLeft size={16} /> {t('notFound.goBack') || 'Go Back'}
        </motion.button>
      </div>
    </motion.main>
    </PageTransition>
  )
}
