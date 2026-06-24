import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token, user } = await clientApi.login({ email, password })
      login(token, user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Login failed')
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
                  <stop offset="0%" stopColor="#5b9aff" />
                  <stop offset="100%" stopColor="#7c8df0" />
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
          <h2 className="pageTitle" style={{ textAlign: 'left', fontSize: 18 }}>{t('auth.loginTitle')}</h2>

          <form onSubmit={onSubmit} className="inputGrid">
            {error ? <div className="errorText">{error}</div> : null}

            <input
              placeholder={t('auth.email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
            <input
              placeholder={t('auth.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />

            <button disabled={loading} type="submit" className="btnPrimary">
              {loading ? t('auth.loggingIn') : t('auth.loginButton')}
            </button>
          </form>

          <p className="muted" style={{ marginTop: 20 }}>
            {t('auth.noAccount')}{' '}
            <a href="/register" onClick={(e) => (e.preventDefault(), navigate('/register'))}>
              {t('auth.registerLink')}
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
