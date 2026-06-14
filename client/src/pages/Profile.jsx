import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'

const SKILL_OPTIONS = ['Medical', 'Rescue', 'Logistics', 'Communication', 'Shelter', 'Food', 'Other']

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
  const [phone, setPhone] = useState(currentUser?.phone || '')
  const [skills, setSkills] = useState(currentUser?.skills || [])
  const [notifications, setNotifications] = useState(currentUser?.notifications || { email: true, sms: false })
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatar || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleUpdateName(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const payload = { displayName }
      if (phone) payload.phone = phone
      if (skills.length > 0) payload.skills = skills
      payload.notifications = notifications
      const data = await clientApi.updateProfileExtended(payload)
      const updated = { ...currentUser, ...data.user }
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
    if (newPassword !== confirmPassword) return setError('Passwords do not match')
    if (newPassword.length < 6) return setError('Password must be at least 6 characters')
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

  function toggleSkill(skill) {
    setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill])
  }

  return (
    <div className="container" style={{ maxWidth: 700, margin: '20px auto' }}>
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
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required style={{ width: '100%', marginBottom: 12 }} />

          <label className="small" style={{ display: 'block', marginBottom: 4 }}>Phone Number</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" style={{ width: '100%', marginBottom: 12 }} />

          <label className="small" style={{ display: 'block', marginBottom: 4 }}>Skills</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {SKILL_OPTIONS.map((s) => (
              <button key={s} type="button" onClick={() => toggleSkill(s)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4, border: '1px solid', cursor: 'pointer', ...(skills.includes(s) ? { background: 'var(--gov-blue)', color: 'white', borderColor: 'var(--gov-blue)' } : { background: 'white', color: '#666', borderColor: '#ddd' }) }}>
                {s}
              </button>
            ))}
          </div>

          <label className="small" style={{ display: 'block', marginBottom: 4 }}>Notification Preferences</label>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={notifications.email} onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })} /> Email
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={notifications.sms} onChange={(e) => setNotifications({ ...notifications, sms: e.target.checked })} /> SMS
            </label>
          </div>

          <button type="submit" className="btnPrimary" disabled={loading} style={{ fontSize: 13 }}>
            {loading ? '...' : t('profile.updateName')}
          </button>
        </form>
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--gov-blue)' }}>{t('profile.changePassword')}</h3>
        <form onSubmit={handleChangePassword}>
          <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('profile.currentPassword')}</label>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required style={{ width: '100%', marginBottom: 12 }} />
          <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('profile.newPassword')}</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required style={{ width: '100%', marginBottom: 12 }} />
          <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('profile.confirmPassword')}</label>
          <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={{ width: '100%', marginBottom: 12 }} />
          <button type="submit" className="btnPrimary" disabled={loading} style={{ fontSize: 13 }}>
            {loading ? '...' : t('profile.updatePassword')}
          </button>
        </form>
      </div>
    </div>
  )
}
