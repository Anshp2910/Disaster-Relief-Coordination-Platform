import { useState, type ReactNode, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'

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
  const { t } = useTranslation()
  const { label, error, hint, success, touched, required, className = '', leftIcon } = props
  const [focused, setFocused] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const hasValue = props.as === 'custom' ? false : !!(props.value ?? '').toString()
  const isFloating = focused || hasValue
  const showError = touched && !!error
  const showSuccess = touched && !error && !!success
  const isPassword = props.as !== 'textarea' && props.as !== 'custom' && props.type === 'password'

  function handleFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFocused(true)
    if (props.as !== 'custom') props.onFocus?.(e as never)
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFocused(false)
    if (props.as !== 'custom') props.onBlur?.(e as never)
  }

  const inputProps = props.as === 'custom' ? {} : props
  const wrapState = showError ? 'ff-error' : showSuccess ? 'ff-success' : focused ? 'ff-focused' : ''

  return (
    <div className={`ff-group ${className}`}>
      <div className={`ff-wrap ${wrapState}`}>
        {leftIcon && <div className={`ff-left-icon ${focused ? 'ff-left-icon--active' : ''}`}>{leftIcon}</div>}

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

        <label
          className={`ff-label ${isFloating ? 'ff-label-float' : ''} ${leftIcon ? 'ff-label-with-icon' : ''}`}
          htmlFor={'id' in props ? (props.id as string) : undefined}
        >
          {label}
          {required && <span className="ff-required-star" aria-hidden="true"> *</span>}
        </label>

        {isPassword && (
          <button
            type="button"
            className="ff-pw-toggle"
            onClick={() => setShowPassword(p => !p)}
            tabIndex={-1}
            aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
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
            <AlertCircle size={12} aria-hidden="true" /> {error}
          </motion.div>
        )}
        {showSuccess && !showError && (
          <motion.div
            className="ff-msg ff-msg-success"
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -5, height: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            role="status"
          >
            <CheckCircle size={12} aria-hidden="true" /> {success}
          </motion.div>
        )}
        {!showError && !showSuccess && hint && (
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
