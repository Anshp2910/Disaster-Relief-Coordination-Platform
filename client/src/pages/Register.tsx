import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { UserPlus, Loader2, Mail, Lock, User } from 'lucide-react'
import { clientApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('volunteer')
  const [displayName, setDisplayName] = useState('')
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
      const { token, user } = (await clientApi.register({ email, password, role, displayName })) as { token: string; user: Record<string, unknown> }
      login(token, user)
      navigate('/dashboard')
    } catch (err) {
      const e = err as Error
      setError(e.message || 'Register failed')
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
            <UserPlus size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, letterSpacing: 'var(--tracking-tight)', margin: 0 }}>{t('auth.registerTitle')}</h2>
            <p className="subtitle" style={{ margin: 0 }}>{t('auth.registerSubtitle') || 'Create a new account'}</p>
          </div>
        </div>
        <form onSubmit={onSubmit}>
          {error ? <div className="errorText">{error}</div> : null}
          <div className="field-group">
            <label htmlFor="reg-name">{t('auth.displayName')}</label>
            <input id="reg-name" placeholder={t('auth.displayName')} value={displayName} onChange={(e) => setDisplayName(e.target.value)} type="text" required />
          </div>
          <div className="field-group">
            <label htmlFor="reg-email">{t('auth.email')}</label>
            <input id="reg-email" placeholder={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </div>
          <div className="field-group">
            <label htmlFor="reg-password">{t('auth.password')}</label>
            <input id="reg-password" placeholder={t('auth.password')} value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </div>
          <div className="field-group">
            <label htmlFor="reg-role">{t('auth.role')}</label>
            <select
              id="reg-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'transparent',
                fontSize: 'var(--text-base)',
                color: 'inherit',
              }}
            >
              <option value="volunteer">{t('auth.volunteer')}</option>
              <option value="ngo">{t('auth.ngo')}</option>
            </select>
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
                {t('auth.creating')}
              </span>
            ) : t('auth.createAccount')}
          </motion.button>
        </form>
        <div className="auth-alt">
          {t('auth.hasAccount')}{' '}
          <Link to="/login">{t('auth.loginLink')}</Link>
        </div>
      </motion.div>
    </div>
  )
}