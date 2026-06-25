import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NotFound() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <main className="flex-center flex-col text-center p-2xl">
      <h1 className="text-3xl text-bold text-gradient m-0 mb-sm">
        404
      </h1>
      <p className="text-lg text-semi m-0 mb-sm">
        {t('notFound.title') || 'Page Not Found'}
      </p>
      <p className="text-sm text-muted m-0 mb-lg">
        {t('notFound.description') || 'The page you are looking for doesn\'t exist or has been moved.'}
      </p>
      <div className="flex-center flex-gap">
        <button className="btnPrimary" onClick={() => navigate('/dashboard')}>
          {t('notFound.goHome') || 'Go to Dashboard'}
        </button>
        <button className="btnSecondary" onClick={() => navigate(-1)}>
          {t('notFound.goBack') || 'Go Back'}
        </button>
      </div>
    </main>
  )
}
