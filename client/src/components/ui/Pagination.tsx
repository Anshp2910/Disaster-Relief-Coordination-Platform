import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
}

export default function Pagination({ page, totalPages, onChange }: PaginationProps) {
  const { t } = useTranslation()
  if (totalPages <= 1) return null
  return (
    <nav className="flex items-center gap-sm mt-lg" aria-label={t('pagination.page', { page })}>
      <button
        className="btn-ghost btn-sm"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label={t('pagination.previousPage')}
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm px-sm" style={{ color: 'var(--text-muted)', minWidth: 60, textAlign: 'center' }}>
        {page} / {totalPages}
      </span>
      <button
        className="btn-ghost btn-sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label={t('pagination.nextPage')}
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  )
}
