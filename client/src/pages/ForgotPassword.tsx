import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { createStagger, createListItem } from '../utils/animations'
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import { clientApi } from '../api/client'

const container = createStagger(0.08, 0.1)
const item = createListItem(20, 0.5)

export default function ForgotPassword() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await clientApi.forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError((err as Error).message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <motion.div className="auth-content" variants={container} initial="hidden" animate="show">
            <motion.div className="flex-center" style={{ fontSize: '3rem', color: 'var(--success)' }} variants={item}>
              <CheckCircle size={48} />
            </motion.div>
            <motion.h1 className="auth-title" variants={item}>{t('auth.checkEmail')}</motion.h1>
            <motion.p className="auth-subtitle" variants={item}>{t('auth.resetLinkSent')}</motion.p>
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
        <motion.form className="auth-content" variants={container} initial="hidden" animate="show" onSubmit={handleSubmit}>
          <motion.div className="flex-center" style={{ fontSize: '3rem', color: 'var(--primary)' }} variants={item}>
            <Mail size={48} />
          </motion.div>
          <motion.h1 className="auth-title" variants={item}>{t('auth.forgotPassword')}</motion.h1>
          <motion.p className="auth-subtitle" variants={item}>{t('auth.enterEmailReset')}</motion.p>

          {error && <motion.div className="auth-error" variants={item}>{error}</motion.div>}

          <motion.div className="auth-field" variants={item}>
            <label htmlFor="email">{t('auth.email')}</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus disabled={loading} />
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
