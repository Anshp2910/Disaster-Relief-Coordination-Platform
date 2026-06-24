import { Component } from 'react'
import { withTranslation } from 'react-i18next'

class ErrorBoundary extends Component {
  constructor(props) {
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

  handleUnhandledRejection(event) {
    console.error('[ErrorBoundary] Unhandled rejection:', event.reason)
    event.preventDefault()
    this.setState({ hasError: true, error: event.reason })
  }

  handleError(event) {
    console.error('[ErrorBoundary] Window error:', event.error || event.message)
    if (event.error) {
      this.setState({ hasError: true, error: event.error })
    }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  render() {
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
