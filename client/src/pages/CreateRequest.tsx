import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import RequestForm from '../components/RequestForm'
import { getErrorMessage } from '../utils/getErrorMessage'
import { ErrorState } from '../components/ui'
import { useToast } from '../components/Toast'
import PageTransition from '../components/ui/PageTransition'

export default function CreateRequest() {
  useEffect(() => { document.title = 'Disaster Relief - New Request' }, [])
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [error, setError] = useState('')
  const [formLoading, setFormLoading] = useState(false)

  const toast = useToast()

  const onSubmit = async (data: Record<string, unknown>) => {
  setError('')
  setFormLoading(true)
  try {
    await clientApi.createRequest(data)
    toast.success('Request created successfully')
    navigate('/dashboard')
  } catch (e) {
    setError(getErrorMessage(e) || t('createRequest.failed'))
  } finally {
    setFormLoading(false)
  }
}

  return (
    <PageTransition>
      <div className="container">
      {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}
<RequestForm
  title={t('createRequest.title')}
  subtitle={t('createRequest.subtitle')}
  submitLabel={t('createRequest.creating')}
  submitButtonLabel={t('createRequest.createButton')}
  loading={formLoading}
  onSubmit={onSubmit}
/>
    </div>
    </PageTransition>
  )
}
