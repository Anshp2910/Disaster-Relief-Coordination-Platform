import { Component, type ReactNode, type ErrorInfo, type PropsWithChildren } from 'react'
import { withTranslation, type WithTranslation } from 'react-i18next'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

type ErrorBoundaryProps = PropsWithChildren<WithTranslation>

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: WithTranslation) {
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
    const { t } = this.props
    if (this.state.hasError) {
      return (
        <div className="flex-center" role="alert">
          <div className="text-center p-2xl rounded-lg shadow">
            <div className="text-3xl mb-lg">&#9888;</div>
            <h1 className="text-xl text-gradient m-0 mb-sm">
              {t('common.somethingWentWrong')}
            </h1>
            <p className="text-sm text-muted m-0 mb-lg">
              {t('common.unexpectedError')}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/dashboard'
              }}
              className="btnPrimary"
              aria-label={t('common.goToDashboard')}
            >
              {t('common.goToDashboard')}
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default withTranslation()(ErrorBoundary)
