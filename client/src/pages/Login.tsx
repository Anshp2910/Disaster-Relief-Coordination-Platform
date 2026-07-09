import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { createStagger, createListItem } from '../utils/animations'
import { ShieldCheck, Activity, Eye, EyeOff, Loader2, GitBranch, Globe } from 'lucide-react'
import { clientApi, API_BASE } from '../api/client'
import { useAuth } from '../context/AuthContext'

const FALLBACK_STATS = [
  { value: '12,450+', key: 'auth.statOps' },
  { value: '2,800+', key: 'auth.statVolunteers' },
  { value: '340+', key: 'auth.statNgos' },
  { value: '98.2%', key: 'auth.statResponse' },
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
    }).catch(() => { /* use fallback */ })
  }, [])
  const [email, setEmail] = useState(() => {
    try { return localStorage.getItem('rememberedEmail') || '' } catch { return '' }
  })
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { login } = useAuth()

  function handleSocialLogin(provider: 'google' | 'github') {
    window.location.href = `${API_BASE}/api/auth/${provider}`
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token, user } = (await clientApi.login({ email, password })) as { token: string; user: Record<string, unknown> }
      if (remember) {
        try { localStorage.setItem('rememberedEmail', email) } catch { /* noop */ }
      } else {
        try { localStorage.removeItem('rememberedEmail') } catch { /* noop */ }
      }
      login(token, user)
      const from = (location.state as { from?: string })?.from || '/dashboard'
      navigate(from, { replace: true })
    } catch (err) {
      const e = err as Error
      setError(e.message || t('common.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div className="auth-split" variants={container} initial="hidden" animate="visible">
      {/* ── LEFT: Hero Panel (Government-grade, clean) ── */}
      <motion.div className="auth-hero" variants={item}>
        <div className="auth-hero-bg" />

        <div className="auth-hero-content">
          <motion.div className="auth-emblem" variants={item} aria-hidden="true">
            <ShieldCheck size={28} />
          </motion.div>
          <motion.h1 className="auth-hero-title" variants={item}>
            {t('appTitle')}
          </motion.h1>
          <motion.p className="auth-hero-sub" variants={item}>
            {t('auth.heroSubtitle')}
          </motion.p>

          <motion.div className="auth-hero-stats" variants={item}>
            {liveStats.map((s) => (
              <motion.div key={s.key} className="auth-hero-stat">
                <div className="auth-hero-stat-value">{s.value}</div>
                <div className="auth-hero-stat-label">{t(s.key)}</div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div className="auth-hero-mission" variants={item}>
            <Activity size={14} aria-hidden="true" />
            <span>{t('auth.mission')}</span>
          </motion.div>
        </div>
      </motion.div>

      {/* ── RIGHT: Login Card ── */}
      <motion.div className="auth-card-wrap" variants={item}>
        <div className="auth-card-inner">
          {/* Logo */}
          <motion.div className="auth-logo-wrap" variants={item}>
            <div className="auth-logo" aria-hidden="true">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="auth-logo-text">{t('auth.appName')}</div>
              <div className="auth-logo-sub">{t('auth.govtOfIndia')}</div>
            </div>
          </motion.div>

          <motion.h2 className="auth-title" variants={item}>{t('auth.loginTitle')}</motion.h2>

          {/* Social Login */}
          <motion.div className="auth-social" variants={item}>
            <button className="auth-social-btn" aria-label={t('auth.signInWithGoogle')} onClick={() => handleSocialLogin('google')}>
              <Globe size={18} aria-hidden="true" /> Google
            </button>
            <button className="auth-social-btn" aria-label={t('auth.signInWithGitHub')} onClick={() => handleSocialLogin('github')}>
              <GitBranch size={18} aria-hidden="true" /> GitHub
            </button>
          </motion.div>

          <motion.div className="auth-divider" variants={item}>
            <span>{t('auth.orEmail')}</span>
          </motion.div>

          {/* Form */}
          <motion.form onSubmit={onSubmit} variants={item}>
            {error && <div className="auth-error" id="login-error" role="alert">{error}</div>}

            <motion.div className="auth-field" variants={item}>
              <label htmlFor="login-email" className="auth-label">{t('auth.email')}</label>
              <input
                id="login-email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="auth-input"
                placeholder={t('auth.email')}
                aria-describedby={error ? "login-error" : undefined}
                aria-invalid={error ? "true" : "false"}
              />
            </motion.div>

            <motion.div className="auth-field" variants={item}>
              <label htmlFor="login-password" className="auth-label">{t('auth.password')}</label>
              <div className="auth-input-wrap">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="auth-input"
                  placeholder={t('auth.password')}
                  aria-describedby={error ? 'login-error' : undefined}
                  aria-invalid={error ? 'true' : 'false'}
                  autoComplete="current-password"
                  minLength={8}
                />
                <button
                  type="button"
                  className="auth-pw-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            </motion.div>

            <motion.div className="auth-options" variants={item}>
              <label className="auth-checkbox">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span>{t('auth.rememberMe')}</span>
              </label>
              <Link to="/forgot-password" className="auth-forgot">{t('auth.forgotPassword')}</Link>
            </motion.div>

            <motion.button
              disabled={loading}
              type="submit"
              className="auth-submit"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-sm">
                  <Loader2 size={18} className="spinner" aria-hidden="true" />
                  {t('auth.loggingIn')}
                </span>
              ) : t('auth.loginButton')}
            </motion.button>
          </motion.form>

          <motion.div className="auth-alt" variants={item}>
            {t('auth.noAccount')} <Link to="/register">{t('auth.registerLink')}</Link>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}
