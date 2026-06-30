import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { safeSetItem } from '../utils/storage'

export default function SocialCallback() {
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
      navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true })
      return
    }

    if (!token) {
      navigate('/login?error=invalid-callback', { replace: true })
      return
    }

    // Store the auth token
    safeSetItem('token', token)

    // Fetch user info from /me endpoint, then store and redirect
    const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch user')
        return res.json()
      })
      .then((data) => {
        if (data.user) {
          safeSetItem('user', JSON.stringify(data.user))
        }
        window.dispatchEvent(new Event('authchange'))
        navigate('/dashboard', { replace: true })
      })
      .catch(() => {
        // If /me fails, token may still be valid — authchange lets AuthContext re-read from storage
        window.dispatchEvent(new Event('authchange'))
        navigate('/dashboard', { replace: true })
      })
  }, [navigate, searchParams])

  return (
    <motion.div
      className="flex-center min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
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
    </motion.div>
  )
}
