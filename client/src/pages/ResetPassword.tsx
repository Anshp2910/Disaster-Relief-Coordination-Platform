import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import PageTransition from '../components/ui/PageTransition'
import { createStagger, createListItem } from '../utils/animations'
import { Lock, ArrowLeft, Loader2, CheckCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react'
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
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
      <PageTransition>
        <div className="auth-split">
          <div className="auth-hero">
            <div className="auth-hero-content">
              <div className="auth-emblem" aria-hidden="true">
                <ShieldCheck size={28} />
              </div>
              <h1 className="auth-hero-title">{t('appTitle')}</h1>
              <p className="auth-hero-sub">{t('auth.heroSubtitle')}</p>
            </div>
          </div>
          <div className="auth-card-wrap">
            <div className="auth-card-inner">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                <div className="flex-center mb-md text-success">
                  <CheckCircle size={48} />
                </div>
                <h2 className="auth-title">{t('auth.passwordReset')}</h2>
                <p className="auth-subtitle">{t('auth.passwordResetSuccess')}</p>
                <div className="flex-center">
                  <Link to="/login" className="auth-link flex items-center gap-xs"><ArrowLeft size={16} />{t('auth.backToLogin')}</Link>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <motion.div className="auth-split" variants={container} initial="hidden" animate="visible">
        <motion.div className="auth-hero" variants={item}>
          <div className="auth-hero-content">
            <div className="auth-emblem" aria-hidden="true">
              <ShieldCheck size={28} />
            </div>
            <h1 className="auth-hero-title">{t('appTitle')}</h1>
            <p className="auth-hero-sub">{t('auth.heroSubtitle')}</p>
          </div>
        </motion.div>

        <motion.div className="auth-card-wrap" variants={item}>
          <div className="auth-card-inner">
            <div className="auth-logo-wrap mb-xl">
              <div className="auth-logo" aria-hidden="true"><ShieldCheck size={22} /></div>
            </div>

            <motion.div variants={item}>
              <div className="flex-center text-accent mb-md">
                <Lock size={48} />
              </div>
              <h2 className="auth-title">{t('auth.resetPassword')}</h2>
              <p className="auth-subtitle">{t('auth.enterNewPassword')}</p>
            </motion.div>

            <motion.form onSubmit={handleSubmit} variants={item}>
              {error && <div className="auth-error animate-shake" id="reset-error" role="alert">{error}</div>}

              <div className="auth-field">
                <label htmlFor="password" className="auth-label">{t('auth.newPassword')}</label>
                <div className="auth-input-wrap">
                  <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} minLength={8} className="auth-input" placeholder={t('auth.newPassword')} aria-describedby={error ? 'reset-error' : undefined} />
                  <button type="button" className="auth-pw-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')} tabIndex={0}>
                    {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="confirm" className="auth-label">{t('auth.confirmPassword')}</label>
                <div className="auth-input-wrap">
                  <input id="confirm" type={showConfirm ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} required disabled={loading} minLength={8} className="auth-input" placeholder={t('auth.confirmPassword')} aria-describedby={error ? 'reset-error' : undefined} />
                  <button type="button" className="auth-pw-toggle" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? t('auth.hidePassword') : t('auth.showPassword')} tabIndex={0}>
                    {showConfirm ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <button disabled={loading} type="submit" className="auth-submit">
                {loading ? (
                  <span className="flex items-center gap-sm justify-center">
                    <Loader2 size={18} className="spinner" aria-hidden="true" />
                    {t('auth.resetting')}
                  </span>
                ) : t('auth.resetPassword')}
              </button>

              <div className="auth-alt">
                <Link to="/login" className="flex items-center gap-xs justify-center"><ArrowLeft size={16} />{t('auth.backToLogin')}</Link>
              </div>
            </motion.form>
          </div>
        </motion.div>
      </motion.div>
    </PageTransition>
  )
}
