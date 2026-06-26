import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { MapPin, LayoutDashboard, Users, Loader2 } from 'lucide-react'
import { clientApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { login } = useAuth()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token, user } = (await clientApi.login({ email, password })) as { token: string; user: Record<string, unknown> }
      login(token, user)
      navigate('/dashboard')
    } catch (err) {
      const e = err as Error
      setError(e.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-center gap-sm mb-lg">
          <div className="login-emblem" style={{ width: 40, height: 40, background: 'var(--accent-soft)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
            <MapPin size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, letterSpacing: 'var(--tracking-tight)', margin: 0 }}>{t('auth.loginTitle')}</h2>
            <p className="subtitle" style={{ margin: 0 }}>{t('auth.loginSubtitle') || 'Sign in to your account'}</p>
          </div>
        </div>
        <form onSubmit={onSubmit}>
          {error ? <div className="errorText">{error}</div> : null}
          <div className="field-group">
            <label htmlFor="login-email">{t('auth.email')}</label>
            <input id="login-email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </div>
          <div className="field-group">
            <label htmlFor="login-password">{t('auth.password')}</label>
            <input id="login-password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </div>
          <motion.button
            disabled={loading}
            type="submit"
            className="btnPrimary"
            style={{ width: '100%', padding: '12px', fontSize: 'var(--text-base)' }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <span className="flex items-center gap-sm justify-center">
                <Loader2 size={18} className="spinner" />
                {t('auth.loggingIn')}
              </span>
            ) : t('auth.loginButton')}
          </motion.button>
        </form>
        <div className="auth-alt">
          {t('auth.noAccount')}{' '}
          <Link to="/register">{t('auth.registerLink')}</Link>
        </div>
      </motion.div>
    </div>
  )
}
