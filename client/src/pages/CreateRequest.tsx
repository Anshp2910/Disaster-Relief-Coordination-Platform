import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle } from 'lucide-react'
import { clientApi } from '../api/client'
import RequestForm from '../components/RequestForm'
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
    <div className="container">
      {error && (
        <div className="mb-md">
          <div className="flex items-center gap-xs text-danger" role="alert">
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
    </div>
  )
}
