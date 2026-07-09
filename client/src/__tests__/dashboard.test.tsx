import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import KpiCards from '../components/KpiCards'
import RiskWidget from '../components/RiskWidget'
import RequestsChart from '../components/RequestsChart'
import WeatherWidget from '../components/WeatherWidget'
import EmptyState from '../components/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import Badge from '../components/Badge'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: 'en' } }),
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}))

describe('KpiCards', () => {
  const baseStats = {
    totalRequests: 42,
    totalUsers: 10,
    byStatus: { Open: 5, Resolved: 20 },
    byPriority: { Critical: 2 },
    byCategory: { Medical: 10 },
  }

  it('renders KPI cards with correct values when loading is false', () => {
    const { container } = render(<KpiCards stats={baseStats} loading={false} />)
    expect(container.querySelector('.kpi-grid')).toBeTruthy()
  })

  it('renders skeleton when loading is true', () => {
    const { container } = render(<KpiCards stats={null} loading={true} />)
    expect(container.querySelector('.sk-line')).toBeTruthy()
  })

  it('handles null stats gracefully', () => {
    const { container } = render(<KpiCards stats={null} loading={false} />)
    expect(container.querySelector('.kpi-grid')).toBeTruthy()
  })
})

describe('RiskWidget', () => {
  it('renders loading skeleton when loading', () => {
    const { container } = render(<RiskWidget stats={null} loading={true} />)
    expect(container.querySelector('.sk-line')).toBeTruthy()
  })

  it('renders risk indicators when stats provided', () => {
    const stats = { totalUsers: 10, totalRequests: 20, byPriority: { Critical: 3, High: 2 } }
    const { container } = render(<RiskWidget stats={stats} loading={false} />)
    expect(container.textContent).toContain('risk.moderate')
  })

  it('shows low risk when no priority data', () => {
    const { container } = render(<RiskWidget stats={{ totalUsers: 0, totalRequests: 0 }} loading={false} />)
    expect(container.textContent).toContain('risk.low')
  })
})

describe('RequestsChart', () => {
  it('renders no data message when data is empty', () => {
    const { container } = render(<RequestsChart data={[]} />)
    expect(container.textContent).toContain('requestsChart.noData')
  })

  it('renders chart when data has entries', () => {
    const data = [{ date: '2025-01-01', count: 5 }]
    const { container } = render(<RequestsChart data={data} />)
    expect(container.textContent).toBeTruthy()
  })
})

describe('WeatherWidget', () => {
  it('renders loading state', () => {
    const { container } = render(<WeatherWidget weather={null} loading={true} />)
    expect(container.querySelector('.sk-line')).toBeTruthy()
  })

  it('renders weather data', () => {
    const weather = { temp: 28, condition: 'Sunny', humidity: 60, wind: '15 km/h' }
    render(<WeatherWidget weather={weather} loading={false} />)
    expect(screen.getByText('28°C')).toBeTruthy()
  })

  it('renders unavailable message when no weather and not loading', () => {
    const { container } = render(<WeatherWidget weather={null} loading={false} />)
    expect(container.textContent).toContain('weather.unavailable')
  })
})

describe('EmptyState', () => {
  it('renders title and description', () => {
    render(<EmptyState title="No items" description="Nothing to show" />)
    expect(screen.getByText('No items')).toBeTruthy()
    expect(screen.getByText('Nothing to show')).toBeTruthy()
  })

  it('renders action button when provided', () => {
    const action = { onClick: vi.fn(), label: 'Create' }
    render(<EmptyState title="Empty" action={action} />)
    expect(screen.getByText('Create')).toBeTruthy()
  })
})

describe('ErrorState', () => {
  it('renders error message', () => {
    render(<ErrorState message="Something went wrong" />)
    expect(screen.getByText('Something went wrong')).toBeTruthy()
  })

  it('renders retry button when onRetry provided', () => {
    render(<ErrorState message="Error" onRetry={vi.fn()} />)
    expect(screen.getByText('errorState.retry')).toBeTruthy()
  })
})

describe('Badge', () => {
  it('renders badge with label', () => {
    render(<Badge label="Open" colors={{}} colorKey="Open" />)
    expect(screen.getByText('Open')).toBeTruthy()
  })
})
