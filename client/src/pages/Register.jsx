import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
    <div className="govt-auth-wrapper">
      <div className="govt-auth-card">
        <div className="card">
          <div className="govt-emblem">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="emblemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
              </defs>
              <circle cx="28" cy="28" r="25" stroke="url(#emblemGrad)" strokeWidth="2" fill="none" opacity="0.6" />
              <circle cx="28" cy="28" r="18" stroke="url(#emblemGrad)" strokeWidth="1" fill="none" opacity="0.3" />
              <circle cx="28" cy="28" r="5" fill="url(#emblemGrad)" />
              {[...Array(24)].map((_, i) => {
                const angle = (i * 15 * Math.PI) / 180
                return (
                  <line
                    key={i}
                    x1={28}
                    y1={28}
                    x2={28 + 22 * Math.sin(angle)}
                    y2={28 - 22 * Math.cos(angle)}
                    stroke="url(#emblemGrad)"
                    strokeWidth="0.8"
                    opacity="0.4"
                  />
                )
              })}
            </svg>
          </div>
          <h1 className="govt-app-title">{t('auth.appName')}</h1>
          <p className="govt-app-slogan">{t('auth.slogan')}</p>
          <hr className="govt-divider" />
          <h2 className="pageTitle text-left text-xl">{t('auth.registerTitle')}</h2>

          <form onSubmit={onSubmit} className="inputGrid">
            {error ? <div className="errorText">{error}</div> : null}

            <label htmlFor="reg-name" className="sr-only">{t('auth.displayName')}</label>
            <input
              id="reg-name"
              placeholder={t('auth.displayName')}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              type="text"
              required
            />
            <label htmlFor="reg-email" className="sr-only">{t('auth.email')}</label>
            <input
              id="reg-email"
              placeholder={t('auth.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
            <label htmlFor="reg-password" className="sr-only">{t('auth.password')}</label>
            <input
              id="reg-password"
              placeholder={t('auth.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />

            <label className="gridGap gap-6">
              <span className="small">{t('auth.role')}</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                className="w-full"
              >
                <option value="volunteer">{t('auth.volunteer')}</option>
                <option value="ngo">{t('auth.ngo')}</option>
              </select>
            </label>

            <button disabled={loading} type="submit" className="btnPrimary">
              {loading ? t('auth.creating') : t('auth.createAccount')}
            </button>
          </form>

          <p className="muted mt-lg">
            {t('auth.hasAccount')}{' '}
            <a href="/login" onClick={(e) => (e.preventDefault(), navigate('/login'))}>
              {t('auth.loginLink')}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
