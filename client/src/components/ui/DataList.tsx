import { memo, type ReactNode, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Inbox } from 'lucide-react'
import Pagination from './Pagination'
import ErrorState from './ErrorState'
import { SkeletonCard } from '../Skeleton'
import EmptyState from '../EmptyState'

interface DataListProps<T> {
  items: T[]
  loading: boolean
  error?: string
  onRetry?: () => void
  emptyIcon?: ReactNode
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

const listVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.03, delayChildren: 0.02 },
  },
}

function DataList<T>({
  items,
  loading,
  error,
  onRetry,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  renderItem,
  page,
  totalPages,
  onPageChange,
  keyExtractor,
  skeletonCount = 4,
  skeletonLines = 3,
}: DataListProps<T>) {
  const { t } = useTranslation()
  const [prevKey, setPrevKey] = useState<string>('')

  if (error) return <ErrorState message={error} onRetry={onRetry} />

  if (loading) {
    return (
      <div className="data-list-root">
        <div className="data-list-skeleton" aria-hidden="true">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <SkeletonCard key={i} lines={skeletonLines} />
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="data-list-root">
        <div className="data-list-empty">
          <EmptyState icon={emptyIcon || <Inbox size={32} />} title={emptyTitle || t('dataList.noItems')} description={emptyDescription} />
        </div>
      </div>
    )
  }

  const listKey = items.map(keyExtractor).join(',') || 'empty'
  const hasChanged = prevKey !== listKey
  if (hasChanged) setPrevKey(listKey)

  return (
    <div className="data-list-root">
      <AnimatePresence mode="wait">
        <motion.div
          key={listKey}
          className="data-list-grid"
          variants={listVariants}
          initial={hasChanged ? 'hidden' : false}
          animate="show"
          exit="hidden"
        >
          {items.map((item, i) => (
            <motion.div
              key={keyExtractor(item)}
              variants={{
                hidden: { opacity: 0, y: 6 },
                show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
              }}
            >
              {renderItem(item, i)}
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
      {page !== undefined && totalPages !== undefined && onPageChange && (
        <Pagination page={page} totalPages={totalPages} onChange={onPageChange} />
      )}
    </div>
  )
}

export default memo(DataList) as typeof DataList
