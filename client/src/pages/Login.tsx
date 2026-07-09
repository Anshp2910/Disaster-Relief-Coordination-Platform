import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { createStagger, createListItem } from '../utils/animations'
import { ShieldCheck, Activity, Eye, EyeOff, Loader2, GitBranch, Globe } from 'lucide-react'
import { clientApi, API_BASE } from '../api/client'
import { useAuth } from '../context/AuthContext'

const FALLBACK_STATS = [
  { value: '12,450+', key: 'auth.statOps' }, { value: '2,800+', key: 'auth.statVolunteers' },
  { value: '340+', key: 'auth.statNgos' }, { value: '98.2%', key: 'auth.statResponse' },
]

const container = createStagger(0.08, 0.1)
const item = createListItem(20, 0.5)

export default function Login() {
  useEffect(() => { document.title = 'Disaster Relief - Login' }, [])
  const [liveStats, setLiveStats] = useState(FALLBACK_STATS)
  const fetchedRef = useRef(false)
  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    clientApi.getPublicOverview().then((res) => {
      const d = res as Record<string, unknown>
      setLiveStats([
        { value: `${(d.activeRequests as number) || 0}+`, key: 'auth.statOps' },
        { value: `${(d.totalResources as number) || 0}+`, key: 'auth.statVolunteers' },
        { value: `${(d.activeIncidents as number) || 0}+`, key: 'auth.statNgos' },
        { value: '98.2%', key: 'auth.statResponse' },
      ])
    }).catch(() => {/* silent - use fallback */})
  }, [])

  const [email, setEmail] = useState(() => { try { return localStorage.getItem('rememberedEmail') || '' } catch { return '' } })
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { login } = useAuth()

  function handleSocialLogin(provider: 'google' | 'github') { window.location.href = `${API_BASE}/api/auth/${provider}` }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const { token, user } = (await clientApi.login({ email, password })) as { token: string; user: Record<string, unknown> }
      if (remember) { try { localStorage.setItem('rememberedEmail', email) } catch {} } else { try { localStorage.removeItem('rememberedEmail') } catch {} }
      login(token, user)
      const from = (location.state as { from?: string })?.from || '/dashboard'
      navigate(from, { replace: true })
    } catch (err) { setError((err as Error).message || t('common.loginFailed')) }
    finally { setLoading(false) }
  }

  return (
    <motion.div className="auth-split" variants={container} initial="hidden" animate="visible">
      <motion.div className="auth-hero" variants={item}>
        <div className="auth-hero-content">
          <motion.div className="flex items-center gap-sm mb-lg" variants={item}>
            <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={28} color="#fff" /></div>
          </motion.div>
          <motion.h1 className="auth-hero-title" variants={item}>{t('appTitle')}</motion.h1>
          <motion.p className="auth-hero-sub" variants={item}>{t('auth.heroSubtitle')}</motion.p>
          <motion.div className="auth-hero-stats" variants={item}>
            {liveStats.map((s) => (
              <motion.div key={s.key} className="auth-hero-stat">
                <div className="auth-hero-stat-value">{s.value}</div>
                <div className="auth-hero-stat-label">{t(s.key)}</div>
              </motion.div>
            ))}
          </motion.div>
          <motion.div className="flex items-center gap-sm" style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.5)' }} variants={item}>
            <Activity size={14} /> <span>{t('auth.mission')}</span>
          </motion.div>
        </div>
      </motion.div>

      <motion.div className="auth-card-wrap" variants={item}>
        <div className="auth-card-inner">
          <motion.div className="flex items-center gap-sm mb-xl" variants={item}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-xs)', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={22} color="#fff" /></div>
            <div>
              <div className="text-sm text-bold" style={{ color: 'var(--text)' }}>{t('auth.appName')}</div>
              <div className="text-xs text-muted">{t('auth.govtOfIndia')}</div>
            </div>
          </motion.div>

          <motion.h2 className="auth-title" variants={item}>{t('auth.loginTitle')}</motion.h2>

          <motion.div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }} variants={item}>
            <button className="auth-social-btn" onClick={() => handleSocialLogin('google')}><Globe size={18} /> Google</button>
            <button className="auth-social-btn" onClick={() => handleSocialLogin('github')}><GitBranch size={18} /> GitHub</button>
          </motion.div>

          <motion.div className="auth-divider" variants={item}><span>{t('auth.orEmail')}</span></motion.div>

          <motion.form onSubmit={onSubmit} variants={item}>
            {error && <div className="auth-error" id="login-error" role="alert">{error}</div>}
            <div className="mb-md">
              <label htmlFor="login-email" className="auth-label">{t('auth.email')}</label>
              <input id="login-email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className="auth-input" placeholder={t('auth.email')} aria-invalid={error ? 'true' : 'false'} />
            </div>
            <div className="mb-md">
              <label htmlFor="login-password" className="auth-label">{t('auth.password')}</label>
              <div style={{ position: 'relative' }}>
                <input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="auth-input" placeholder={t('auth.password')} aria-invalid={error ? 'true' : 'false'} autoComplete="current-password" minLength={8} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility" style={{ position: 'absolute', right: 'var(--space-2xs)', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 'var(--space-2xs)' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between mb-lg">
              <label className="flex items-center gap-xs" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={{ accentColor: 'var(--accent)' }} /> {t('auth.rememberMe')}
              </label>
              <Link to="/forgot-password" style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', textDecoration: 'underline' }}>{t('auth.forgotPassword')}</Link>
            </div>
            <button disabled={loading} type="submit" className="auth-submit">
              {loading ? <span className="flex items-center justify-center gap-sm"><Loader2 size={18} className="spinner" /> {t('auth.loggingIn')}</span> : t('auth.loginButton')}
            </button>
          </motion.form>

          <motion.div className="auth-alt" variants={item}>
            {t('auth.noAccount')} <Link to="/register">{t('auth.registerLink')}</Link>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}