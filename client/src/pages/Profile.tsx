import { useState, useRef, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { User, Camera, Save, Shield, Bell, Key, Award, Mail } from 'lucide-react'
import { PageHeader, RippleBtn, PageTransition } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { clientApi } from '../api/client'
import { evaluatePasswordStrength } from '../utils/passwordStrength'
import { getErrorMessage } from '../utils/getErrorMessage'

export default function Profile() {
  useEffect(() => { document.title = 'Disaster Relief - Profile' }, [])
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const toast = useToast()
  const SKILL_OPTIONS = useMemo(() => [
    t('profile.skillMedical'), t('profile.skillRescue'), t('profile.skillLogistics'),
    t('profile.skillCommunication'), t('profile.skillShelter'), t('profile.skillFood'), t('profile.skillOther'),
  ], [t])

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

  async function handleUploadAvatar() {
    if (!selectedFile) return
    setLoading(true)
    try {
      // Resize image client-side before upload (max 500px width/height)
      let fileToUpload = selectedFile
      if (selectedFile.type.startsWith('image/')) {
        fileToUpload = await new Promise<File>((resolve) => {
          const img = new Image()
          img.onload = () => {
            const maxDim = 500
            let { width, height } = img
            if (width > maxDim || height > maxDim) {
              const ratio = Math.min(maxDim / width, maxDim / height)
              width = Math.round(width * ratio)
              height = Math.round(height * ratio)
            }
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(img, 0, 0, width, height)
            URL.revokeObjectURL(img.src)
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(new File([blob], selectedFile.name, { type: 'image/jpeg', lastModified: Date.now() }))
              } else {
                resolve(selectedFile)
              }
            }, 'image/jpeg', 0.85)
          }
          img.src = URL.createObjectURL(selectedFile)
        })
      }

      const b64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(fileToUpload)
      })
      const data = await clientApi.updateProfile({ avatar: b64 }) as { user: Record<string, unknown> }
      updateUser(data.user)
      const avatarStr = data.user?.avatar as string || b64
      localStorage.setItem('avatarUrl', avatarStr)
      setAvatarUrl(avatarStr)
      toast.success(t('profile.avatarUpdated'))
      setSelectedFile(null)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  function handleRemoveAvatar() {
    setAvatarUrl(null)
    setSelectedFile(null)
    localStorage.removeItem('avatarUrl')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const newPasswordStrength = useMemo(() => {
    const result = evaluatePasswordStrength(newPassword)
    return result ? { className: result.className, label: t(result.labelKey) } : null
  }, [newPassword, t])

  function toggleSkill(skill: string) {
    setSkills((prev) => prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill])
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload: Record<string, unknown> = { displayName, notifications, phone: phone || '', skills }
      const data = (await clientApi.updateProfile(payload)) as { user: Record<string, unknown> }
      updateUser(data.user)
      toast.success(t('profile.profileUpdated'))
    } catch (err) {
      toast.error(getErrorMessage(err))
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
    setLoading(true)
    try {
      await clientApi.updateProfile({ currentPassword, newPassword })
      toast.success(t('profile.passwordChanged'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageTransition>
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
            aria-label={t('profile.uploadAvatar') || 'Upload avatar photo'}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAvatarClick() }}
            className={`avatar-circle ${avatarUrl ? '' : 'avatar-circle-initial'}`}
            style={avatarUrl ? { background: `url(${avatarUrl}) center/cover no-repeat` } : undefined}
          >
            {!avatarUrl && (user?.displayName?.[0]?.toUpperCase() || 'U')}
            <div className="avatar-camera-overlay" aria-hidden="true">
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
            <RippleBtn type="button" className="text-xs" onClick={handleUploadAvatar} disabled={!selectedFile} aria-label="Upload photo">
              {t('profile.uploadPhoto')}
            </RippleBtn>
            <button type="button" className="text-xs" onClick={handleRemoveAvatar} disabled={!avatarUrl} aria-label={t('profile.removePhoto')}>
              {t('profile.removePhoto')}
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
        <h3 className="m-0 mb text-base text-accent flex items-center gap-xs">
          <User size={16} aria-hidden="true" />
          {t('profile.accountInfo')}
        </h3>
        <div className="text-sm mb-sm flex items-center gap-xs">
          <Mail size={14} className="text-muted" aria-hidden="true" />
          <span className="muted">{t('profile.email')}</span> <strong>{user?.email}</strong>
        </div>
        <div className="text-sm mb-lg flex items-center gap-xs">
          <Shield size={14} className="text-muted" aria-hidden="true" />
          <span className="muted">{t('profile.role')}</span> <strong>{t(`auth.${user?.role}` as string) || user?.role}</strong>
        </div>

        <form onSubmit={handleUpdateProfile}>
          <div className="ff-group">
            <div className={`ff-wrap ${displayName ? 'ff-focused' : ''}`}>
              <input
                id="prof-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={50}
                className={`ff-input ${displayName ? 'ff-input-filled' : ''}`}
                placeholder={t('auth.displayName')}
              />
              <label htmlFor="prof-name" className={`ff-label ${displayName ? 'ff-label-float' : ''}`}>
                {t('auth.displayName')}
              </label>
            </div>
          </div>

          <div className="ff-group">
            <div className={`ff-wrap ${phone ? 'ff-focused' : ''}`}>
              <input
                id="prof-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={20}
                className={`ff-input ${phone ? 'ff-input-filled' : ''}`}
                placeholder={t('profile.phonePlaceholder')}
              />
              <label htmlFor="prof-phone" className={`ff-label ${phone ? 'ff-label-float' : ''}`}>
                {t('profile.phone')}
              </label>
            </div>
          </div>

          <div className="ff-group">
            <div className="ff-label-text mb-xs flex items-center gap-xs">
              <Award size={14} aria-hidden="true" />
              {t('profile.skills')}
            </div>
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
          </div>

          <div className="ff-group">
            <div className="ff-label-text mb-xs flex items-center gap-xs">
              <Bell size={14} aria-hidden="true" />
              {t('profile.notificationPreferences')}
            </div>
            <div className="flex-col flex-gap-sm text-sm">
              <div className="flex flex-gap-lg">
                <label className="flex flex-gap-xs cursor-pointer">
                  <input type="checkbox" className="input-checkbox" checked={!!notifications.email} onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })} /> {t('profile.emailNotification')}
                </label>
                <label className="flex flex-gap-xs cursor-pointer">
                  <input type="checkbox" className="input-checkbox" checked={!!notifications.sms} onChange={(e) => setNotifications({ ...notifications, sms: e.target.checked })} /> {t('profile.smsNotification')}
                </label>
              </div>
              <div className="text-sm text-muted-extra">{t('profile.eventSubscriptions')}</div>
              <div className="flex flex-gap-lg flex-wrap">
                <label className="flex flex-gap-xs cursor-pointer">
                  <input type="checkbox" className="input-checkbox" checked={notifications.newRequest === true} onChange={(e) => setNotifications({ ...notifications, newRequest: e.target.checked })} /> {t('profile.notifyNewRequest')}
                </label>
                <label className="flex flex-gap-xs cursor-pointer">
                  <input type="checkbox" className="input-checkbox" checked={notifications.statusChange === true} onChange={(e) => setNotifications({ ...notifications, statusChange: e.target.checked })} /> {t('profile.notifyStatusChange')}
                </label>
                <label className="flex flex-gap-xs cursor-pointer">
                  <input type="checkbox" className="input-checkbox" checked={notifications.newComment === true} onChange={(e) => setNotifications({ ...notifications, newComment: e.target.checked })} /> {t('profile.notifyNewComment')}
                </label>
              </div>
            </div>
          </div>

          <RippleBtn type="submit" className="text-13 flex items-center gap-xs" disabled={loading}>
            <Save size={16} aria-hidden="true" />
            {loading ? t('common.sending') : t('profile.updateProfile')}
          </RippleBtn>
        </form>
      </motion.div>

      <motion.div
        className="card"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h3 className="m-0 mb text-base text-accent flex items-center gap-xs">
          <Key size={16} aria-hidden="true" />
          {t('profile.changePassword')}
        </h3>
        <form onSubmit={handleChangePassword}>
          <div className="ff-group">
            <div className={`ff-wrap ${currentPassword ? 'ff-focused' : ''}`}>
              <input
                id="prof-curpwd"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className={`ff-input ${currentPassword ? 'ff-input-filled' : ''}`}
                placeholder={t('profile.currentPassword')}
              />
              <label htmlFor="prof-curpwd" className={`ff-label ${currentPassword ? 'ff-label-float' : ''}`}>
                {t('profile.currentPassword')}
              </label>
            </div>
          </div>

          <div className="ff-group">
            <div className={`ff-wrap ${newPassword ? 'ff-focused' : ''}`}>
              <input
                id="prof-newpwd"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                maxLength={128}
                className={`ff-input ${newPassword ? 'ff-input-filled' : ''}`}
                placeholder={t('profile.newPassword')}
              />
              <label htmlFor="prof-newpwd" className={`ff-label ${newPassword ? 'ff-label-float' : ''}`}>
                {t('profile.newPassword')}
              </label>
            </div>
          </div>

          {newPasswordStrength && (
            <div className="mb-sm">
              <div className="password-strength">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`password-strength-bar ${newPasswordStrength.className}`} />
                ))}
              </div>
              <div className="password-strength-label">{newPasswordStrength.label}</div>
            </div>
          )}

          <div className="ff-group">
            <div className={`ff-wrap ${confirmPassword ? 'ff-focused' : ''}`}>
              <input
                id="prof-confpwd"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                maxLength={128}
                className={`ff-input ${confirmPassword ? 'ff-input-filled' : ''}`}
                placeholder={t('profile.confirmPassword')}
              />
              <label htmlFor="prof-confpwd" className={`ff-label ${confirmPassword ? 'ff-label-float' : ''}`}>
                {t('profile.confirmPassword')}
              </label>
            </div>
          </div>

          <RippleBtn type="submit" className="text-13" disabled={loading}>
            {loading ? t('common.sending') : t('profile.updatePassword')}
          </RippleBtn>
        </form>
      </motion.div>
    </motion.div>
    </PageTransition>
  )
}
