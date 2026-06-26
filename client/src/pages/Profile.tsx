import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { User, Camera, Save, Shield, Bell, Key, Award, Mail, Phone, MapPin } from 'lucide-react'
import { PageHeader, ErrorState } from '../components/ui'
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
  const [skills, setSkills] = useState<string[]>(user?.skills || [])
  const [notifications, setNotifications] = useState<Record<string, boolean>>(() => {
    const n = (user?.notifications as Record<string, boolean>) || {}
    return { email: true, sms: false, newRequest: true, statusChange: true, newComment: true, ...n }
  })
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => localStorage.getItem('avatarUrl'))
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleAvatarClick() {
    fileInputRef.current?.click()
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setAvatarUrl(URL.createObjectURL(file))
    }
  }

  function handleUploadAvatar() {
    if (avatarUrl) {
      localStorage.setItem('avatarUrl', avatarUrl)
      toast.success('Avatar updated')
      setSelectedFile(null)
    }
  }

  function handleRemoveAvatar() {
    setAvatarUrl(null)
    setSelectedFile(null)
    localStorage.removeItem('avatarUrl')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function toggleSkill(skill: string) {
    setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill])
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: Record<string, unknown> = { displayName, notifications }
      if (phone) payload.phone = phone
      if (skills.length > 0) payload.skills = skills
      const data = (await clientApi.updateProfile(payload)) as { user: Record<string, unknown> }
      updateUser(data.user)
      toast.success(t('profile.profileUpdated'))
    } catch (err) {
      const e = err as Error
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
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
      const e = err as Error
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      className="container max-w-sm mt-lg mb-lg"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="card mb-lg">
        <PageHeader
          title={t('profile.title')}
          actions={<button onClick={() => navigate('/dashboard')} aria-label={t('admin.backToDashboard')}>{t('admin.backToDashboard')}</button>}
        />
      </div>

      <motion.div
        className="card mb-lg"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="flex flex-col flex-align-center mb-lg">
          <div
            onClick={handleAvatarClick}
            role="button"
            tabIndex={0}
            aria-label="Upload avatar photo"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAvatarClick() }}
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: avatarUrl ? `url(${avatarUrl}) center/cover no-repeat` : 'var(--accent-blue-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              fontSize: 32,
              color: '#fff',
              fontWeight: 700,
            }}
          >
            {!avatarUrl && (user?.displayName?.[0]?.toUpperCase() || 'U')}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '50%',
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Camera size={14} />
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <div className="flex flex-gap-sm mt-sm">
            <button type="button" className="btnPrimary text-xs" onClick={handleUploadAvatar} disabled={!selectedFile} aria-label="Upload photo">
              Upload Photo
            </button>
            <button type="button" className="text-xs" onClick={handleRemoveAvatar} disabled={!avatarUrl} aria-label="Remove photo">
              Remove Photo
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="card mb-lg"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="m-0 mb text-base text-accent-blue flex items-center gap-xs">
          <User size={16} aria-hidden="true" />
          {t('profile.accountInfo')}
        </h3>
        <div className="text-sm mb-sm flex items-center gap-xs">
          <Mail size={14} className="text-muted" aria-hidden="true" />
          <span className="muted">{t('profile.email')}:</span> <strong>{user?.email}</strong>
        </div>
        <div className="text-sm mb-lg flex items-center gap-xs">
          <Shield size={14} className="text-muted" aria-hidden="true" />
          <span className="muted">{t('profile.role')}:</span> <strong>{t(`auth.${user?.role}` as any) || user?.role}</strong>
        </div>

        <form onSubmit={handleUpdateProfile}>
          <label className="small label-block" htmlFor="prof-name">{t('auth.displayName')}</label>
          <input id="prof-name" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="w-full mb" />

          <label className="small label-block" htmlFor="prof-phone">{t('profile.phone')}</label>
          <input id="prof-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t('profile.phonePlaceholder')} className="w-full mb" />

          <label className="small label-block flex items-center gap-xs">
            <Award size={14} aria-hidden="true" />
            {t('profile.skills')}
          </label>
          <div className="flex flex-gap-xs flex-wrap mb">
            {SKILL_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSkill(s)}
                className={`filter-pill ${skills.includes(s) ? 'active' : ''}`}
                aria-label={`${t('profile.skills')}: ${s}`}
              >
                {s}
              </button>
            ))}
          </div>

          <label className="small label-block flex items-center gap-xs">
            <Bell size={14} aria-hidden="true" />
            {t('profile.notificationPreferences')}
          </label>
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

          <button type="submit" className="btnPrimary text-13 flex items-center gap-xs" disabled={loading}>
            <Save size={16} aria-hidden="true" />
            {loading ? '...' : t('profile.updateProfile')}
          </button>
        </form>
      </motion.div>

      <motion.div
        className="card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h3 className="m-0 mb text-base text-accent-blue flex items-center gap-xs">
          <Key size={16} aria-hidden="true" />
          {t('profile.changePassword')}
        </h3>
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
      </motion.div>
    </motion.div>
  )
}