import { useState, useRef, useCallback, type DragEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  value, onChange, label, error, touched, required,
  className = '', accept = ACCEPT, maxSize = MAX_SIZE_MB,
  hint, previewUrl,
}: ImageUploaderProps) {
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const showError = touched && error

  const handleFile = useCallback((file: File | null) => {
    if (!file) { setPreview(null); onChange(null); return }
    if (file.size > maxSize * 1024 * 1024) {
      alert(`File too large. Max ${maxSize}MB.`)
      return
    }
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.')
      return
    }
    onChange(file)
    const url = URL.createObjectURL(file)
    setPreview(url)
  }, [maxSize, onChange])

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  function handleDragOver(e: DragEvent) { e.preventDefault(); setDragOver(true) }
  function handleDragLeave() { setDragOver(false) }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null
    handleFile(file)
    if (e.target) e.target.value = ''
  }

  function remove() {
    setPreview(null)
    onChange(null)
  }

  const displayPreview = preview || (previewUrl && !value ? previewUrl : null)

  return (
    <div className={`ff-group ${className}`}>
      <div className={`ff-label-text ${showError ? 'ff-label-error' : ''}`}>
        {label}{required ? ' *' : ''}
      </div>

      <div
        className={`iu-zone ${dragOver ? 'iu-dragover' : ''} ${showError ? 'iu-error' : ''} ${displayPreview ? 'iu-has-preview' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !displayPreview && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' && !displayPreview) inputRef.current?.click() }}
        aria-label="Upload image"
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="iu-input"
          aria-hidden="true"
        />

        <AnimatePresence mode="wait">
          {displayPreview ? (
            <motion.div
              className="iu-preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <img src={displayPreview} alt="Preview" className="iu-preview-img" loading="lazy" />
              <button
                className="iu-remove"
                onClick={e => { e.stopPropagation(); remove() }}
                aria-label="Remove image"
              >
                <X size={16} />
              </button>
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
                  <Upload size={28} className="iu-icon iu-icon-active" />
                  <span className="iu-text-active">Drop image here</span>
                </>
              ) : (
                <>
                  <Image size={28} className="iu-icon" />
                  <span className="iu-text">Drop an image or click to browse</span>
                  <span className="iu-hint">PNG, JPG, WEBP up to {maxSize}MB</span>
                </>
              )}
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
            <AlertCircle size={12} /> {error}
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
