import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clientApi } from '../api/client'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('volunteer')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { token, user } = await clientApi.register({ email, password, role, displayName })
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
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
          <h1 className="govt-app-title">DisasterRelief</h1>
          <p className="govt-app-slogan">Coordinating aid when it matters most</p>
          <hr className="govt-divider" />
          <h2 className="pageTitle" style={{ textAlign: 'left' }}>Register</h2>

          <form onSubmit={onSubmit} className="inputGrid">
            {error ? <div className="errorText">{error}</div> : null}

            <input
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              type="text"
              required
            />
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
            <input
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />

            <label className="gridGap" style={{ gap: 6 }}>
              <span className="small">Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
                style={{ width: '100%' }}
              >
                <option value="volunteer">Volunteer</option>
                <option value="ngo">NGO</option>
              </select>
            </label>

            <button disabled={loading} type="submit" className="btnPrimary">
              {loading ? 'Creating...' : 'Create account'}
            </button>
          </form>

          <p className="muted" style={{ marginTop: 16 }}>
            Already have an account?{' '}
            <a href="/login" onClick={(e) => (e.preventDefault(), navigate('/login'))}>
              Login
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
