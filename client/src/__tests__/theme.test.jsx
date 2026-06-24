import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider, useTheme } from '../context/ThemeContext'

function TestConsumer() {
  const { mode, resolvedTheme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button data-testid="set-light" onClick={() => setTheme('light')}>Light</button>
      <button data-testid="set-dark" onClick={() => setTheme('dark')}>Dark</button>
      <button data-testid="set-system" onClick={() => setTheme('system')}>System</button>
    </div>
  )
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear()
    window.document.documentElement.classList.remove('dark')
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  it('provides default theme with system mode and dark resolved', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )
    expect(screen.getByTestId('mode').textContent).toBe('system')
    expect(screen.getByTestId('resolved').textContent).toBe('dark')
  })

  it('renders children', () => {
    render(
      <ThemeProvider>
        <div data-testid="child">Hello World</div>
      </ThemeProvider>
    )
    expect(screen.getByTestId('child')).toBeTruthy()
    expect(screen.getByText('Hello World')).toBeTruthy()
  })

  it('uses light theme from localStorage', () => {
    localStorage.setItem('theme', 'light')
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )
    expect(screen.getByTestId('mode').textContent).toBe('light')
    expect(screen.getByTestId('resolved').textContent).toBe('light')
  })

  it('uses dark theme from localStorage', () => {
    localStorage.setItem('theme', 'dark')
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )
    expect(screen.getByTestId('mode').textContent).toBe('dark')
    expect(screen.getByTestId('resolved').textContent).toBe('dark')
  })

  it('toggles theme to dark on setTheme', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )
    fireEvent.click(screen.getByTestId('set-dark'))
    expect(screen.getByTestId('mode').textContent).toBe('dark')
    expect(screen.getByTestId('resolved').textContent).toBe('dark')
  })

  it('toggles theme back to light', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )
    fireEvent.click(screen.getByTestId('set-dark'))
    fireEvent.click(screen.getByTestId('set-light'))
    expect(screen.getByTestId('mode').textContent).toBe('light')
    expect(screen.getByTestId('resolved').textContent).toBe('light')
  })

  it('sets theme to system and resolves from media query', () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )
    fireEvent.click(screen.getByTestId('set-system'))
    expect(screen.getByTestId('mode').textContent).toBe('system')
    expect(screen.getByTestId('resolved').textContent).toBe('light')
  })

  it('applies dark class to document.documentElement', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )
    fireEvent.click(screen.getByTestId('set-dark'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    fireEvent.click(screen.getByTestId('set-light'))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('saves theme preference to localStorage', () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    )
    fireEvent.click(screen.getByTestId('set-dark'))
    expect(localStorage.getItem('theme')).toBe('dark')
    fireEvent.click(screen.getByTestId('set-light'))
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('throws when useTheme is used outside ThemeProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow()
    spy.mockRestore()
  })
})
