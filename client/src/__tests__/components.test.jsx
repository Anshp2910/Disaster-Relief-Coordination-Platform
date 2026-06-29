import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true }
import { I18nextProvider } from 'react-i18next'
import i18n from '../i18n'
import { SkeletonLine, SkeletonCard, SkeletonList, SkeletonMap } from '../components/Skeleton'
import ErrorBoundary from '../components/ErrorBoundary'
import { escapeHtml } from '../utils/escapeHtml'
import { useDebounce } from '../hooks/useDebounce'
import { formatDate } from '../utils/formatDate'

// eslint-disable-next-line no-unused-vars
function wrap(ui) {
  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}

describe('Skeleton components', () => {
  it('SkeletonLine renders', () => {
    const { container } = render(<SkeletonLine />)
    expect(container.querySelector('.sk-line')).toBeTruthy()
  })

  it('SkeletonCard renders correct lines', () => {
    const { container } = render(<SkeletonCard lines={2} />)
    expect(container.querySelectorAll('.sk-line').length).toBe(2)
  })

  it('SkeletonList renders correct count', () => {
    const { container } = render(<SkeletonList count={3} lines={1} />)
    expect(container.querySelectorAll('.sk-card').length).toBe(3)
  })

  it('SkeletonMap renders with height style', () => {
    const { container } = render(<SkeletonMap height="50vh" />)
    const el = container.querySelector('.sk-map')
    expect(el).toBeTruthy()
    expect(el.style.height).toBe('50vh')
  })
})

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    const { getByText } = render(<ErrorBoundary><div>child</div></ErrorBoundary>)
    expect(getByText('child')).toBeTruthy()
  })

  it('renders error UI on error', () => {
    const Thrower = () => { throw new Error('test') }
    const { container } = render(<ErrorBoundary><Thrower /></ErrorBoundary>)
    expect(container.textContent).toMatch(/something went wrong/i)
  })
})

describe('escapeHtml', () => {
  it('escapes special chars', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
  })

  it('handles null/undefined', () => {
    expect(escapeHtml(null)).toBe('')
    expect(escapeHtml(undefined)).toBe('')
  })

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('')
  })
})

describe('useDebounce', () => {
  it('returns initial value immediately', () => {
    function Test() {
      const val = useDebounce('hello', 500)
      return <div>{val}</div>
    }
    const { container } = render(<Test />)
    expect(container.textContent).toBe('hello')
  })
})

describe('formatDate', () => {
  it('formats a date string', () => {
    const result = formatDate('2025-01-15')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('handles Date object', () => {
    const result = formatDate(new Date('2025-06-01'))
    expect(typeof result).toBe('string')
  })
})

import { RippleBtn } from '../components/ui'
import { PageTransition } from '../components/ui'
import { AnimatedCounter } from '../components/ui'
import Modal from '../components/ui/Modal'
import ErrorState from '../components/ui/ErrorState'

describe('RippleBtn', () => {
  it('renders children', () => {
    render(<RippleBtn>Click me</RippleBtn>)
    expect(screen.getByText('Click me')).toBeTruthy()
  })
  it('applies className', () => {
    const { container } = render(<RippleBtn className="test-class">Btn</RippleBtn>)
    expect(container.querySelector('.rp-btn.test-class')).toBeTruthy()
  })
  it('supports disabled state', () => {
    render(<RippleBtn disabled>Btn</RippleBtn>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
  it('sets aria-label', () => {
    render(<RippleBtn aria-label="Submit form">Btn</RippleBtn>)
    expect(screen.getByLabelText('Submit form')).toBeTruthy()
  })
  it('renders as submit type', () => {
    render(<RippleBtn type="submit">Btn</RippleBtn>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })
})

describe('PageTransition', () => {
  it('renders children inside motion.div', () => {
    const { container } = render(
      <MemoryRouter future={routerFuture}>
        <PageTransition><div>content</div></PageTransition>
      </MemoryRouter>
    )
    expect(container.textContent).toContain('content')
  })
})

describe('AnimatedCounter', () => {
  it('renders the target value', () => {
    const { container } = render(<AnimatedCounter to={100} />)
    expect(container.textContent).toBeTruthy()
  })
})

describe('Modal', () => {
  it('renders when open', () => {
    render(<Modal open onClose={() => {}} title="Test Modal"><p>content</p></Modal>)
    expect(screen.getByText('Test Modal')).toBeTruthy()
  })
  it('has dialog role', () => {
    render(<Modal open onClose={() => {}} title="Test"><p>c</p></Modal>)
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
  it('does not render when closed', () => {
    render(<Modal open={false} onClose={() => {}} title="Test"><p>c</p></Modal>)
    expect(screen.queryByText('Test')).toBeNull()
  })
})

describe('ErrorState', () => {
  it('renders message', () => {
    render(<ErrorState message="Something broke" />)
    expect(screen.getByText('Something broke')).toBeTruthy()
  })
  it('renders retry button when onRetry provided', () => {
    render(<ErrorState message="Broke" onRetry={() => {}} />)
    expect(screen.getByText(/retry/i)).toBeTruthy()
  })
})
