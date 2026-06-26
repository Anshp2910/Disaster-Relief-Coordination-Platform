import { useState, useCallback, useMemo } from 'react'

interface Rule {
  required?: boolean | string
  minLength?: { value: number; message: string }
  maxLength?: { value: number; message: string }
  min?: { value: number; message: string }
  max?: { value: number; message: string }
  pattern?: { value: RegExp; message: string }
  email?: boolean | string
  match?: { field: string; message: string }
  custom?: (value: string) => string | null
}

type Rules<T> = {
  [K in keyof T]?: Rule
}

interface UseFormValidationOptions<T> {
  initialValues: T
  rules: Rules<T>
  onSubmit: (values: T) => Promise<void> | void
}

export function useFormValidation<T extends Record<string, string>>({ initialValues, rules, onSubmit }: UseFormValidationOptions<T>) {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState('')

  const validateField = useCallback((field: keyof T, val: string): string | null => {
    const rule = rules[field]
    if (!rule) return null

    if (rule.required && !val.trim()) {
      return typeof rule.required === 'string' ? rule.required : 'This field is required'
    }
    if (rule.minLength && val.length < rule.minLength.value) {
      return rule.minLength.message
    }
    if (rule.maxLength && val.length > rule.maxLength.value) {
      return rule.maxLength.message
    }
    if (rule.min && val.trim() && Number(val) < rule.min.value) {
      return rule.min.message
    }
    if (rule.max && val.trim() && Number(val) > rule.max.value) {
      return rule.max.message
    }
    if (rule.pattern && val.trim() && !rule.pattern.value.test(val)) {
      return rule.pattern.message
    }
    if (rule.email && val.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(val)) {
        return typeof rule.email === 'string' ? rule.email : 'Invalid email address'
      }
    }
    if (rule.match && values[rule.match.field as keyof T] !== val) {
      return rule.match.message
    }
    if (rule.custom) {
      return rule.custom(val)
    }

    return null
  }, [rules, values])

  const handleChange = useCallback((field: keyof T, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: '' }))
    setSubmitSuccess('')
  }, [])

  const handleBlur = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }))
    const error = validateField(field, values[field])
    setErrors(prev => ({ ...prev, [field]: error || '' }))
  }, [validateField, values])

  const setFieldValue = useCallback((field: keyof T, value: string) => {
    setValues(prev => ({ ...prev, [field]: value }))
  }, [])

  const validateAll = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof T, string>> = {}
    const newTouched: Partial<Record<keyof T, boolean>> = {}
    let valid = true

    for (const field of Object.keys(rules) as Array<keyof T>) {
      const error = validateField(field, values[field] ?? '')
      if (error) { newErrors[field] = error; valid = false }
      newTouched[field] = true
    }

    setErrors(newErrors)
    setTouched(prev => ({ ...prev, ...newTouched }))
    return valid
  }, [validateField, values, rules])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!validateAll()) return
    setSubmitting(true)
    setSubmitSuccess('')
    try {
      await onSubmit(values)
      setSubmitSuccess('Saved successfully!')
    } catch {
      setSubmitSuccess('')
    } finally {
      setSubmitting(false)
    }
  }, [validateAll, onSubmit, values])

  const isDirty = useMemo(() => {
    return Object.keys(values).some(k => values[k as keyof T] !== initialValues[k as keyof T])
  }, [values, initialValues])

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
    setSubmitSuccess('')
  }, [initialValues])

  return {
    values, errors, touched, submitting, submitSuccess, isDirty,
    handleChange, handleBlur, handleSubmit, setFieldValue, reset, setSubmitSuccess,
  }
}
