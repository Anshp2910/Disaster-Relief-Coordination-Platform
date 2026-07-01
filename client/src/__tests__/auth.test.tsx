import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'

const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true }
import i18n from '../i18n'
import Login from '../pages/Login'
import Register from '../pages/Register'

vi.mock('../api/client', () => ({
  clientApi: {
    login: vi.fn(),
    register: vi.fn(),
    socialLogin: vi.fn(),
  },
}))

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
    isAuthenticated: false,
    isAdmin: false,
    user: null,
    token: null,
    logout: vi.fn(),
    updateUser: vi.fn(),
    idleWarning: false,
    resetIdleTimer: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('../components/Toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { whileHover, whileTap, whileFocus, whileInView, initial, animate, exit, transition, variants, layout, layoutId, ...safe } = props
      return <div {...safe}>{children}</div>
    },
    button: ({ children, ...props }: any) => {
      const { whileHover, whileTap, whileFocus, whileInView, initial, animate, exit, transition, variants, layout, layoutId, ...safe } = props
      return <button {...safe}>{children}</button>
    },
    form: ({ children, ...props }: any) => {
      const { whileHover, whileTap, whileFocus, whileInView, initial, animate, exit, transition, variants, layout, layoutId, ...safe } = props
      return <form {...safe}>{children}</form>
    },
    h1: ({ children, ...props }: any) => {
      const { whileHover, whileTap, whileFocus, whileInView, initial, animate, exit, transition, variants, layout, layoutId, ...safe } = props
      return <h1 {...safe}>{children}</h1>
    },
    h2: ({ children, ...props }: any) => {
      const { whileHover, whileTap, whileFocus, whileInView, initial, animate, exit, transition, variants, layout, layoutId, ...safe } = props
      return <h2 {...safe}>{children}</h2>
    },
    p: ({ children, ...props }: any) => {
      const { whileHover, whileTap, whileFocus, whileInView, initial, animate, exit, transition, variants, layout, layoutId, ...safe } = props
      return <p {...safe}>{children}</p>
    },
  },
  AnimatePresence: ({ children }: any) => children,
}))

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter future={routerFuture}>
        {ui}
      </MemoryRouter>
    </I18nextProvider>
  )
}

describe('Login Page', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders login form', () => {
    renderWithProviders(<Login />)
    expect(screen.getByLabelText(/email/i)).toBeTruthy()
    expect(screen.getByLabelText('Password')).toBeTruthy()
    expect(screen.getByRole('button', { name: /login/i })).toBeTruthy()
  })

  it('shows validation error on empty submit', async () => {
    renderWithProviders(<Login />)
    const submitBtn = screen.getByRole('button', { name: /login/i })
    fireEvent.click(submitBtn)
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeRequired()
    })
  })

  it('has forgot password link', () => {
    renderWithProviders(<Login />)
    expect(screen.getByText(/forgot/i)).toBeTruthy()
  })

  it('has register link', () => {
    renderWithProviders(<Login />)
    expect(screen.getByText(/register/i)).toBeTruthy()
  })
})

describe('Register Page', () => {
  it('renders registration form', () => {
    renderWithProviders(<Register />)
    expect(screen.getByLabelText(/email/i)).toBeTruthy()
    expect(screen.getByLabelText(/full name/i)).toBeTruthy()
  })
})
