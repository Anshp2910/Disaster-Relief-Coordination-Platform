import { memo, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Inbox } from 'lucide-react'
import Pagination from './Pagination'
import ErrorState from './ErrorState'
import { SkeletonList } from '../Skeleton'
import EmptyState from '../EmptyState'

interface DataListProps<T> {
  items: T[]
  loading: boolean
  error?: string
  onRetry?: () => void
  emptyIcon?: string
  emptyTitle?: string
  emptyDescription?: string
  renderItem: (item: T, index: number) => ReactNode
  page?: number
  totalPages?: number
  onPageChange?: (page: number) => void
  keyExtractor: (item: T) => string
  skeletonCount?: number
  skeletonLines?: number
}

function DataList<T>({
  items, loading, error, onRetry,
  emptyIcon, emptyTitle, emptyDescription,
  renderItem, page, totalPages, onPageChange,
  keyExtractor, skeletonCount = 4, skeletonLines = 3,
}: DataListProps<T>) {
  const { t } = useTranslation()
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (loading) return <SkeletonList count={skeletonCount} lines={skeletonLines} />
  if (items.length === 0) return <EmptyState icon={emptyIcon || <Inbox size={32} />} title={emptyTitle || t('dataList.noItems')} description={emptyDescription} />

  return (
    <>
      <motion.div
        className="gridGap mt-lg"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
      >
        {items.map((item, i) => (
          <motion.div
            key={keyExtractor(item)}
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } } }}
          >
            {renderItem(item, i)}
          </motion.div>
        ))}
      </motion.div>
      {page !== undefined && totalPages !== undefined && onPageChange && (
        <Pagination page={page} totalPages={totalPages} onChange={onPageChange} />
      )}
    </>
  )
}

export default memo(DataList) as typeof DataList
