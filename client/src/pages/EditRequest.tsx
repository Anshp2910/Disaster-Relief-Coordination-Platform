import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { clientApi } from '../api/client'
import RequestForm from '../components/RequestForm'

export default function EditRequest() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [fetching, setFetching] = useState(true)
  const [loadedRequest, setLoadedRequest] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { item } = (await clientApi.getRequest(id!)) as { item: Record<string, unknown> }
        if (cancelled) return
        setLoadedRequest({
          title: item.title,
          description: item.description,
          status: item.status || 'Open',
          category: item.category || 'Other',
          priority: item.priority || 'Medium',
          peopleCount: item.peopleCount || 1,
          locationName: item.locationName,
          lat: item.lat,
          lng: item.lng,
        })
      } catch (err) {
        const e = err as Error
        if (!cancelled) setError(e.message || 'Failed to load request')
      } finally {
        if (!cancelled) setFetching(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (fetching) {
    return (
      <div className="container max-w-sm">
        <div className="card">
          <div className="small muted">{t('editRequest.loadingRequest')}</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container max-w-sm">
        <div className="card">
          <div className="errorText">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <RequestForm
      initialData={loadedRequest as Record<string, unknown> | undefined}
      title={t('editRequest.title')}
      subtitle={t('editRequest.subtitle')}
      submitLabel={t('editRequest.saving')}
      submitButtonLabel={t('editRequest.saveChanges')}
      onSubmit={async (data) => { await clientApi.updateRequest(id!, data); navigate('/dashboard') }}
      onCancel={() => navigate('/dashboard')}
      showStatus
    />
  )
}
