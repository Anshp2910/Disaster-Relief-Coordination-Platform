import { useState, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, AlertCircle, Eye, EyeOff, X } from 'lucide-react'

interface FormFieldBase {
  label: string
  error?: string
  hint?: string
  success?: string
  touched?: boolean
  required?: boolean
  className?: string
  leftIcon?: ReactNode
}

type InputField = FormFieldBase & InputHTMLAttributes<HTMLInputElement> & { as?: 'input' }
type TextareaField = FormFieldBase & TextareaHTMLAttributes<HTMLTextAreaElement> & { as: 'textarea' }
type CustomField = FormFieldBase & { as: 'custom'; children: ReactNode }

type FormFieldProps = InputField | TextareaField | CustomField

export default function FormField(props: FormFieldProps) {
  const { label, error, hint, success, touched, required, className = '', leftIcon } = props
  const [focused, setFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const hasValue = props.as === 'custom' ? false : !!(props.value ?? '').toString()
  const isFloating = focused || hasValue
  const showError = touched && error
  const showSuccess = touched && !error && success
  const isPassword = props.as !== 'textarea' && props.type === 'password'

  function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFocused(true)
    props.onFocus?.(e as never)
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFocused(false)
    props.onBlur?.(e as never)
  }

  const inputProps = props.as === 'custom' ? {} : props

  return (
    <div className={`ff-group ${className}`}>
      <div className={`ff-wrap ${showError ? 'ff-error' : ''} ${showSuccess ? 'ff-success' : ''} ${focused ? 'ff-focused' : ''} ${isPassword ? 'ff-pw' : ''}`}>
        {leftIcon && <div className="ff-left-icon">{leftIcon}</div>}

        {props.as === 'textarea' ? (
          <textarea
            {...(inputProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            className={`ff-input ff-textarea ${leftIcon ? 'ff-input-with-icon' : ''}`}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder=" "
            required={required}
          />
        ) : props.as === 'custom' ? (
          props.children
        ) : (
          <input
            {...(inputProps as InputHTMLAttributes<HTMLInputElement>)}
            type={isPassword && showPassword ? 'text' : props.type || 'text'}
            className={`ff-input ${leftIcon ? 'ff-input-with-icon' : ''}`}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder=" "
            required={required}
          />
        )}

        <label className={`ff-label ${isFloating ? 'ff-label-float' : ''} ${leftIcon ? 'ff-label-with-icon' : ''}`}>
          {label}{required ? ' *' : ''}
        </label>

        {isPassword && (
          <button
            type="button"
            className="ff-pw-toggle"
            onClick={() => setShowPassword(p => !p)}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
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
            <AlertCircle size={12} /> {error}
          </motion.div>
        )}
        {showSuccess && !showError && (
          <motion.div
            className="ff-msg ff-msg-success"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            <CheckCircle size={12} /> {success}
          </motion.div>
        )}
        {!showError && !showSuccess && hint && (
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
