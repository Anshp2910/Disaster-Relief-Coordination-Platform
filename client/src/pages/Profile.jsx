import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { clientApi } from '../api/client'

const SKILL_OPTIONS = ['Medical', 'Rescue', 'Logistics', 'Communication', 'Shelter', 'Food', 'Other']

export default function Profile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const toast = useToast()

  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [skills, setSkills] = useState(user?.skills || [])
  const [notifications, setNotifications] = useState(() => {
    const n = user?.notifications || {}
    return { email: true, sms: false, newRequest: true, statusChange: true, newComment: true, ...n }
  })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  function toggleSkill(skill) {
    setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill])
  }

  async function handleUpdateProfile(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = { displayName, notifications }
      if (phone) payload.phone = phone
      if (skills.length > 0) payload.skills = skills
      const data = await clientApi.updateProfile(payload)
      updateUser(data.user)
      toast.success(t('profile.profileUpdated'))
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error(t('profile.passwordsDoNotMatch'))
      return
    }
    if (newPassword.length < 6) {
      toast.error(t('profile.passwordTooShort'))
      return
    }
    setLoading(true)
    try {
      await clientApi.updateProfile({ currentPassword, newPassword })
      toast.success(t('profile.passwordChanged'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container max-w-sm mt-lg mb-lg">
      <div className="card mb-lg">
        <div className="headerRow">
          <h2 className="pageTitle text-2xl m-0">{t('profile.title')}</h2>
          <button onClick={() => navigate('/dashboard')}>{t('admin.backToDashboard')}</button>
        </div>
      </div>

      {/* Profile Info */}
      <div className="card mb-lg">
        <h3 className="m-0 mb text-base text-accent-blue">{t('profile.accountInfo')}</h3>
        <div className="text-sm mb-sm">
          <span className="muted">{t('profile.email')}:</span> <strong>{user?.email}</strong>
        </div>
        <div className="text-sm mb-lg">
          <span className="muted">{t('profile.role')}:</span> <strong>{t(`auth.${user?.role}`) || user?.role}</strong>
        </div>

        <form onSubmit={handleUpdateProfile}>
          <label className="small label-block" htmlFor="prof-name">{t('auth.displayName')}</label>
          <input id="prof-name" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="w-full mb" />

          <label className="small label-block" htmlFor="prof-phone">{t('profile.phone')}</label>
          <input id="prof-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('profile.phonePlaceholder')} className="w-full mb" />

          <label className="small label-block">{t('profile.skills')}</label>
          <div className="flex flex-gap-xs flex-wrap mb">
            {SKILL_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSkill(s)}
                className={`filter-pill ${skills.includes(s) ? 'active' : ''}`}
              >
                {s}
              </button>
            ))}
          </div>

          <label className="small label-block">{t('profile.notificationPreferences')}</label>
          <div className="flex-col flex-gap-sm mb-lg text-sm">
            <div className="flex flex-gap-lg">
              <label className="flex flex-gap-xs cursor-pointer">
                <input type="checkbox" checked={!!notifications.email} onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })} /> {t('profile.emailNotification')}
              </label>
              <label className="flex flex-gap-xs cursor-pointer">
                <input type="checkbox" checked={!!notifications.sms} onChange={(e) => setNotifications({ ...notifications, sms: e.target.checked })} /> {t('profile.smsNotification')}
              </label>
            </div>
            <div className="text-sm text-muted-extra">{t('profile.eventSubscriptions')}</div>
            <div className="flex flex-gap-lg flex-wrap">
              <label className="flex flex-gap-xs cursor-pointer">
                <input type="checkbox" checked={notifications.newRequest !== false} onChange={(e) => setNotifications({ ...notifications, newRequest: e.target.checked })} /> {t('profile.notifyNewRequest')}
              </label>
              <label className="flex flex-gap-xs cursor-pointer">
                <input type="checkbox" checked={notifications.statusChange !== false} onChange={(e) => setNotifications({ ...notifications, statusChange: e.target.checked })} /> {t('profile.notifyStatusChange')}
              </label>
              <label className="flex flex-gap-xs cursor-pointer">
                <input type="checkbox" checked={notifications.newComment !== false} onChange={(e) => setNotifications({ ...notifications, newComment: e.target.checked })} /> {t('profile.notifyNewComment')}
              </label>
            </div>
          </div>

          <button type="submit" className="btnPrimary text-13" disabled={loading}>
            {loading ? '...' : t('profile.updateProfile')}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card">
        <h3 className="m-0 mb text-base text-accent-blue">{t('profile.changePassword')}</h3>
        <form onSubmit={handleChangePassword}>
          <label className="small label-block" htmlFor="prof-curpwd">{t('profile.currentPassword')}</label>
          <input id="prof-curpwd" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="w-full mb" />

          <label className="small label-block" htmlFor="prof-newpwd">{t('profile.newPassword')}</label>
          <input id="prof-newpwd" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full mb" />

          <label className="small label-block" htmlFor="prof-confpwd">{t('profile.confirmPassword')}</label>
          <input id="prof-confpwd" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full mb" />

          <button type="submit" className="btnPrimary text-13" disabled={loading}>
            {loading ? '...' : t('profile.updatePassword')}
          </button>
        </form>
      </div>
    </div>
  )
}
