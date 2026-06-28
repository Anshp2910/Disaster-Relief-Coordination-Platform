import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowLeft, Edit } from 'lucide-react'
import { clientApi } from '../api/client'
import RequestForm from '../components/RequestForm'
import { PageTransition } from '../components/ui'
import { getErrorMessage } from '../utils/getErrorMessage'

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
      if (!id) return
      try {
        const { item } = (await clientApi.getRequest(id)) as { item: Record<string, unknown> }
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
        if (!cancelled) setError(getErrorMessage(err) || 'Failed to load request')
      } finally {
        if (!cancelled) setFetching(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id])

  if (fetching) {
    return (
      <PageTransition>
        <motion.div
          className="container max-w-sm"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="card">
            <div className="small muted flex items-center gap-xs">
              <Edit size={14} /> {t('editRequest.loadingRequest')}
            </div>
          </div>
        </motion.div>
      </PageTransition>
    )
  }

  if (error) {
    return (
      <PageTransition>
        <motion.div
          className="container max-w-sm"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="card">
            <div className="error-text">{error}</div>
          </div>
        </motion.div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <motion.div
        className="container max-w-sm"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <button
          onClick={() => navigate('/dashboard')}
          className="mb btn-ghost btn-sm flex items-center gap-xs"
          aria-label="Go back to dashboard"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <RequestForm
        initialData={loadedRequest as Record<string, unknown> | undefined}
        title={t('editRequest.title')}
        subtitle={t('editRequest.subtitle')}
        submitLabel={t('editRequest.saving')}
        submitButtonLabel={t('editRequest.saveChanges')}
        onSubmit={async (data) => { if (!id) return; await clientApi.updateRequest(id, data); navigate('/dashboard') }}
        onCancel={() => navigate('/dashboard')}
        showStatus
      />
    </motion.div>
    </PageTransition>
  )
}