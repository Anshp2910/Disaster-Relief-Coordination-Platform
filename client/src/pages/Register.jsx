import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token, user } = await clientApi.register({ email, password, role, displayName })
      login(token, user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Register failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-split">
      <div className="login-hero">
        <div className="login-hero-bg">
          <div className="login-shape login-shape--1" />
          <div className="login-shape login-shape--2" />
          <div className="login-shape login-shape--3" />
        </div>
        <div className="login-hero-content">
          <div className="login-emblem">
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="36" cy="36" r="33" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.5" />
              <circle cx="36" cy="36" r="22" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.3" />
              <circle cx="36" cy="36" r="8" fill="currentColor" opacity="0.8" />
              {Array.from({ length: 24 }).map((_, i) => {
                const a = (i * 15 * Math.PI) / 180
                return (
                  <line key={i} x1={36} y1={36} x2={36 + 28 * Math.sin(a)} y2={36 - 28 * Math.cos(a)} stroke="currentColor" strokeWidth="0.6" opacity="0.35" />
                )
              })}
            </svg>
          </div>
          <h1 className="login-hero-title">{t('auth.appName')}</h1>
          <p className="login-hero-slogan">{t('auth.slogan')}</p>
          <div className="login-hero-features">
            <div className="login-hero-feature">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>Real-time disaster tracking</span>
            </div>
            <div className="login-hero-feature">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
              <span>Resource coordination hub</span>
            </div>
            <div className="login-hero-feature">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>Multi-agency collaboration</span>
            </div>
          </div>
        </div>
      </div>

      <div className="login-auth">
        <div className="login-auth-card">
          <div className="login-auth-header">
            <h2 className="login-auth-title">{t('auth.registerTitle')}</h2>
            <p className="login-auth-subtitle">{t('auth.registerSubtitle') || 'Create a new account'}</p>
          </div>
          <form onSubmit={onSubmit} className="login-auth-form">
            {error ? <div className="errorText">{error}</div> : null}
            <div className="login-field">
              <label htmlFor="reg-name" className="login-label">{t('auth.displayName')}</label>
              <input id="reg-name" placeholder={t('auth.displayName')} value={displayName} onChange={(e) => setDisplayName(e.target.value)} type="text" required className="login-input" />
            </div>
            <div className="login-field">
              <label htmlFor="reg-email" className="login-label">{t('auth.email')}</label>
              <input id="reg-email" placeholder={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="login-input" />
            </div>
            <div className="login-field">
              <label htmlFor="reg-password" className="login-label">{t('auth.password')}</label>
              <input id="reg-password" placeholder={t('auth.password')} value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="login-input" />
            </div>
            <div className="login-field">
              <label htmlFor="reg-role" className="login-label">{t('auth.role')}</label>
              <select id="reg-role" value={role} onChange={(e) => setRole(e.target.value)} required className="login-input login-select">
                <option value="volunteer">{t('auth.volunteer')}</option>
                <option value="ngo">{t('auth.ngo')}</option>
              </select>
            </div>
            <button disabled={loading} type="submit" className="login-btn">
              {loading ? (
                <span className="login-btn-loading">
                  <span className="login-spinner" />
                  {t('auth.creating')}
                </span>
              ) : t('auth.createAccount')}
            </button>
          </form>
          <p className="login-footer-text">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="login-link">
              {t('auth.loginLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
