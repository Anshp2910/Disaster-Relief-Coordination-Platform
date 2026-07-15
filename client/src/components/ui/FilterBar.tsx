import { useId } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface FilterOption {
  key: string
  label: string
}

interface FilterBarProps {
  search: string
  onSearchChange: (v: string) => void
  searchPlaceholder?: string
  filters: { key: string; label: string; options: FilterOption[]; value: string; onChange: (v: string) => void }[]
}

export default function FilterBar({ search, onSearchChange, searchPlaceholder, filters }: FilterBarProps) {
  const uid = useId()
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-end gap-sm mb-md">
      <div className="search-input-wrapper" style={{ flex: '1 1 200px', maxWidth: 320 }}>
        <Search size={16} className="search-input-icon" />
        <input
          id={uid + '-search'}
          name={uid + '-search'}
          className="search-input"
          placeholder={searchPlaceholder || t('common.search') || 'Search...'}
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          aria-label={searchPlaceholder || 'Search'}
        />
      </div>
      {filters.map(f => (
        <div key={f.key} className="filter-group">
          <SlidersHorizontal size={14} style={{ color: 'var(--text-muted)' }} />
          <select
            id={uid + '-filter-' + f.key}
            name={uid + '-filter-' + f.key}
            value={f.value}
            onChange={e => f.onChange(e.target.value)}
            className="filter-select"
            aria-label={f.label}
          >
            {f.options.map(o => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}
