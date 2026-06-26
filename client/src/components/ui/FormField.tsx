import type { ReactNode } from 'react'

interface FormFieldProps {
  label: string
  error?: string
  children: ReactNode
  required?: boolean
  htmlFor?: string
}

export default function FormField({ label, error, children, required, htmlFor }: FormFieldProps) {
  return (
    <div className="field-group">
      <label htmlFor={htmlFor}>
        {label}{required && <span style={{ color: 'var(--danger)', marginLeft: 4 }}>*</span>}
      </label>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
