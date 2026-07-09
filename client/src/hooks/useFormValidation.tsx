import { useState, useCallback, type ReactNode } from 'react'

interface Rule {
  required?: boolean
  min?: number
  max?: number
  type?: 'number' | 'email'
  label: string
}

const rules: Record<string, Rule> = {
  title: { required: true, min: 1, max: 200, label: 'Title' },
  description: { required: true, min: 1, max: 5000, label: 'Description' },
  locationName: { required: true, min: 1, max: 500, label: 'Location' },
  lat: { required: true, min: -90, max: 90, type: 'number', label: 'Latitude' },
  lng: { required: true, min: -180, max: 180, type: 'number', label: 'Longitude' },
  email: { required: true, type: 'email', label: 'Email' },
  password: { required: true, min: 6, max: 128, label: 'Password' },
  displayName: { required: true, min: 1, max: 100, label: 'Name' },
  name: { required: true, min: 1, max: 200, label: 'Name' },
  category: { required: true, label: 'Category' },
  quantity: { required: true, type: 'number', min: 0, label: 'Quantity' },
  unit: { required: true, min: 1, max: 50, label: 'Unit' },
  centerLat: { required: true, type: 'number', min: -90, max: 90, label: 'Latitude' },
  centerLng: { required: true, type: 'number', min: -180, max: 180, label: 'Longitude' },
  radiusKm: { required: true, type: 'number', min: 1, max: 500, label: 'Radius' },
  reason: { required: true, min: 1, max: 2000, label: 'Reason' },
  text: { required: true, min: 1, max: 2000, label: 'Message' },
  startDate: { required: true, label: 'Start Date' },
  endDate: { required: true, label: 'End Date' },
}

function validateField(name: string, value: unknown): string {
  const rule = rules[name]
  if (!rule) return ''

  const str = value == null ? '' : String(value).trim()
  const num = Number(value)

  if (rule.required && !str) return `${rule.label} is required`

  if (str && rule.min != null && rule.type !== 'number' && str.length < rule.min) {
    return `${rule.label} must be at least ${rule.min} characters`
  }
  if (str && rule.max != null && rule.type !== 'number' && str.length > rule.max) {
    return `${rule.label} must be at most ${rule.max} characters`
  }

  if (rule.type === 'number' && str) {
    if (isNaN(num)) return `${rule.label} must be a number`
    if (rule.min != null && num < rule.min) return `${rule.label} must be at least ${rule.min}`
    if (rule.max != null && num > rule.max) return `${rule.label} must be at most ${rule.max}`
  }

  if (rule.type === 'email' && str) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) return 'Please enter a valid email address'
  }

  return ''
}

interface FormErrors {
  [key: string]: string
}

interface FormTouched {
  [key: string]: boolean
}

export function useFormValidation() {
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<FormTouched>({})

  const validate = useCallback((name: string, value: unknown): string => {
    const error = validateField(name, value)
    setErrors((prev) => ({ ...prev, [name]: error }))
    return error
  }, [])

  const validateAll = useCallback((values: Record<string, unknown>): boolean => {
    const errs: FormErrors = {}
    let valid = true
    for (const [key, val] of Object.entries(values)) {
      if (rules[key]) {
        const err = validateField(key, val)
        if (err) {
          errs[key] = err
          valid = false
        }
      }
    }
    setErrors(errs)
    setTouched(Object.keys(values).reduce<FormTouched>((a, k) => ({ ...a, [k]: true }), {}))
    return valid
  }, [])

  const touch = useCallback((name: string): void => {
    setTouched((prev) => ({ ...prev, [name]: true }))
  }, [])

  const reset = useCallback((): void => {
    setErrors({})
    setTouched({})
  }, [])

  return { errors, touched, validate, validateAll, touch, reset, setErrors }
}

interface FormFieldProps {
  name: string
  label?: string
  error?: string
  touched?: boolean
  children: ReactNode
}

export function FormField({ name, label, error, touched, children }: FormFieldProps) {
  const showError = touched && error
  const errorId = `${name}-error`
  const fieldId = `field-${name}`
  return (
    <div>
      {label && <label className="small block mb-xs" htmlFor={fieldId}>{label}</label>}
      {children}
      {showError && (
        <div id={errorId} role="alert" className="field-error">{error}</div>
      )}
    </div>
  )
}
