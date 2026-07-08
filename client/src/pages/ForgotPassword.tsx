import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { createStagger, createListItem } from '../utils/animations'
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import { clientApi } from '../api/client'
import { getErrorMessage } from '../utils/getErrorMessage'

const container = createStagger(0.08, 0.1)
const item = createListItem(20, 0.5)

export default function ForgotPassword() {
  useEffect(() => { document.title = 'Disaster Relief - Forgot Password' }, [])
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [resetUrl, setResetUrl] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('auth.invalidEmail'))
      return
    }
    setLoading(true)
    try {
      const res = await clientApi.forgotPassword(email)
      const data = res as { resetUrl?: string; emailPreviewUrl?: string }
      setResetUrl(data.resetUrl || '')
      setPreviewUrl(data.emailPreviewUrl || '')
      setSent(true)
    } catch (err) {
      const msg = getErrorMessage(err)
      if (msg.includes('429') || msg.toLowerCase().includes('too many') || msg.toLowerCase().includes('rate limit')) {
        setError(t('auth.rateLimited') || 'Too many requests. Please wait a moment and try again.')
      } else {
        setError(msg || t('auth.somethingWentWrong'))
      }
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <motion.div className="auth-content" variants={container} initial="hidden" animate="visible">
            <motion.div className="flex-center" style={{ fontSize: '3rem', color: 'var(--success)' }} variants={item}>
              <CheckCircle size={48} />
            </motion.div>
            <motion.h1 className="auth-title" variants={item}>{t('auth.checkEmail')}</motion.h1>
            <motion.p className="auth-subtitle" variants={item}>{t('auth.resetLinkSent')}</motion.p>
            {previewUrl && (
              <motion.div className="auth-field" variants={item} style={{ width: '100%' }}>
                <label htmlFor="previewUrl">{t('auth.previewUrl') || 'View email:'}</label>
                <a id="previewUrl" href={previewUrl} target="_blank" rel="noopener noreferrer" className="auth-link" style={{ fontSize: 'var(--text-xs)', wordBreak: 'break-all', display: 'block' }}>{previewUrl}</a>
              </motion.div>
            )}
            {resetUrl && !previewUrl && (
              <motion.div className="auth-field" variants={item} style={{ width: '100%' }}>
                <label htmlFor="resetUrl">{t('auth.directResetLink') || 'Direct reset link (email not sent):'}</label>
                <input id="resetUrl" type="text" readOnly value={resetUrl} onClick={(e) => (e.target as HTMLInputElement).select()} style={{ fontSize: 'var(--text-xs)', wordBreak: 'break-all' }} />
              </motion.div>
            )}
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
          <motion.div className="flex-center" style={{ fontSize: '3rem', color: 'var(--primary)' }} variants={item}>
            <Mail size={48} />
          </motion.div>
          <motion.h1 className="auth-title" variants={item}>{t('auth.forgotPassword')}</motion.h1>
          <motion.p className="auth-subtitle" variants={item}>{t('auth.enterEmailReset')}</motion.p>

          {error && <motion.div className="auth-error" id="forgot-error" role="alert" variants={item}>{error}</motion.div>}

          <motion.div className="auth-field" variants={item}>
            <div className="auth-input-wrap">
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} className="auth-input" placeholder=" " aria-describedby={error ? 'forgot-error' : undefined} />
              <label htmlFor="email" className="auth-label">{t('auth.email')}</label>
              <Mail size={16} className="auth-input-icon" aria-hidden="true" />
            </div>
          </motion.div>

          <motion.button disabled={loading} type="submit" className="auth-submit" variants={item}>
            {loading ? (
              <span className="flex items-center gap-sm justify-center">
                <Loader2 size={18} className="spinner" aria-hidden="true" />
                {t('auth.sending')}
              </span>
            ) : t('auth.sendResetLink')}
          </motion.button>

          <motion.div className="auth-alt" variants={item}>
            <Link to="/login" className="flex items-center gap-xs justify-center"><ArrowLeft size={16} />{t('auth.backToLogin')}</Link>
          </motion.div>
        </motion.form>
      </div>
    </div>
  )
}
