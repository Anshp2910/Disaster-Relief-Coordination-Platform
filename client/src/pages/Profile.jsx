import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { clientApi } from '../api/client'

const SKILL_OPTIONS = ['Medical', 'Rescue', 'Logistics', 'Communication', 'Shelter', 'Food', 'Other']

export default function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentUser, updateUser } = useAuth()

  const [displayName, setDisplayName] = useState(currentUser?.displayName || '')
  const [phone, setPhone] = useState(currentUser?.phone || '')
  const [skills, setSkills] = useState(currentUser?.skills || [])
  const [notifications, setNotifications] = useState(currentUser?.notifications || { email: true, sms: false, newRequest: true, statusChange: true, newComment: true })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function toggleSkill(skill) {
    setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill])
  }

  async function handleUpdateProfile(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const payload = { displayName, notifications }
      if (phone) payload.phone = phone
      if (skills.length > 0) payload.skills = skills
      const data = await clientApi.updateProfile(payload)
      updateUser(data.user)
      setSuccess(t('profile.profileUpdated'))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (newPassword !== confirmPassword) {
      setError(t('profile.passwordsDoNotMatch'))
      return
    }
    if (newPassword.length < 6) {
      setError(t('profile.passwordTooShort'))
      return
    }
    setLoading(true)
    try {
      await clientApi.updateProfile({ currentPassword, newPassword })
      setSuccess(t('profile.passwordChanged'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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

      {/* Profile Info */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--gov-blue)' }}>{t('profile.accountInfo')}</h3>
        <div style={{ fontSize: 13, marginBottom: 8 }}>
          <span className="muted">{t('profile.email')}:</span> <strong>{currentUser?.email}</strong>
        </div>
        <div style={{ fontSize: 13, marginBottom: 16 }}>
          <span className="muted">{t('profile.role')}:</span> <strong>{t(`auth.${currentUser?.role}`) || currentUser?.role}</strong>
        </div>

        <form onSubmit={handleUpdateProfile}>
          <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('auth.displayName')}</label>
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required style={{ width: '100%', marginBottom: 12 }} />

          <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('profile.phone')}</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('profile.phonePlaceholder')} style={{ width: '100%', marginBottom: 12 }} />

          <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('profile.skills')}</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {SKILL_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSkill(s)}
                style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 4,
                  border: '1px solid', cursor: 'pointer',
                  ...(skills.includes(s)
                    ? { background: 'var(--gov-blue)', color: 'white', borderColor: 'var(--gov-blue)' }
                    : { background: 'white', color: '#666', borderColor: '#ddd' }),
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <label className="small" style={{ display: 'block', marginBottom: 4 }}>{t('profile.notificationPreferences')}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, fontSize: 13 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={notifications.email} onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })} /> {t('profile.emailNotification')}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={notifications.sms} onChange={(e) => setNotifications({ ...notifications, sms: e.target.checked })} /> {t('profile.smsNotification')}
              </label>
            </div>
            <div style={{ fontSize: 12, color: 'var(--gov-muted, #666)' }}>Event subscriptions:</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={notifications.newRequest !== false} onChange={(e) => setNotifications({ ...notifications, newRequest: e.target.checked })} /> {t('profile.notifyNewRequest') || 'New requests'}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={notifications.statusChange !== false} onChange={(e) => setNotifications({ ...notifications, statusChange: e.target.checked })} /> {t('profile.notifyStatusChange') || 'Status changes'}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={notifications.newComment !== false} onChange={(e) => setNotifications({ ...notifications, newComment: e.target.checked })} /> {t('profile.notifyNewComment') || 'New comments'}
              </label>
            </div>
          </div>

          <button type="submit" className="btnPrimary" disabled={loading} style={{ fontSize: 13 }}>
            {loading ? '...' : t('profile.updateName')}
          </button>
        </form>
      </div>

      {/* Change Password */}
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
