import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'
import i18n from '../i18n'
import { NavBar } from '../components/NavBar'
import Layout from '../components/Layout'

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', displayName: 'Test User', email: 'test@test.com', role: 'admin' },
    isAuthenticated: true,
    isAdmin: true,
    logout: vi.fn(),
    token: 'test-token',
    login: vi.fn(),
    updateUser: vi.fn(),
    idleWarning: false,
    resetIdleTimer: vi.fn(),
  }),
}))

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'dark',
    toggleTheme: vi.fn(),
    togglePremiumTheme: vi.fn(),
    isPremium: false,
    isEmergency: false,
    setIsEmergency: vi.fn(),
    toggleEmergency: vi.fn(),
    isHighContrast: false,
    setIsHighContrast: vi.fn(),
    isSocketConnected: true,
    setIsSocketConnected: vi.fn(),
  }),
}))

vi.mock('../hooks/useSocket', () => ({
  useSocket: () => ({
    socket: null,
    connected: true,
    notifications: [],
    unreadCount: 0,
    markAsRead: vi.fn(),
    markAllRead: vi.fn(),
    clearAll: vi.fn(),
  }),
  registerRefreshListener: () => () => {},
}))

vi.mock('../hooks/usePwaInstall', () => ({
  usePwaInstall: () => ({ canInstall: false, install: vi.fn() }),
}))

vi.mock('../components/NotificationBell', () => ({
  default: () => null,
}))

vi.mock('../components/CommandPalette', () => ({ CommandPalette: () => null }))
vi.mock('../components/SosFab', () => ({ SosFab: () => null }))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    main: ({ children, ...props }: any) => <main {...props}>{children}</main>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/dashboard']}>
        {ui}
      </MemoryRouter>
    </I18nextProvider>
  )
}

describe('Accessibility checks', () => {
  it('NavBar has proper ARIA attributes', () => {
    const { container } = renderWithProviders(<NavBar />)
    const nav = container.querySelector('nav[aria-label="Main navigation"]')
    expect(nav).toBeTruthy()
  })

  it('Layout has skip-to-content link', () => {
    const { container } = renderWithProviders(<Layout>test</Layout>)
    expect(container.querySelector('.skip-link')).toBeTruthy()
  })

  it('theme toggle has accessible labels', () => {
    const { container } = renderWithProviders(<NavBar />)
    const themeBtn = container.querySelector('button[aria-label*="Switch to"]')
    expect(themeBtn).toBeTruthy()
  })

  it('language selector has accessible label', () => {
    const { container } = renderWithProviders(<NavBar />)
    const langSelect = container.querySelector('select[aria-label="Select language"]')
    expect(langSelect).toBeTruthy()
  })
})
