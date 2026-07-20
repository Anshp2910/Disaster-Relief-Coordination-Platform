import { useState, useRef, useEffect, useMemo, useId, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Search, X, Check } from 'lucide-react'
import useReducedMotion from '../../hooks/useReducedMotion'

export interface SelectOption {
  value: string
  label: string
  icon?: ReactNode
  disabled?: boolean
}

interface ModernSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  label: string
  error?: string
  hint?: string
  touched?: boolean
  required?: boolean
  searchable?: boolean
  className?: string
  placeholder?: string
  disabled?: boolean
}

export default function ModernSelect({
  value,
  onChange,
  options,
  label,
  error,
  hint,
  touched,
  required,
  searchable = true,
  className = '',
  placeholder: placeholderProp,
  disabled = false,
}: ModernSelectProps) {
  const uid = useId()
  const labelId = `ms-label-${uid}`
  const comboboxId = `ms-combobox-${uid}`
  const searchInputId = `ms-search-${uid}`
  const listboxId = `ms-listbox-${uid}`
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const placeholder = placeholderProp ?? 'Select...'
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [focused, setFocused] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(-1)

  const selected = options.find(o => o.value === value)
  const hasValue = !!value
  const showError = touched && !!error

  const filtered = useMemo(() => {
    if (!search || !searchable) return options
    const q = search.toLowerCase()
    return options.filter(o => o.label.toLowerCase().includes(q))
  }, [options, search, searchable])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setFocused(false)
        setSearch('')
      }
    }
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        setOpen(false)
        setSearch('')
        ref.current?.focus()
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setActiveIdx(-1)
      requestAnimationFrame(() => searchRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    if (open && listRef.current && activeIdx >= 0 && filtered[activeIdx]) {
      const el = listRef.current.children[activeIdx] as HTMLElement
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIdx, open, filtered])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIdx(prev => Math.min(prev + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIdx(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIdx >= 0 && filtered[activeIdx] && !filtered[activeIdx]!.disabled) {
          onChange(filtered[activeIdx]!.value)
          setOpen(false)
          setSearch('')
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        setSearch('')
        break
      case 'Tab':
        setOpen(false)
        setSearch('')
        break
    }
  }

  function handleTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!disabled) setOpen(p => !p)
    }
  }

  function handleOptionKeyDown(e: React.KeyboardEvent, opt: SelectOption) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!opt.disabled) {
        onChange(opt.value)
        setOpen(false)
        setSearch('')
      }
    }
  }

  const wrapVariant = showError ? 'ff-error' : focused ? 'ff-focused' : ''

  return (
    <div className={`ff-group ${className}`} ref={ref}>
      <div
        className={`ms-wrap ${wrapVariant} ${disabled ? 'ms-disabled' : ''} ${open ? 'ms-open' : ''}`}
        id={comboboxId}
        onFocus={() => setFocused(true)}
        onBlur={() => { if (!open) setFocused(false) }}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={labelId}
        aria-controls={listboxId}
        aria-activedescendant={activeIdx >= 0 ? `ms-option-${uid}-${activeIdx}` : undefined}
        aria-invalid={showError ? 'true' : undefined}
        aria-disabled={disabled}
      >
        <div
          className="ms-trigger"
          onClick={() => { if (!disabled) setOpen(p => !p) }}
          onKeyDown={handleTriggerKeyDown}
          role="button"
          tabIndex={0}
        >
          <div className="ms-value">
            {hasValue ? (
              <span className="ms-selected">{selected?.label}</span>
            ) : (
              <span className="ms-placeholder">{placeholder}</span>
            )}
          </div>
          <motion.div
            animate={reduced ? {} : { rotate: open ? 180 : 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <ChevronDown size={15} className="ms-chevron" />
          </motion.div>
        </div>

        <label id={labelId} className={`ff-label ms-label ${(open || hasValue) ? 'ff-label-float' : ''}`}>
          {label}{required && <span className="ff-required-star" aria-hidden="true"> *</span>}
        </label>

        <AnimatePresence>
          {open && (
            <motion.div
              className="ms-dropdown"
              initial={reduced ? { opacity: 1, y: 0, scaleY: 1 } : { opacity: 0, y: -6, scaleY: 0.92 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={reduced ? { opacity: 1, y: 0, scaleY: 1 } : { opacity: 0, y: -6, scaleY: 0.92 }}
              transition={reduced ? { duration: 0 } : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              {searchable && (
                <div className="ms-search-wrap">
                  <Search size={14} className="ms-search-icon" aria-hidden="true" />
                  <input
                    ref={searchRef}
                    id={searchInputId}
                    name={searchInputId}
                    className="ms-search-input"
                    placeholder={t('dataTable.searchPlaceholder') || 'Search options...'}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onClick={e => e.stopPropagation()}
                    aria-label={t('dataTable.searchOptions') || 'Search options'}
                  />
                  {search && (
                    <button
                      className="ms-search-clear"
                      onClick={() => setSearch('')}
                      tabIndex={-1}
                      aria-label={t('common.clear') || 'Clear search'}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              )}

              <div className="ms-options" ref={listRef} role="listbox" id={listboxId} aria-label={label}>
                {filtered.length === 0 ? (
                  <div className="ms-no-options">{t('dataTable.noOptionsFound') || 'No options found'}</div>
                ) : (
                  filtered.map((opt, idx) => (
                    <div
                      key={opt.value}
                      id={`ms-option-${uid}-${idx}`}
                      className={`ms-option ${opt.value === value ? 'ms-option-active' : ''} ${idx === activeIdx ? 'ms-option-hover' : ''} ${opt.disabled ? 'ms-option-disabled' : ''}`}
                      onClick={() => { if (!opt.disabled) { onChange(opt.value); setOpen(false); setSearch('') } }}
                      onKeyDown={e => handleOptionKeyDown(e, opt)}
                      onMouseEnter={() => setActiveIdx(idx)}
                      role="option"
                      tabIndex={0}
                      aria-selected={opt.value === value}
                      aria-disabled={opt.disabled}
                    >
                      {opt.icon && <span className="ms-option-icon">{opt.icon}</span>}
                      <span className="ms-option-label">{opt.label}</span>
                      {opt.value === value && <Check size={14} className="ms-option-check" aria-hidden="true" />}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {showError && (
          <motion.div
            className="ff-msg ff-msg-error"
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -5, height: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            role="alert"
          >
            {error}
          </motion.div>
        )}
        {!showError && hint && (
          <motion.div
            className="ff-msg ff-msg-hint"
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -5, height: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          >
            {hint}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
