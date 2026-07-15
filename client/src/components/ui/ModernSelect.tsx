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
  value, onChange, options, label, error, hint, touched, required,
  searchable = true, className = '', placeholder: placeholderProp, disabled = false,
}: ModernSelectProps) {
  const uid = useId()
  const comboboxId = `ms-combobox-${uid}`
  const searchInputId = `ms-search-${uid}`
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
  const showError = touched && error

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
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    if (open) {
      setActiveIdx(-1)
      searchRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (open && listRef.current && activeIdx >= 0) {
      const el = listRef.current.children[activeIdx] as HTMLElement
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIdx, open])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault(); setOpen(true)
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
        if (activeIdx >= 0 && filtered[activeIdx]) {
          onChange(filtered[activeIdx].value)
          setOpen(false)
          setSearch('')
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        setSearch('')
        break
    }
  }

  return (
    <div className={`ff-group ${className}`} ref={ref}>
      <div
        className={`ff-wrap ms-wrap ${open ? 'ms-open' : ''} ${showError ? 'ff-error' : ''} ${focused ? 'ff-focused' : ''} ${disabled ? 'ms-disabled' : ''}`}
        id={comboboxId}
        onFocus={() => setFocused(true)}
        onBlur={() => { if (!open) setFocused(false) }}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={label}
        aria-controls="ms-listbox"
        aria-activedescendant={activeIdx >= 0 ? `ms-option-${activeIdx}` : undefined}
      >
        <div
          className="ms-trigger"
          onClick={() => { if (!disabled) setOpen(p => !p) }}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!disabled) setOpen(p => !p) } }}
          role="button"
          tabIndex={0}
        >
          <div className="ms-value">
            {selected ? <span className="ms-selected">{selected.label}</span> : <span className="ms-placeholder">{placeholder}</span>}
          </div>
          <motion.div animate={reduced ? {} : { rotate: open ? 180 : 0 }} transition={reduced ? { duration: 0 } : { duration: 0.15 }}>
            <ChevronDown size={15} className="ms-chevron" />
          </motion.div>
        </div>

        <label htmlFor={comboboxId} className={`ff-label ms-label ${(open || value) ? 'ff-label-float' : ''}`}>
          {label}{required ? ' *' : ''}
        </label>

        <AnimatePresence>
          {open && (
            <motion.div
              className="ms-dropdown"
              initial={reduced ? { opacity: 1, y: 0, scaleY: 1 } : { opacity: 0, y: -4, scaleY: 0.95 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={reduced ? { opacity: 1, y: 0, scaleY: 1 } : { opacity: 0, y: -4, scaleY: 0.95 }}
              transition={reduced ? { duration: 0 } : { duration: 0.12 }}
            >
              {searchable && (
                <div className="ms-search-wrap">
                  <Search size={14} className="ms-search-icon" />
                  <input
                    ref={searchRef}
                    id={searchInputId}
                    name={searchInputId}
                    className="ms-search-input"
                    placeholder={t('dataTable.searchPlaceholder')}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onClick={e => e.stopPropagation()}
                    aria-label={t('dataTable.searchOptions')}
                  />
                  {search && (
                    <button className="ms-search-clear" onClick={() => setSearch('')} tabIndex={-1}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              )}
              <div className="ms-options" ref={listRef} role="listbox" id="ms-listbox">
                {filtered.length === 0 ? (
                  <div className="ms-no-options">{t('dataTable.noOptionsFound')}</div>
                ) : (
                  filtered.map((opt, idx) => (
                    <div
                      key={opt.value}
                      id={`ms-option-${idx}`}
                      className={`ms-option ${opt.value === value ? 'ms-option-active' : ''} ${idx === activeIdx ? 'ms-option-hover' : ''} ${opt.disabled ? 'ms-option-disabled' : ''}`}
                      onClick={() => { if (!opt.disabled) { onChange(opt.value); setOpen(false); setSearch('') } }}
                      onKeyDown={e => { if (e.key === 'Enter' && !opt.disabled) { onChange(opt.value); setOpen(false); setSearch('') } }}
                      onMouseEnter={() => setActiveIdx(idx)}
                      role="option"
                      tabIndex={0}
                      aria-selected={opt.value === value}
                    >
                      {opt.icon && <span className="ms-option-icon">{opt.icon}</span>}
                      <span className="ms-option-label">{opt.label}</span>
                      {opt.value === value && <Check size={14} className="ms-option-check" />}
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
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            {error}
          </motion.div>
        )}
        {!showError && hint && (
          <motion.div
            className="ff-msg ff-msg-hint"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            {hint}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
