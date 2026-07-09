import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { createStagger } from '../utils/animations'
import { ShieldCheck, Users, Eye, EyeOff, Loader2, GitBranch, Globe, User, Mail } from 'lucide-react'
import { clientApi, API_BASE } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { evaluatePasswordStrength } from '../utils/passwordStrength'

const FALLBACK_STATS = [
  { value: '12,450+', key: 'auth.statOps' },
  { value: '2,800+', key: 'auth.statVolunteers' },
  { value: '340+', key: 'auth.statNgos' },
  { value: '98.2%', key: 'auth.statResponse' },
]

const container = createStagger(0.08, 0.1)

const CSS_CLASS_MAP: Record<string, string> = {
  weak: 'weak',
  medium: 'good',
  strong: 'strong',
  'very-strong': 'strong',
}

export default function Register() {
  useEffect(() => { document.title = 'Disaster Relief - Register' }, [])
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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState('')
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
    return result ? { className: CSS_CLASS_MAP[result.className] || result.className, labelKey: result.labelKey } : null
  }, [password])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'))
      return
    }
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
      {/* ── LEFT: Hero Panel ── */}
      <div className="auth-hero">
        <div className="auth-hero-content">
          <div className="auth-emblem" aria-hidden="true">
            <ShieldCheck size={28} />
          </div>
          <h1 className="auth-hero-title">{t('auth.registerHeroTitle')}</h1>
          <p className="auth-hero-sub">{t('auth.registerHeroSub')}</p>

          <div className="auth-hero-stats">
            {liveStats.map((s) => (
              <div key={s.key} className="auth-hero-stat">
                <div className="auth-hero-stat-value">{s.value}</div>
                <div className="auth-hero-stat-label">{t(s.key)}</div>
              </div>
            ))}
          </div>

          <div className="auth-hero-mission flex items-center gap-sm">
            <Users size={14} aria-hidden="true" />
            <span>{t('auth.registerMission')}</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Register Card ── */}
      <div className="auth-card-wrap">
        <div className="auth-card-inner">
          <div className="flex items-center gap-sm mb-xl">
            <div className="auth-logo-wrap"><div className="auth-logo" aria-hidden="true"><ShieldCheck size={22} /></div></div>
            <div>
              <div className="auth-logo-text">{t('auth.appName')}</div>
              <div className="auth-logo-sub">{t('auth.govtOfIndia')}</div>
            </div>
          </div>

          <h2 className="auth-title">{t('auth.registerTitle')}</h2>

          <div className="auth-social grid-2 mb-lg">
            <button className="auth-social-btn" aria-label={t('auth.signUpWithGoogle')} onClick={() => handleSocialLogin('google')}>
              <Globe size={18} aria-hidden="true" /> Google
            </button>
            <button className="auth-social-btn" aria-label={t('auth.signUpWithGitHub')} onClick={() => handleSocialLogin('github')}>
              <GitBranch size={18} aria-hidden="true" /> GitHub
            </button>
          </div>

          <div className="auth-divider"><span>{t('auth.orEmail')}</span></div>

          <form onSubmit={onSubmit}>
            {error && <div className="auth-error animate-shake" id="register-error" role="alert">{error}</div>}

            <div className="auth-field">
              <label htmlFor="reg-name" className="auth-label">{t('auth.fullName')}</label>
              <div className="auth-input-wrap">
                <input id="reg-name" name="name" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required maxLength={50} autoComplete="name" className="auth-input" placeholder={t('auth.fullName')} aria-describedby={error ? 'register-error' : undefined} />
                <User size={16} className="auth-input-icon" aria-hidden="true" />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-email" className="auth-label">{t('auth.email')}</label>
              <div className="auth-input-wrap">
                <input id="reg-email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={128} autoComplete="email" className="auth-input" placeholder={t('auth.email')} aria-describedby={error ? 'register-error' : undefined} />
                <Mail size={16} className="auth-input-icon" aria-hidden="true" />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-password" className="auth-label">{t('auth.password')}</label>
              <div className="auth-input-wrap">
                <input id="reg-password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={128} autoComplete="new-password" className="auth-input" placeholder={t('auth.password')} aria-describedby={error ? 'register-error' : undefined} />
                <button type="button" className="auth-pw-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')} tabIndex={0}>
                  {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            </div>

            {strength && (
              <div className="mb-sm">
                <div className="password-strength">
                  <div className="password-strength-bar">
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className={strength.className} />
                    ))}
                  </div>
                </div>
                <div className={`password-strength-label ${strength.className}`}>{t(strength.labelKey)}</div>
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="reg-confirm-password" className="auth-label">{t('auth.confirmPassword')}</label>
              <div className="auth-input-wrap">
                <input id="reg-confirm-password" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} maxLength={128} autoComplete="new-password" className="auth-input" placeholder={t('auth.confirmPassword')} aria-describedby={error ? 'register-error' : undefined} />
                <button type="button" className="auth-pw-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')} tabIndex={0}>
                  {showConfirmPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="reg-role" className="auth-label">{t('auth.role')}</label>
              <div className="auth-input-wrap">
                <select id="reg-role" value={role} onChange={(e) => setRole(e.target.value)} required className="auth-input">
                  <option value="volunteer">{t('auth.volunteer')}</option>
                  <option value="ngo">{t('auth.ngo')}</option>
                </select>
              </div>
            </div>

            <button disabled={loading} type="submit" className="auth-submit">
              {loading ? (
                <span className="flex items-center justify-center gap-sm">
                  <Loader2 size={18} className="spinner" aria-hidden="true" />
                  {t('auth.creating')}
                </span>
              ) : t('auth.createAccount')}
            </button>
          </form>

          <div className="auth-alt">
            {t('auth.hasAccount')} <Link to="/login">{t('auth.loginLink')}</Link>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
