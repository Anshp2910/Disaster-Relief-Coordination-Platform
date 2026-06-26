import { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'

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

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export default function DatePicker({
  value, onChange, label, error, hint, touched, required,
  className = '', type = 'date', min, max,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [viewDate, setViewDate] = useState(() => value ? new Date(value) : new Date())
  const ref = useRef<HTMLDivElement>(null)
  const showError = touched && error

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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function formatDisplay(d: Date): string {
    if (type === 'datetime-local') {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

  function clearDate() {
    onChange('')
    setOpen(false)
  }

  const isToday = (day: number) => {
    const t = new Date()
    return t.getDate() === day && t.getMonth() === month && t.getFullYear() === year
  }

  const isSelected = (day: number) => {
    if (!selectedDate) return false
    return selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year
  }

  const isDisabled = (day: number) => {
    const d = new Date(year, month, day)
    if (min && d < new Date(min)) return true
    if (max && d > new Date(max)) return true
    return false
  }

  return (
    <div className={`ff-group ${className}`} ref={ref}>
      <div className={`ff-wrap dp-wrap ${open ? 'dp-open' : ''} ${showError ? 'ff-error' : ''} ${focused ? 'ff-focused' : ''}`}
        onFocus={() => setFocused(true)}
        onBlur={() => { if (!open) setFocused(false) }}
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter') setOpen(p => !p) }}
        role="combobox"
        aria-expanded={open}
        aria-label={label}
      >
        <div className="dp-trigger" onClick={() => setOpen(p => !p)}>
          <CalendarDays size={15} className="dp-icon" />
          <span className={`dp-value ${value ? '' : 'dp-placeholder'}`}>
            {value ? formatDisplay(new Date(value)) : 'Select date...'}
          </span>
          {value && (
            <button className="dp-clear" onClick={e => { e.stopPropagation(); clearDate() }} tabIndex={-1} aria-label="Clear date">
              <X size={13} />
            </button>
          )}
        </div>

        <label className={`ff-label dp-label ${(open || value) ? 'ff-label-float' : ''}`}>
          {label}{required ? ' *' : ''}
        </label>

        <AnimatePresence>
          {open && (
            <motion.div
              className="dp-calendar"
              initial={{ opacity: 0, y: -4, scaleY: 0.95 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -4, scaleY: 0.95 }}
              transition={{ duration: 0.12 }}
            >
              <div className="dp-header">
                <button className="dp-nav" onClick={prevMonth} aria-label="Previous month"><ChevronLeft size={15} /></button>
                <span className="dp-month">{MONTHS[month]} {year}</span>
                <button className="dp-nav" onClick={nextMonth} aria-label="Next month"><ChevronRight size={15} /></button>
              </div>
              <div className="dp-weekdays">
                {DAYS.map(d => <div key={d} className="dp-weekday">{d}</div>)}
              </div>
              <div className="dp-days">
                {daysInMonth.map((day, i) => (
                  <div
                    key={i}
                    className={`dp-day ${day === null ? 'dp-day-empty' : ''} ${day !== null && isToday(day) ? 'dp-day-today' : ''} ${day !== null && isSelected(day) ? 'dp-day-selected' : ''} ${day !== null && isDisabled(day) ? 'dp-day-disabled' : ''}`}
                    onClick={() => { if (day !== null && !isDisabled(day)) selectDate(day) }}
                    role="gridcell"
                    aria-label={day ? `${MONTHS[month]} ${day}, ${year}` : undefined}
                    aria-disabled={day !== null && isDisabled(day)}
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
