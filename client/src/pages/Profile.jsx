import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'

export default function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
  })()

  const [displayName, setDisplayName] = useState(currentUser?.displayName || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleUpdateName(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const data = await clientApi.updateProfile({ displayName })
      const updated = { ...currentUser, displayName: data.user.displayName }
      localStorage.setItem('user', JSON.stringify(updated))
      setSuccess('Profile updated successfully')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match')
    }
    if (newPassword.length < 6) {
      return setError('Password must be at least 6 characters')
    }
    setLoading(true)
    try {
      await clientApi.updateProfile({ currentPassword, newPassword })
      setSuccess('Password changed successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: 600 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="headerRow">
          <h2 className="pageTitle" style={{ fontSize: 20, margin: 0 }}>{t('profile.title')}</h2>
          <button onClick={() => navigate('/dashboard')}>{t('admin.backToDashboard')}</button>
        </div>
      </div>

      {error && <div className="card"><div className="errorText">{error}</div></div>}
      {success && <div className="card"><div style={{ color: '#138808', fontSize: 13 }}>{success}</div></div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--gov-blue)' }}>{t('profile.accountInfo')}</h3>
        <div style={{ fontSize: 13, marginBottom: 8 }}>
          <span className="muted">Email:</span> <strong>{currentUser?.email}</strong>
        </div>
        <div style={{ fontSize: 13, marginBottom: 16 }}>
          <span className="muted">Role:</span> <strong>{t(`auth.${currentUser?.role}`) || currentUser?.role}</strong>
        </div>

        <form onSubmit={handleUpdateName}>
          <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('auth.displayName')}</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            style={{ width: '100%', marginBottom: 12 }}
          />
          <button type="submit" className="btnPrimary" disabled={loading} style={{ fontSize: 13 }}>
            {loading ? '...' : t('profile.updateName')}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--gov-blue)' }}>{t('profile.changePassword')}</h3>
        <form onSubmit={handleChangePassword}>
          <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('profile.currentPassword')}</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            style={{ width: '100%', marginBottom: 12 }}
          />
          <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('profile.newPassword')}</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            style={{ width: '100%', marginBottom: 12 }}
          />
          <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('profile.confirmPassword')}</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{ width: '100%', marginBottom: 12 }}
          />
          <button type="submit" className="btnPrimary" disabled={loading} style={{ fontSize: 13 }}>
            {loading ? '...' : t('profile.updatePassword')}
          </button>
        </form>
      </div>
    </div>
  )
}
