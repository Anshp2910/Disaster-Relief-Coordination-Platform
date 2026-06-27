import { RippleBtn } from '../components/ui'
import { Component, type ReactNode, type ErrorInfo } from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: ReactNode
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
    this.handleUnhandledRejection = this.handleUnhandledRejection.bind(this)
    this.handleError = this.handleError.bind(this)
  }

  componentDidMount() {
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection)
    window.addEventListener('error', this.handleError)
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection)
    window.removeEventListener('error', this.handleError)
  }

  handleUnhandledRejection(event: PromiseRejectionEvent) {
    console.error('[ErrorBoundary] Unhandled rejection:', event.reason)
    event.preventDefault()
  }

  handleError(event: ErrorEvent) {
    console.error('[ErrorBoundary] Window error:', event.error || event.message)
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
    try {
      const body = { message: error?.message, stack: error?.stack, componentStack: errorInfo?.componentStack, url: window.location.href, userAgent: navigator.userAgent }
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/log', new Blob([JSON.stringify(body)], { type: 'application/json' }))
      } else {
        fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {})
      }
    } catch (_) { console.error('[ErrorBoundary] Failed to log error to server') }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="error-page">
          <div className="error-card">
            <div className="error-brand-icon">
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <rect width="40" height="40" rx="10" fill="var(--danger)" />
                <path d="M20 8a2 2 0 0 1 2 2v18a2 2 0 0 1-4 0V10a2 2 0 0 1 2-2z" fill="white" />
                <path d="M12 16a2 2 0 0 1 2 2v10a2 2 0 0 1-4 0V18a2 2 0 0 1 2-2z" fill="white" opacity="0.8" />
                <path d="M28 12a2 2 0 0 1 2 2v14a2 2 0 0 1-4 0V14a2 2 0 0 1 2-2z" fill="white" opacity="0.9" />
              </svg>
            </div>

            <div className="error-icon" aria-hidden="true">⚠️</div>

            <h1 className="error-title">Something went wrong</h1>

            <p className="error-description">An unexpected error occurred. Please try again.</p>

            <div className="error-actions">
              <RippleBtn
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  window.location.hash = '#/dashboard'
                }}
                className="error-btn error-btn-primary"
                aria-label="Go to home"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Go to home
              </RippleBtn>

              <RippleBtn
                onClick={() => { this.setState({ hasError: false, error: null }); window.location.hash = '#/dashboard' }}
                className="error-btn error-btn-secondary"
                aria-label="Refresh page"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                Refresh Page
              </RippleBtn>
            </div>

            {this.state.error && (
              <details className="error-details">
                <summary className="error-details-summary">
                  Technical Details
                </summary>
                <pre className="error-details-pre">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
