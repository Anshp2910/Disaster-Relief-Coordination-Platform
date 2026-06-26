import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { MapPin, ShieldCheck, Activity, Users, Eye, EyeOff, Loader2, GitBranch, Globe, User, Mail } from 'lucide-react'
import { clientApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

const STATS = [
  { value: '12,450+', label: 'Relief Operations' },
  { value: '2,800+', label: 'Active Volunteers' },
  { value: '340+', label: 'Partner NGOs' },
  { value: '98.2%', label: 'Response Rate' },
]

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

const floatShape = {
  animate: {
    y: [0, -12, 0],
    rotate: [0, 3, -3, 0],
    transition: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
  },
}

const floatShape2 = {
  animate: {
    y: [0, 10, 0],
    rotate: [0, -2, 2, 0],
    transition: { duration: 8, repeat: Infinity, ease: 'easeInOut' },
  },
}

const markerPulse = {
  animate: {
    scale: [1, 1.3, 1],
    opacity: [0.8, 1, 0.8],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
}

export default function Register() {
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
    <motion.div className="auth-split" variants={container} initial="hidden" animate="show">
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

          <svg className="auth-lines" viewBox="0 0 400 300" preserveAspectRatio="none">
            <line x1="22%" y1="30%" x2="55%" y2="42%" stroke="rgba(14,165,233,0.15)" strokeWidth="1" />
            <line x1="55%" y1="42%" x2="70%" y2="25%" stroke="rgba(14,165,233,0.15)" strokeWidth="1" />
            <line x1="55%" y1="42%" x2="38%" y2="60%" stroke="rgba(14,165,233,0.15)" strokeWidth="1" />
            <line x1="55%" y1="42%" x2="78%" y2="55%" stroke="rgba(14,165,233,0.15)" strokeWidth="1" />
          </svg>
        </div>

        <div className="auth-hero-content">
          <motion.div className="auth-emblem" variants={item}>
            <ShieldCheck size={28} />
          </motion.div>
          <motion.h1 className="auth-hero-title" variants={item}>
            Join the Network<br />Make a Difference
          </motion.h1>
          <motion.p className="auth-hero-sub" variants={item}>
            Register to coordinate disaster relief efforts, manage resources, and connect with volunteers and NGOs across the nation.
          </motion.p>

          <motion.div className="auth-stats-grid" variants={item}>
            {STATS.map((s) => (
              <motion.div key={s.label} className="auth-stat" whileHover={{ scale: 1.05 }}>
                <div className="auth-stat-value">{s.value}</div>
                <div className="auth-stat-label">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div className="auth-mission" variants={item}>
            <Users size={14} />
            <span>Join 2,800+ volunteers already on the platform</span>
          </motion.div>
        </div>
      </motion.div>

      {/* ── RIGHT: Register Card ── */}
      <motion.div className="auth-card-wrap" variants={item}>
        <motion.div className="auth-float-shape auth-float-shape--1" variants={floatShape} animate="animate" />
        <motion.div className="auth-float-shape auth-float-shape--2" variants={floatShape2} animate="animate" />

        <motion.div className="auth-glass" variants={item}>
          <div className="auth-glass-inner">
            {/* Logo */}
            <motion.div className="auth-logo-wrap" variants={item}>
              <div className="auth-logo">
                <MapPin size={22} />
              </div>
              <div>
                <div className="auth-logo-text">DisasterRelief</div>
                <div className="auth-logo-sub">Government of India</div>
              </div>
            </motion.div>

            <motion.h2 className="auth-title" variants={item}>{t('auth.registerTitle')}</motion.h2>

            {/* Social Login */}
            <motion.div className="auth-social" variants={item}>
              <button className="auth-social-btn" aria-label="Sign up with Google">
                <Globe size={18} /> Google
              </button>
              <button className="auth-social-btn" aria-label="Sign up with GitHub">
                <GitBranch size={18} /> GitHub
              </button>
            </motion.div>

            <motion.div className="auth-divider" variants={item}>
              <span>or continue with email</span>
            </motion.div>

            {/* Form */}
            <motion.form onSubmit={onSubmit} variants={item}>
              {error && <div className="errorText">{error}</div>}

              <motion.div className="auth-field" variants={item}>
                <div className="auth-input-wrap">
                  <input id="reg-name" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="auth-input" placeholder=" " />
                  <label htmlFor="reg-name" className="auth-label">Full name</label>
                  <User size={16} className="auth-input-icon" />
                </div>
              </motion.div>

              <motion.div className="auth-field" variants={item}>
                <div className="auth-input-wrap">
                  <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="auth-input" placeholder=" " />
                  <label htmlFor="reg-email" className="auth-label">Email address</label>
                  <Mail size={16} className="auth-input-icon" />
                </div>
              </motion.div>

              <motion.div className="auth-field" variants={item}>
                <div className="auth-input-wrap">
                  <input id="reg-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required className="auth-input" placeholder=" " />
                  <label htmlFor="reg-password" className="auth-label">Password</label>
                  <button type="button" className="auth-pw-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} tabIndex={-1}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </motion.div>

              <motion.div className="auth-field" variants={item}>
                <div className="auth-input-wrap">
                  <select id="reg-role" value={role} onChange={(e) => setRole(e.target.value)} required className="auth-input">
                    <option value="volunteer">{t('auth.volunteer')}</option>
                    <option value="ngo">{t('auth.ngo')}</option>
                  </select>
                  <label htmlFor="reg-role" className="auth-label">{t('auth.role')}</label>
                </div>
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
                    <Loader2 size={18} className="spinner" />
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
    </motion.div>
  )
}
