import { useState, useMemo, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { createStagger, createListItem } from '../utils/animations'
import { ShieldCheck, Users, Eye, EyeOff, Loader2, GitBranch, Globe, User, Mail } from 'lucide-react'
import { clientApi, API_BASE } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { evaluatePasswordStrength } from '../utils/passwordStrength'

const STATS = [
  { value: '12,450+', key: 'auth.statOps' },
  { value: '2,800+', key: 'auth.statVolunteers' },
  { value: '340+', key: 'auth.statNgos' },
  { value: '98.2%', key: 'auth.statResponse' },
]

const container = createStagger(0.08, 0.1)
const item = createListItem(20, 0.5)

export default function Register() {
  useEffect(() => { document.title = 'Disaster Relief - Register' }, [])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState('volunteer')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { login } = useAuth()

  function handleSocialLogin(provider: 'google' | 'github') {
    window.location.href = `${API_BASE}/api/auth/${provider}`
  }

  const strength = useMemo(() => {
    const result = evaluatePasswordStrength(password)
    return result ? { className: result.className, labelKey: result.labelKey } : null
  }, [password])

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
      setError(e.message || t('common.registerFailed'))
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
            {t('auth.registerHeroTitle')}
          </motion.h1>
          <motion.p className="auth-hero-sub" variants={item}>
            {t('auth.registerHeroSub')}
          </motion.p>

          <motion.div className="auth-hero-stats" variants={item}>
            {STATS.map((s) => (
              <motion.div key={s.key} className="auth-hero-stat">
                <div className="auth-hero-stat-value">{s.value}</div>
                <div className="auth-hero-stat-label">{t(s.key)}</div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div className="auth-hero-mission" variants={item}>
            <Users size={14} aria-hidden="true" />
            <span>{t('auth.registerMission')}</span>
          </motion.div>
        </div>
      </motion.div>

      {/* ── RIGHT: Register Card ── */}
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

          <motion.h2 className="auth-title" variants={item}>{t('auth.registerTitle')}</motion.h2>

          {/* Social Login */}
          <motion.div className="auth-social" variants={item}>
            <button className="auth-social-btn" aria-label={t('auth.signUpWithGoogle')} onClick={() => handleSocialLogin('google')}>
              <Globe size={18} aria-hidden="true" /> Google
            </button>
            <button className="auth-social-btn" aria-label={t('auth.signUpWithGitHub')} onClick={() => handleSocialLogin('github')}>
              <GitBranch size={18} aria-hidden="true" /> GitHub
            </button>
          </motion.div>

          <motion.div className="auth-divider" variants={item}>
            <span>{t('auth.orEmail')}</span>
          </motion.div>

          {/* Form */}
          <motion.form onSubmit={onSubmit} variants={item}>
            {error && <div className="auth-error" id="register-error" role="alert">{error}</div>}

            <motion.div className="auth-field" variants={item}>
              <label htmlFor="reg-name" className="auth-label">{t('auth.fullName')}</label>
              <div className="auth-input-wrap">
                <input id="reg-name" name="name" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={50} autoComplete="name" className="auth-input" placeholder={t('auth.fullName')} aria-describedby={error ? 'register-error' : undefined} />
                <User size={16} className="auth-input-icon" aria-hidden="true" />
              </div>
            </motion.div>

            <motion.div className="auth-field" variants={item}>
              <label htmlFor="reg-email" className="auth-label">{t('auth.email')}</label>
              <div className="auth-input-wrap">
                <input id="reg-email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={128} autoComplete="email" className="auth-input" placeholder={t('auth.email')} aria-describedby={error ? 'register-error' : undefined} />
                <Mail size={16} className="auth-input-icon" aria-hidden="true" />
              </div>
            </motion.div>

            <motion.div className="auth-field" variants={item}>
              <label htmlFor="reg-password" className="auth-label">{t('auth.password')}</label>
              <div className="auth-input-wrap">
                <input id="reg-password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={128} autoComplete="new-password" className="auth-input" placeholder={t('auth.password')} aria-describedby={error ? 'register-error' : undefined} />
                <button type="button" className="auth-pw-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')} tabIndex={0}>
                  {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            </motion.div>

            {strength && (
              <motion.div variants={item}>
                <div className="password-strength">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`password-strength-bar ${strength.className}`} />
                  ))}
                </div>
                <div className="password-strength-label">{t(strength.labelKey)}</div>
              </motion.div>
            )}

            <motion.div className="auth-field" variants={item}>
              <label htmlFor="reg-role" className="auth-label">{t('auth.role')}</label>
              <div className="auth-input-wrap">
                <select id="reg-role" value={role} onChange={(e) => setRole(e.target.value)} required className="auth-input">
                  <option value="volunteer">{t('auth.volunteer')}</option>
                  <option value="ngo">{t('auth.ngo')}</option>
                </select>
              </div>
            </motion.div>

            <motion.button
              disabled={loading}
              type="submit"
              className="auth-submit"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-sm">
                  <Loader2 size={18} className="spinner" aria-hidden="true" />
                  {t('auth.creating')}
                </span>
              ) : t('auth.createAccount')}
            </motion.button>
          </motion.form>

          <motion.div className="auth-alt" variants={item}>
            {t('auth.hasAccount')} <Link to="/login">{t('auth.loginLink')}</Link>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  )
}
