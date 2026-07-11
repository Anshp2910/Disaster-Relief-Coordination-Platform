import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { clientApi } from '../api/client'
import RequestForm from '../components/RequestForm'
import { PageTransition, ErrorState } from '../components/ui'
import { getErrorMessage } from '../utils/getErrorMessage'
import { SkeletonCard } from '../components/Skeleton'
import { useToast } from '../components/Toast'

export default function EditRequest() {
  useEffect(() => { document.title = 'Disaster Relief - Edit Request' }, [])
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const toast = useToast()
  const cancelledRef = useRef(false)

  const [fetching, setFetching] = useState(true)
  const [loadedRequest, setLoadedRequest] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    cancelledRef.current = false
    setFetching(true)
    setError('')
    if (!id) return
    try {
      const { item } = (await clientApi.getRequest(id)) as { item: Record<string, unknown> }
      if (cancelledRef.current) return
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
      if (cancelledRef.current) return
      const msg = getErrorMessage(err) || 'Failed to load request'
      setError(msg)
      toast.error(msg)
    } finally {
      if (!cancelledRef.current) setFetching(false)
    }
  }, [id, toast])

  useEffect(() => {
    load()
    return () => { cancelledRef.current = true }
  }, [load])

  if (fetching) {
    return (
      <PageTransition>
        <div className="container">
          <div className="card">
            <SkeletonCard lines={4} />
          </div>
        </div>
      </PageTransition>
    )
  }

  if (error) {
    return (
      <PageTransition>
        <ErrorState message={error} onRetry={load} />
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
          aria-label={t('admin.backToDashboard')}
        >
          <ArrowLeft size={16} /> {t('common.back') || 'Back'}
        </button>
        <RequestForm
        initialData={loadedRequest as Record<string, unknown> | undefined}
        title={t('editRequest.title')}
        subtitle={t('editRequest.subtitle')}
        submitLabel={t('editRequest.saving')}
        submitButtonLabel={t('editRequest.saveChanges')}
        onSubmit={async (data) => {
          if (!id) return
          try {
            await clientApi.updateRequest(id, data)
            toast.success('Request updated successfully')
            navigate('/dashboard')
          } catch (err) {
            toast.error(getErrorMessage(err) || 'Failed to update request')
          }
        }}
        showStatus
      />
    </motion.div>
    </PageTransition>
  )
}
