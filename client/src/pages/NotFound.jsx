import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NotFound() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 80, fontWeight: 800, color: '#000080', lineHeight: 1, marginBottom: 8 }}>404</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: '#333', marginBottom: 8 }}>
        {t('notFound.title') || 'Page Not Found'}
      </div>
      <div style={{ fontSize: 14, color: '#666', maxWidth: 400, marginBottom: 24 }}>
        {t('notFound.description') || 'The page you are looking for doesn\'t exist or has been moved.'}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btnPrimary" onClick={() => navigate('/dashboard')}>
          {t('notFound.goHome') || 'Go to Dashboard'}
        </button>
        <button onClick={() => navigate(-1)}>
          {t('notFound.goBack') || 'Go Back'}
        </button>
      </div>
    </div>
  )
}
