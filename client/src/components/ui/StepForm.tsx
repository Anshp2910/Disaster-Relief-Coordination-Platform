import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

export interface Step {
  title: string
  description?: string
  icon?: ReactNode
}

interface StepFormProps {
  steps: Step[]
  currentStep: number
  onStepChange: (step: number) => void
  children: ReactNode
  onNext?: () => void
  onPrev?: () => void
  onComplete?: () => void
  nextLabel?: string
  prevLabel?: string
  completeLabel?: string
  canNext?: boolean
  loading?: boolean
}

export default function StepForm({
  steps, currentStep, onStepChange, children,
  onNext, onPrev, onComplete,
  nextLabel = 'Next', prevLabel = 'Back', completeLabel = 'Complete',
  canNext = true, loading = false,
}: StepFormProps) {
  const total = steps.length
  const progress = ((currentStep + 1) / total) * 100
  const isLast = currentStep === total - 1

  return (
    <div className="sf-container">
      {/* Header */}
      <div className="sf-header">
        {steps.map((step, i) => {
          const isActive = i === currentStep
          const isDone = i < currentStep
          return (
            <div
              key={i}
              className={`sf-step ${isActive ? 'sf-step-active' : ''} ${isDone ? 'sf-step-done' : ''}`}
              onClick={() => { if (isDone) onStepChange(i) }}
              role="tab"
              aria-selected={isActive}
              tabIndex={isDone ? 0 : -1}
              onKeyDown={e => { if (e.key === 'Enter' && isDone) onStepChange(i) }}
            >
              <div className="sf-step-indicator">
                {isDone ? (
                  <Check size={14} aria-hidden="true" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <div className="sf-step-info">
                <div className="sf-step-title">{step.title}</div>
                {step.description && <div className="sf-step-desc">{step.description}</div>}
              </div>
              {i < total - 1 && <div className={`sf-step-line ${isDone ? 'sf-step-line-done' : ''}`} />}
            </div>
          )
        })}
      </div>

      {/* Progress bar */}
      <div className="sf-progress">
        <motion.div
          className="sf-progress-bar"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* Content */}
      <motion.div
        className="sf-content"
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>

      {/* Footer */}
      <div className="sf-footer">
        <div className="sf-footer-info">
          Step {currentStep + 1} of {total}
        </div>
        <div className="sf-footer-actions">
          {currentStep > 0 && (
            <button
              type="button"
              className="sf-btn sf-btn-prev"
              onClick={onPrev}
              disabled={loading}
            >
              <ChevronLeft size={16} aria-hidden="true" /> {prevLabel}
            </button>
          )}
          {isLast ? (
            <button
              type="button"
              className="sf-btn sf-btn-next"
              onClick={onComplete}
              disabled={!canNext || loading}
            >
              {loading ? 'Processing...' : completeLabel} {!loading && <Check size={16} aria-hidden="true" />}
            </button>
          ) : (
            <button
              type="button"
              className="sf-btn sf-btn-next"
              onClick={onNext}
              disabled={!canNext || loading}
            >
              {nextLabel} <ChevronRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
