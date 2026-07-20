import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import useReducedMotion from '../../hooks/useReducedMotion'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  label: string
  error?: string
  hint?: string
  touched?: boolean
  required?: boolean
  className?: string
  type?: 'date' | 'datetime-local'
  min?: string
  max?: string
}

const MONTH_KEYS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export default function DatePicker({
  value,
  onChange,
  label,
  error,
  hint,
  touched,
  required,
  className = '',
  type = 'date',
  min,
  max,
}: DatePickerProps) {
  const { t, i18n } = useTranslation()
  const reduced = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [viewDate, setViewDate] = useState(() => value ? new Date(value) : new Date())
  const ref = useRef<HTMLDivElement>(null)
  const showError = touched && !!error
  const hasValue = !!value

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const daysInMonth = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPad = firstDay.getDay()
    const totalDays = lastDay.getDate()
    const days: (number | null)[] = []
    for (let i = 0; i < startPad; i++) days.push(null)
    for (let d = 1; d <= totalDays; d++) days.push(d)
    return days
  }, [year, month])

  const selectedDate = value ? new Date(value) : null
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        setOpen(false)
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

  function formatDisplay(d: Date): string {
    if (type === 'datetime-local') {
      return d.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function selectDate(day: number) {
    const d = new Date(year, month, day)
    if (type === 'datetime-local') {
      const now = new Date()
      d.setHours(now.getHours(), now.getMinutes())
      onChange(d.toISOString().slice(0, 16))
    } else {
      const iso = d.toISOString().slice(0, 10)
      onChange(iso)
    }
    setOpen(false)
  }

  function prevMonth() { setViewDate(new Date(year, month - 1, 1)) }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)) }
  function clearDate() { onChange(''); setOpen(false) }

  const isToday = (day: number) => {
    const d = new Date(year, month, day)
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  }

  const isSelected = (day: number) => {
    if (!selectedDate) return false
    return selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year
  }

  const isDisabled = (day: number) => {
    if (!min && !max) return false
    const d = new Date(year, month, day)
    if (min && d < new Date(min)) return true
    if (max && d > new Date(max)) return true
    return false
  }

  const wrapVariant = showError ? 'ff-error' : open ? 'ff-focused' : focused ? 'ff-focused' : hasValue ? 'ff-success' : ''

  return (
    <div className={`ff-group ${className}`} ref={ref}>
      <div
        className={`dp-wrap ${wrapVariant} ${open ? 'dp-open' : ''}`}
        tabIndex={0}
        onFocus={() => setFocused(true)}
        onBlur={() => { if (!open) setFocused(false) }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(p => !p) } }}
        role="combobox"
        aria-expanded={open}
        aria-controls="dp-calendar"
        aria-label={label}
        aria-invalid={showError ? 'true' : undefined}
        aria-required={required}
      >
        <div className="dp-trigger" onClick={() => setOpen(p => !p)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(p => !p) } }} role="button" tabIndex={0}>
          <CalendarDays size={15} className="dp-icon" aria-hidden="true" />
          <span className={`dp-value ${hasValue ? '' : 'dp-placeholder'}`}>
            {hasValue ? formatDisplay(new Date(value)) : t('datePicker.selectDate')}
          </span>
          {hasValue && (
            <button
              className="dp-clear"
              onClick={e => { e.stopPropagation(); clearDate() }}
              tabIndex={-1}
              aria-label={t('datePicker.clearDate') || 'Clear date'}
            >
              <X size={13} aria-hidden="true" />
            </button>
          )}
        </div>

        <label className={`ff-label dp-label ${(open || hasValue) ? 'ff-label-float' : ''}`}>
          {label}{required && <span className="ff-required-star" aria-hidden="true"> *</span>}
        </label>

        <AnimatePresence>
          {open && (
            <motion.div
              className="dp-calendar"
              id="dp-calendar"
              initial={reduced ? { opacity: 1, y: 0, scaleY: 1 } : { opacity: 0, y: -6, scaleY: 0.92 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={reduced ? { opacity: 1, y: 0, scaleY: 1 } : { opacity: 0, y: -6, scaleY: 0.92 }}
              transition={reduced ? { duration: 0 } : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-label={`${label} calendar`}
            >
              <div className="dp-header">
                <button className="dp-nav" onClick={prevMonth} aria-label={t('datePicker.previousMonth') || 'Previous month'}>
                  <ChevronLeft size={15} aria-hidden="true" />
                </button>
                <span className="dp-month">
                  {t(`datePicker.${MONTH_KEYS[month]}`)} {year}
                </span>
                <button className="dp-nav" onClick={nextMonth} aria-label={t('datePicker.nextMonth') || 'Next month'}>
                  <ChevronRight size={15} aria-hidden="true" />
                </button>
              </div>
              <div className="dp-weekdays" role="row">
                {DAY_KEYS.map(k => (
                  <div key={k} className="dp-weekday" role="columnheader">{t(`datePicker.${k}`)}</div>
                ))}
              </div>
              <div className="dp-days" role="grid">
                {daysInMonth.map((day, i) => (
                  <div
                    key={i}
                    className={[
                      'dp-day',
                      day === null ? 'dp-day-empty' : '',
                      day !== null && isToday(day) ? 'dp-day-today' : '',
                      day !== null && isSelected(day) ? 'dp-day-selected' : '',
                      day !== null && isDisabled(day) ? 'dp-day-disabled' : '',
                    ].join(' ').trim()}
                    {...(day !== null ? {
                      onClick: () => { if (!isDisabled(day)) selectDate(day) },
                      onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !isDisabled(day)) { e.preventDefault(); selectDate(day) } },
                      role: 'gridcell',
                    } : { role: 'presentation' })}
                    tabIndex={day !== null && !isDisabled(day) ? 0 : -1}
                    aria-label={day ? `${t(`datePicker.${MONTH_KEYS[month]}`)} ${day}, ${year}` : undefined}
                    aria-disabled={day !== null && isDisabled(day)}
                    aria-selected={day !== null && isSelected(day) ? 'true' : undefined}
                  >
                    {day ?? ''}
                  </div>
                ))}
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
