import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ToastProvider, useToast } from '../components/Toast'

function ToastTrigger({ message, type }: { message: string; type?: 'info' | 'success' | 'error' | 'warning' }) {
  const toast = useToast()
  return <button onClick={() => toast(message, type)}>Show Toast</button>
}

function renderToast(message: string, type?: 'info' | 'success' | 'error' | 'warning') {
  return render(
    <ToastProvider>
      <ToastTrigger message={message} type={type} />
    </ToastProvider>,
  )
}

describe('Toast component interaction', () => {
  it('renders trigger button', () => {
    renderToast('Test message')
    expect(screen.getByText('Show Toast')).toBeInTheDocument()
  })

  it('shows toast on button click', () => {
    renderToast('Hello from toast')
    fireEvent.click(screen.getByText('Show Toast'))
    expect(screen.getByText('Hello from toast')).toBeInTheDocument()
  })

  it('shows success type toast with correct class', () => {
    renderToast('Success!', 'success')
    fireEvent.click(screen.getByText('Show Toast'))
    expect(screen.getByText('Success!')).toBeInTheDocument()
  })

  it('shows error type toast', () => {
    renderToast('Error!', 'error')
    fireEvent.click(screen.getByText('Show Toast'))
    expect(screen.getByText('Error!')).toBeInTheDocument()
  })

  it('uses fallback toast when no provider', () => {
    function UnwrappedTrigger() {
      const toast = useToast()
      return <button onClick={() => toast('fallback msg')}>Unwrapped</button>
    }
    render(<UnwrappedTrigger />)
    fireEvent.click(screen.getByText('Unwrapped'))
    expect(screen.queryByText('fallback msg')).not.toBeInTheDocument()
  })
})
