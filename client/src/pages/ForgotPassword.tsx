import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import PageTransition from '../components/ui/PageTransition'
import { createStagger, createListItem } from '../utils/animations'
import { ShieldCheck, Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
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
          <div className="flex items-center gap-sm mb-xl">
            <div className="auth-logo-wrap"><div className="auth-logo" aria-hidden="true"><ShieldCheck size={22} /></div></div>
            <div>
              <div className="auth-logo-text">{t('auth.appName')}</div>
              <div className="auth-logo-sub">{t('auth.govtOfIndia')}</div>
            </div>
          </div>

          {sent ? (
            <motion.div variants={container} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
              <div className="flex-center mb-md text-success">
                <CheckCircle size={48} />
              </div>
              <h2 className="auth-title">{t('auth.checkEmail')}</h2>
              <p className="auth-subtitle">{t('auth.resetLinkSent')}</p>

              {previewUrl && (
                <div className="auth-field w-full">
                  <label htmlFor="forgot-preview-url">{t('auth.previewUrl') || 'View email:'}</label>
                  <a id="forgot-preview-url" href={previewUrl} target="_blank" rel="noopener noreferrer" className="auth-link text-xs text-wrap block">{previewUrl}</a>
                </div>
              )}

              {resetUrl && !previewUrl && (
                <div className="auth-field w-full">
                  <label htmlFor="forgot-reset-url">{t('auth.directResetLink') || 'Direct reset link (email not sent):'}</label>
                  <input id="forgot-reset-url" type="text" readOnly value={resetUrl} onClick={(e) => (e.target as HTMLInputElement).select()} className="auth-input text-xs" />
                </div>
              )}

              <div className="auth-back">
                <Link to="/login" className="flex items-center gap-xs justify-center"><ArrowLeft size={16} />{t('auth.backToLogin')}</Link>
              </div>
            </motion.div>
          ) : (
            <motion.div variants={container}>
              <div className="flex-center mb-md text-accent">
                <Mail size={48} />
              </div>
              <h2 className="auth-title">{t('auth.forgotPassword')}</h2>
              <p className="auth-subtitle">{t('auth.enterEmailReset')}</p>

              {error && <div className="auth-error animate-shake" id="forgot-error" role="alert">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="auth-field">
                  <label htmlFor="email" className="auth-label">{t('auth.email')}</label>
                  <div className="auth-input-wrap">
                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} className="auth-input" placeholder=" " aria-describedby={error ? 'forgot-error' : undefined} />
                    <Mail size={16} className="auth-input-icon" aria-hidden="true" />
                  </div>
                </div>

                <button disabled={loading} type="submit" className="auth-submit">
                  {loading ? (
                    <span className="flex items-center gap-sm justify-center">
                      <Loader2 size={18} className="spinner" aria-hidden="true" />
                      {t('auth.sending')}
                    </span>
                  ) : t('auth.sendResetLink')}
                </button>
              </form>

              <div className="auth-alt">
                <Link to="/login" className="flex items-center gap-xs justify-center"><ArrowLeft size={16} />{t('auth.backToLogin')}</Link>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
    </PageTransition>
  )
}
