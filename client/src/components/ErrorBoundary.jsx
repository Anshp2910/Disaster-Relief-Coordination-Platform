import { Component } from 'react'

export default class ErrorBoundary extends Component {
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
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          padding: 20,
          background: 'var(--gov-bg)',
        }}>
          <div style={{
            maxWidth: 500,
            textAlign: 'center',
            padding: 40,
            background: 'var(--gov-card-bg)',
            borderRadius: 12,
            boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>&#9888;</div>
            <h2 style={{ fontSize: 20, background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-indigo))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: '0 0 12px' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 14, color: 'var(--gov-muted)', margin: '0 0 20px' }}>
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/dashboard'
              }}
              style={{
                background: 'linear-gradient(135deg, #4a80c0, #6b7fb5)',
                color: '#fff',
                border: 'none',
                padding: '10px 24px',
                borderRadius: 6,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
