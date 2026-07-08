import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { createStagger, createListItem } from '../utils/animations'
import { MapPin, ShieldCheck, Activity, Eye, EyeOff, Loader2, GitBranch, Globe } from 'lucide-react'
import { clientApi, API_BASE } from '../api/client'
import { useAuth } from '../context/AuthContext'

const STATS = [
  { value: '12,450+', key: 'auth.statOps' },
  { value: '2,800+', key: 'auth.statVolunteers' },
  { value: '340+', key: 'auth.statNgos' },
  { value: '98.2%', key: 'auth.statResponse' },
]

const container = createStagger(0.08, 0.1)
const item = createListItem(20, 0.5)

const floatShape = {
  animate: {
    y: [0, -12, 0],
    rotate: [0, 3, -3, 0],
    transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' as const },
  },
}

const floatShape2 = {
  animate: {
    y: [0, 10, 0],
    rotate: [0, -2, 2, 0],
    transition: { duration: 8, repeat: Infinity, ease: 'easeInOut' as const },
  },
}

const markerPulse = {
  animate: {
    scale: [1, 1.3, 1],
    opacity: [0.8, 1, 0.8],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' as const },
  },
}

export default function Login() {
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
      {/* ── LEFT: Hero Panel ── */}
      <motion.div className="auth-hero" variants={item}>
        <div className="auth-hero-bg">
          <div className="auth-grid" />
          <div className="auth-glow auth-glow--1" />
          <div className="auth-glow auth-glow--2" />
          <div className="auth-glow auth-glow--3" />

          {/* Animated Map Markers */}
          <motion.div className="auth-marker" style={{ left: '22%', top: '30%' }} variants={markerPulse} animate="animate">
            <div className="auth-marker-dot auth-dot-danger" />
          </motion.div>
          <motion.div className="auth-marker" style={{ left: '55%', top: '42%' }} variants={markerPulse} animate="animate">
            <div className="auth-marker-dot auth-dot-warning" />
          </motion.div>
          <motion.div className="auth-marker" style={{ left: '70%', top: '25%' }} variants={markerPulse} animate="animate">
            <div className="auth-marker-dot auth-dot-accent" />
          </motion.div>
          <motion.div className="auth-marker" style={{ left: '38%', top: '60%' }} variants={markerPulse} animate="animate">
            <div className="auth-marker-dot auth-dot-success" />
          </motion.div>
          <motion.div className="auth-marker" style={{ left: '78%', top: '55%' }} variants={markerPulse} animate="animate">
            <div className="auth-marker-dot auth-dot-purple" />
          </motion.div>

          {/* Connecting lines */}
          <svg className="auth-lines" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
            <line x1="22%" y1="30%" x2="55%" y2="42%" stroke="rgba(14,165,233,0.15)" strokeWidth="1" />
            <line x1="55%" y1="42%" x2="70%" y2="25%" stroke="rgba(14,165,233,0.15)" strokeWidth="1" />
            <line x1="55%" y1="42%" x2="38%" y2="60%" stroke="rgba(14,165,233,0.15)" strokeWidth="1" />
            <line x1="55%" y1="42%" x2="78%" y2="55%" stroke="rgba(14,165,233,0.15)" strokeWidth="1" />
          </svg>
        </div>

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

          {/* Stats */}
          <motion.div className="auth-stats-grid" variants={item}>
            {STATS.map((s) => (
              <motion.div key={s.key} className="auth-stat" whileHover={{ scale: 1.05 }}>
                <div className="auth-stat-value">{s.value}</div>
                <div className="auth-stat-label">{t(s.key)}</div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div className="auth-mission" variants={item}>
            <Activity size={14} aria-hidden="true" />
            <span>{t('auth.mission')}</span>
          </motion.div>
        </div>
      </motion.div>

      {/* ── RIGHT: Login Card ── */}
      <motion.div className="auth-card-wrap" variants={item}>
        {/* Floating shapes */}
        <motion.div className="auth-float-shape auth-float-shape--1" variants={floatShape} animate="animate" />
        <motion.div className="auth-float-shape auth-float-shape--2" variants={floatShape2} animate="animate" />

        <motion.div className="auth-glass" variants={item}>
          <div className="auth-glass-inner">
            {/* Logo */}
            <motion.div className="auth-logo-wrap" variants={item}>
              <div className="auth-logo" aria-hidden="true">
                <MapPin size={22} />
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
              {error && <div className="error-text" id="login-error" role="alert">{error}</div>}

              <motion.div className="auth-field" variants={item}>
                <div className="auth-input-wrap">
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="auth-input"
                    placeholder=" "
                    aria-describedby={error ? "login-error" : undefined}
                    aria-invalid={error ? "true" : "false"} 
                  />
                  <label htmlFor="login-email" className="auth-label">{t('auth.email')}</label>
                </div>
              </motion.div>

              <motion.div className="auth-field" variants={item}>
                <div className="auth-input-wrap">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="auth-input"
                    placeholder=" "
                    aria-describedby={error ? 'login-error' : undefined}
                    aria-invalid={error ? 'true' : 'false'}
                    minLength={8}
                  />
                  <label htmlFor="login-password" className="auth-label">{t('auth.password')}</label>
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

              {/* Remember + Forgot */}
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
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <span className="flex items-center gap-sm justify-center">
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
    </motion.div>
  )
}
