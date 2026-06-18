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
            <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="25" cy="25" r="22" stroke="#000080" strokeWidth="2.5" fill="none" />
              <circle cx="25" cy="25" r="5" fill="#000080" />
              {[...Array(24)].map((_, i) => {
                const angle = (i * 15 * Math.PI) / 180
                return (
                  <line
                    key={i}
                    x1={25}
                    y1={25}
                    x2={25 + 20 * Math.sin(angle)}
                    y2={25 - 20 * Math.cos(angle)}
                    stroke="#000080"
                    strokeWidth="1"
                  />
                )
              })}
            </svg>
          </div>
          <h1 className="govt-app-title">{t('auth.appName')}</h1>
          <p className="govt-app-slogan">{t('auth.slogan')}</p>
          <hr className="govt-divider" />
          <h2 className="pageTitle" style={{ textAlign: 'left' }}>{t('auth.registerTitle')}</h2>

          <form onSubmit={onSubmit} className="inputGrid">
            {error ? <div className="errorText">{error}</div> : null}

            <input
              placeholder={t('auth.displayName')}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              type="text"
              required
            />
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

            <label className="gridGap" style={{ gap: 6 }}>
              <span className="small">{t('auth.role')}</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                style={{ width: '100%' }}
              >
                <option value="volunteer">{t('auth.volunteer')}</option>
                <option value="ngo">{t('auth.ngo')}</option>
              </select>
            </label>

            <button disabled={loading} type="submit" className="btnPrimary">
              {loading ? t('auth.creating') : t('auth.createAccount')}
            </button>
          </form>

          <p className="muted" style={{ marginTop: 16 }}>
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
