import { useTranslation } from 'react-i18next'

const STEP_KEYS = ['Open', 'Pending', 'In Progress', 'Resolved', 'Fulfilled']

export default function SteppedProgress({ currentStatus, size = 'sm' }) {
  const { t } = useTranslation()
  const currentIndex = STEP_KEYS.indexOf(currentStatus)

  return (
    <div className={`stepped-progress stepped-progress--${size}`} role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemin={1} aria-valuemax={STEP_KEYS.length}>
      {STEP_KEYS.map((key, i) => {
        const state = i < currentIndex ? 'complete' : i === currentIndex ? 'current' : 'upcoming'
        return (
          <div key={key} className={`step step--${state}`}>
            <div className="step-indicator">
              {state === 'complete' ? (
                <svg className="step-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 8 7 12 13 4" />
                </svg>
              ) : (
                <span className="step-number">{i + 1}</span>
              )}
            </div>
            <span className="step-label">{t(`statuses.${key}`)}</span>
          </div>
        )
      })}
    </div>
  )
}
