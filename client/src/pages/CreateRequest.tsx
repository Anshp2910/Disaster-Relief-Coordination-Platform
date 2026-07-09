import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { clientApi } from '../api/client'
import RequestForm from '../components/RequestForm'
import { getErrorMessage } from '../utils/getErrorMessage'
import { ErrorState } from '../components/ui'
import { useToast } from '../components/Toast'

export default function CreateRequest() {
  useEffect(() => { document.title = 'Disaster Relief - New Request' }, [])
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [error, setError] = useState('')

  const toast = useToast()

  const onSubmit = async (data: Record<string, unknown>) => {
    setError('')
    try {
      await clientApi.createRequest(data)
      toast.success('Request created successfully')
      navigate('/dashboard')
    } catch (e) {
      setError(getErrorMessage(e) || t('createRequest.failed'))
    }
  }

  return (
    <div className="container">
      {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}
      <RequestForm
        title={t('createRequest.title')}
        subtitle={t('createRequest.subtitle')}
        submitLabel={t('createRequest.creating')}
        submitButtonLabel={t('createRequest.createButton')}
        onSubmit={onSubmit}
      />
    </div>
  )
}
