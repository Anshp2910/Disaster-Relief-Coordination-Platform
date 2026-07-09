import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { clientApi } from '../api/client'
import RequestForm from '../components/RequestForm'
import { PageTransition } from '../components/ui'
import { getErrorMessage } from '../utils/getErrorMessage'

export default function CreateRequest() {
  useEffect(() => { document.title = 'Disaster Relief - New Request' }, [])
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [error, setError] = useState('')

  const onSubmit = async (data: Record<string, unknown>) => {
    setError('')
    try {
      await clientApi.createRequest(data)
      navigate('/dashboard')
    } catch (e) {
      setError(getErrorMessage(e) || t('createRequest.failed'))
    }
  }

  return (
    <PageTransition>
      {error && (
        <div className="container max-w-sm mb-md">
          <div className="error-text flex items-center gap-xs" role="alert">
            <AlertTriangle size={14} />
            {error}
          </div>
        </div>
      )}
      <RequestForm
      title={t('createRequest.title')}
      subtitle={t('createRequest.subtitle')}
      submitLabel={t('createRequest.creating')}
      submitButtonLabel={t('createRequest.createButton')}
      onSubmit={onSubmit}
    />
    </PageTransition>
  )
}
