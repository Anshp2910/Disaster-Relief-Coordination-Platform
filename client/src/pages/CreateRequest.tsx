import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import RequestForm from '../components/RequestForm'
import { PageTransition } from '../components/ui'

export default function CreateRequest() {
  useEffect(() => { document.title = 'Disaster Relief - New Request' }, [])
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <PageTransition>
      <RequestForm
      title={t('createRequest.title')}
      subtitle={t('createRequest.subtitle')}
      submitLabel={t('createRequest.creating')}
      submitButtonLabel={t('createRequest.createButton')}
      onSubmit={async (data) => { await clientApi.createRequest(data); navigate('/dashboard') }}
      onCancel={() => navigate('/dashboard')}
    />
    </PageTransition>
  )
}
