import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { createStagger, createListItem } from '../utils/animations'
import { Lock, ArrowLeft, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { clientApi } from '../api/client'
import { getErrorMessage } from '../utils/getErrorMessage'

const container = createStagger(0.08, 0.1)
const item = createListItem(20, 0.5)

export default function ResetPassword() {
  useEffect(() => { document.title = 'Disaster Relief - Reset Password' }, [])
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!token) { setError(t('auth.invalidResetLink')); return }
    if (password.length < 8) { setError(t('auth.passwordMinLength')); return }
    if (password !== confirm) { setError(t('auth.passwordsDoNotMatch')); return }
    setLoading(true)
    try {
      await clientApi.resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(getErrorMessage(err) || t('auth.resetFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <motion.div className="auth-content" variants={container} initial="hidden" animate="visible">
            <motion.div className="flex-center text-success" style={{ fontSize: '3rem' }} variants={item}>
              <CheckCircle size={48} />
            </motion.div>
            <motion.h1 className="auth-title" variants={item}>{t('auth.passwordReset')}</motion.h1>
            <motion.p className="auth-subtitle" variants={item}>{t('auth.passwordResetSuccess')}</motion.p>
            <motion.div variants={item}>
              <Link to="/login" className="auth-link">{t('auth.backToLogin')}</Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <motion.form className="auth-content" variants={container} initial="hidden" animate="visible" onSubmit={handleSubmit}>
           <motion.div className="flex-center text-accent" style={{ fontSize: '3rem' }} variants={item}>
             <Lock size={48} />
           </motion.div>
          <motion.h1 className="auth-title" variants={item}>{t('auth.resetPassword')}</motion.h1>
          <motion.p className="auth-subtitle" variants={item}>{t('auth.enterNewPassword')}</motion.p>

          {error && <motion.div className="auth-error" id="reset-error" role="alert" variants={item}>{error}</motion.div>}

          <motion.div className="auth-field" variants={item}>
            <div className="auth-input-wrap">
              <input id="password" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} minLength={8} className="auth-input" placeholder=" " aria-describedby={error ? 'reset-error' : undefined} />
              <label htmlFor="password" className="auth-label">{t('auth.newPassword')}</label>
              <button type="button" className="auth-pw-toggle" onClick={() => setShow(!show)} aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')} tabIndex={0}>
                {show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
          </motion.div>

          <motion.div className="auth-field" variants={item}>
            <div className="auth-input-wrap">
              <input id="confirm" type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} required disabled={loading} minLength={8} className="auth-input" placeholder=" " aria-describedby={error ? 'reset-error' : undefined} />
              <label htmlFor="confirm" className="auth-label">{t('auth.confirmPassword')}</label>
              <button type="button" className="auth-pw-toggle" onClick={() => setShow(!show)} aria-label={show ? t('auth.hidePassword') : t('auth.showPassword')} tabIndex={0}>
                {show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
          </motion.div>

          <motion.button disabled={loading} type="submit" className="auth-submit" variants={item}>
            {loading ? (
              <span className="flex items-center gap-sm justify-center">
                <Loader2 size={18} className="spinner" aria-hidden="true" />
                {t('auth.resetting')}
              </span>
            ) : t('auth.resetPassword')}
          </motion.button>

          <motion.div className="auth-alt" variants={item}>
            <Link to="/login" className="flex items-center gap-xs justify-center"><ArrowLeft size={16} />{t('auth.backToLogin')}</Link>
          </motion.div>
        </motion.form>
      </div>
    </div>
  )
}
