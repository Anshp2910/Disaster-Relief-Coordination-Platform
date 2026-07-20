import { type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
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
  steps,
  currentStep,
  onStepChange,
  children,
  onNext,
  onPrev,
  onComplete,
  nextLabel,
  prevLabel,
  completeLabel,
  canNext = true,
  loading = false,
}: StepFormProps) {
  const { t } = useTranslation()
  const resolvedNext = nextLabel ?? t('stepForm.next')
  const resolvedPrev = prevLabel ?? t('stepForm.back')
  const resolvedComplete = completeLabel ?? t('stepForm.complete')
  const total = steps.length
  const progress = ((currentStep + 1) / total) * 100
  const isLast = currentStep === total - 1

  return (
    <div className="sf-container">
      <div className="sf-header" role="tablist" aria-label="Form steps">
        {steps.map((step, i) => {
          const isActive = i === currentStep
          const isDone = i < currentStep
          const stepLabelId = `sf-step-label-${i}`
          const stepDescId = `sf-step-desc-${i}`
          return (
            <div
              key={i}
              className={`sf-step ${isActive ? 'sf-step-active' : ''} ${isDone ? 'sf-step-done' : ''}`}
              onClick={() => { if (isDone) onStepChange(i) }}
              role="tab"
              id={stepLabelId}
              aria-selected={isActive}
              aria-controls={stepDescId}
              tabIndex={isDone ? 0 : -1}
              onKeyDown={e => { if (e.key === 'Enter' && isDone) onStepChange(i) }}
            >
              <div className="sf-step-indicator" aria-hidden="true">
                {isDone ? (
                  <Check size={14} />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <div className="sf-step-info">
                <div className="sf-step-title" id={stepDescId}>{step.title}</div>
                {step.description && <div className="sf-step-desc">{step.description}</div>}
              </div>
              {i < total - 1 && <div className={`sf-step-line ${isDone ? 'sf-step-line-done' : ''}`} aria-hidden="true" />}
            </div>
          )
        })}
      </div>

      <div className="sf-progress" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label={`Step ${currentStep + 1} of ${total}`}>
        <motion.div
          className="sf-progress-bar"
          initial={false}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      <motion.div
        className="sf-content"
        key={currentStep}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>

      <div className="sf-footer">
        <div className="sf-footer-info">
          {t('stepForm.stepOf', { current: currentStep + 1, total })}
        </div>
        <div className="sf-footer-actions">
          {currentStep > 0 && (
            <button
              type="button"
              className="sf-btn sf-btn-prev"
              onClick={onPrev}
              disabled={loading}
              aria-label={t('stepForm.back')}
            >
              <ChevronLeft size={16} aria-hidden="true" /> {resolvedPrev}
            </button>
          )}
          {isLast ? (
            <button
              type="button"
              className="sf-btn sf-btn-next sf-btn-complete"
              onClick={onComplete}
              disabled={!canNext || loading}
              aria-busy={loading}
            >
              {loading ? (
                <span className="sf-btn-loading">
                  <span className="sf-spinner" aria-hidden="true" />
                  {t('stepForm.processing')}
                </span>
              ) : (
                <span>{resolvedComplete} <Check size={16} aria-hidden="true" /></span>
              )}
            </button>
          ) : (
            <button
              type="button"
              className="sf-btn sf-btn-next"
              onClick={onNext}
              disabled={!canNext || loading}
              aria-disabled={!canNext || loading}
            >
              {resolvedNext} <ChevronRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
