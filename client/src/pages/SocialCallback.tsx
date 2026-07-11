import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import PageTransition from '../components/ui/PageTransition'
import { Loader2 } from 'lucide-react'
import { safeSetItem } from '../utils/storage'
import { clientApi } from '../api/client'

export default function SocialCallback() {
  useEffect(() => { document.title = 'Disaster Relief - Signing In...' }, [])
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return
    processed.current = true

    const token = searchParams.get('token')
    const error = searchParams.get('error')

    if (error) {
      const errorMsg = error === 'access_denied' ? t('auth.socialLoginDenied') : error
      navigate(`/login?error=${encodeURIComponent(errorMsg)}`, { replace: true })
      return
    }

    if (!token) {
      navigate('/login?error=' + encodeURIComponent(t('auth.invalidCallback') || 'Authentication failed. Please try again.'), { replace: true })
      return
    }

    // Store the auth token
    safeSetItem('token', token)

    // Fetch user info from /me endpoint using clientApi (handles envelope unwrapping), then store and redirect
    clientApi.me().then((data) => {
      const userData = (data as Record<string, unknown>).user
      if (userData) {
        safeSetItem('user', JSON.stringify(userData))
      }
      window.dispatchEvent(new Event('authchange'))
      navigate('/dashboard', { replace: true })
    }).catch(() => {
      // If /me fails, token may still be valid — authchange lets AuthContext re-read from storage
      window.dispatchEvent(new Event('authchange'))
      navigate('/dashboard', { replace: true })
    })
  }, [navigate, searchParams, t])

  return (
    <PageTransition className="flex-center min-h-screen">
      <motion.div
        className="flex flex-col items-center gap-lg text-center p-xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 size={48} className="text-accent" aria-hidden="true" />
        </motion.div>
        <h2 className="text-xl font-semibold">{t('auth.signingIn')}</h2>
        <p className="text-muted text-sm">{t('auth.redirecting')}</p>
      </motion.div>
    </PageTransition>
  )
}
