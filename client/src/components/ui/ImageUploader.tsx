import { useState, useRef, useCallback, type DragEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Upload, X, Image, AlertCircle } from 'lucide-react'

interface ImageUploaderProps {
  value: File | null
  onChange: (file: File | null) => void
  label: string
  error?: string
  touched?: boolean
  required?: boolean
  className?: string
  accept?: string
  maxSize?: number
  hint?: string
  previewUrl?: string
}

const MAX_SIZE_MB = 5
const ACCEPT = 'image/*'

export default function ImageUploader({
  value,
  onChange,
  label,
  error,
  touched,
  required,
  className = '',
  accept = ACCEPT,
  maxSize = MAX_SIZE_MB,
  hint,
  previewUrl,
}: ImageUploaderProps) {
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { t } = useTranslation()
  const showError = touched && (!!error || !!errorMsg)
  const hasValue = !!value
  const displayPreview = preview || (previewUrl && !value ? previewUrl : null)

  const handleFile = useCallback((file: File | null) => {
    if (!file) {
      setPreview(null)
      onChange(null)
      return
    }
    if (file.size > maxSize * 1024 * 1024) {
      setErrorMsg(t('imageUploader.fileTooLarge', { maxSize }))
      return
    }
    if (!file.type.startsWith('image/')) {
      setErrorMsg(t('imageUploader.notAnImage') || 'Please select a valid image file.')
      return
    }
    onChange(file)
    if (preview) URL.revokeObjectURL(preview)
    const url = URL.createObjectURL(file)
    setPreview(url)
    setErrorMsg(null)
  }, [maxSize, onChange, t, preview])

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    setErrorMsg(null)
    const file = e.dataTransfer.files[0]
    handleFile(file ?? null)
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    handleFile(file)
    if (e.target) e.target.value = ''
  }

  function remove() {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    onChange(null)
    setErrorMsg(null)
  }

  return (
    <div className={`ff-group ${className}`}>
      <div className={`iu-label-row ${showError ? 'iu-label-error' : ''}`}>
        <label className="ff-label-text">
          {label}{required && <span className="ff-required-star" aria-hidden="true"> *</span>}
        </label>
        {hint && !showError && <span className="iu-hint-text">{hint}</span>}
      </div>

      <div
        className={[
          'iu-zone',
          dragOver ? 'iu-dragover' : '',
          showError ? 'iu-error' : '',
          displayPreview ? 'iu-has-preview' : '',
          hasValue ? 'iu-has-value' : '',
        ].join(' ').trim()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => { setErrorMsg(null); if (!displayPreview) inputRef.current?.click() }}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ' ') && !displayPreview) {
            e.preventDefault()
            setErrorMsg(null)
            inputRef.current?.click()
          }
        }}
        aria-label={t('imageUploader.uploadImage') || 'Upload image'}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="iu-input"
          aria-hidden="true"
          tabIndex={-1}
        />

        <AnimatePresence mode="wait">
          {displayPreview ? (
            <motion.div
              className="iu-preview"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <img src={displayPreview} alt={t('imageUploader.previewImageAlt') || 'Preview'} className="iu-preview-img" loading="lazy" />
              <div className="iu-preview-overlay" aria-hidden="true">
                <button
                  className="iu-remove"
                  onClick={e => { e.stopPropagation(); remove() }}
                  aria-label={t('imageUploader.removeImage') || 'Remove image'}
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              className="iu-placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {dragOver ? (
                <>
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Upload size={32} className="iu-icon iu-icon-active" />
                  </motion.div>
                  <span className="iu-text-active">{t('imageUploader.dropHere') || 'Drop image here'}</span>
                  <span className="iu-hint-text">{t('imageUploader.releaseHint') || 'Release to upload'}</span>
                </>
              ) : (
                <>
                  <Image size={32} className="iu-icon" />
                  <span className="iu-text">{t('imageUploader.dropOrClick') || 'Drag & drop or click to upload'}</span>
                  <span className="iu-hint-text">{t('imageUploader.hint', { maxSize })}</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {(showError || errorMsg) && (
          <motion.div
            className="ff-msg ff-msg-error"
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -5, height: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            role="alert"
          >
            <AlertCircle size={12} aria-hidden="true" /> {errorMsg || error}
          </motion.div>
        )}
        {!showError && !errorMsg && hint && (
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
