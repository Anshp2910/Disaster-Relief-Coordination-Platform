import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowLeft, LayoutDashboard } from 'lucide-react'
import { PageTransition, RippleBtn } from '../components/ui'

export default function NotFound() {
  useEffect(() => { document.title = 'Disaster Relief - Page Not Found' }, [])
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
      {/* ── 404 Illustration ── */}
      <motion.svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        fill="none"
        className="mb-md"
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        aria-hidden="true"
      >
        <circle cx="60" cy="60" r="56" stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 4" opacity="0.3" />
        <circle cx="60" cy="60" r="40" fill="var(--accent-soft)" />
        <path d="M60 40v20" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="60" cy="70" r="4" fill="var(--accent)" />
        <path d="M34 34l8 8M86 34l-8 8M34 86l8-8M86 86l-8-8" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      </motion.svg>

      <motion.h1
        className="text-xl m-0 mb-sm"
        style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', fontWeight: 800, background: 'var(--gradient-accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      >
        404
      </motion.h1>
      <p className="text-lg font-semibold m-0 mb-sm">
        {t('notFound.title') || 'Page Not Found'}
      </p>
      <p className="text-sm text-muted m-0 mb-lg" style={{ maxWidth: 400 }}>
        {t('notFound.description') || 'The page you are looking for doesn\'t exist or has been moved.'}
      </p>
      <div className="flex-center gap-sm">
        <RippleBtn className="btn-primary" onClick={() => navigate('/dashboard')} aria-label={t('notFound.goHome') || 'Go to Dashboard'}>
          <LayoutDashboard size={16} /> {t('notFound.goHome') || 'Go to Dashboard'}
        </RippleBtn>
        <motion.button className="btn-ghost" onClick={() => navigate(-1)} whileTap={{ scale: 0.97 }} aria-label={t('notFound.goBack') || 'Go Back'}>
          <ArrowLeft size={16} /> {t('notFound.goBack') || 'Go Back'}
        </motion.button>
      </div>
    </motion.main>
    </PageTransition>
  )
}
