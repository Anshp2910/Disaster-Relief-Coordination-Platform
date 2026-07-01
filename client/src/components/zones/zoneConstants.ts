export interface Zone {
  _id: string
  name?: string
  description?: string
  severity?: string
  status?: string
  disasterType?: string
  centerLat?: number
  centerLng?: number
  radiusKm?: number
  affectedPopulation?: number
  openRequests?: number
  totalResources?: number
  coverageStatus?: string
  notes?: string
  stats?: {
    openRequests?: number
  }
}

export interface WeatherData {
  temperature?: number
  conditions?: string
  feelsLike?: number
  humidity?: number
  windSpeed?: number
  windGusts?: number
  precipitation?: number
  dailyPrecipitation?: number
}

export interface ZoneForm {
  name: string
  description: string
  centerLat: string
  centerLng: string
  radiusKm: string
  severity: string
  status: string
  disasterType: string
  affectedPopulation: string
  notes: string
}

export const SEVERITY_COLORS: Record<string, { fill: string; stroke: string; weight: number }> = {
  Critical: { fill: 'var(--severity-critical)', stroke: 'var(--severity-critical-stroke)', weight: 0.6 },
  High: { fill: 'var(--severity-high)', stroke: 'var(--severity-high-stroke)', weight: 0.5 },
  Medium: { fill: 'var(--severity-medium)', stroke: 'var(--severity-medium-stroke)', weight: 0.4 },
  Low: { fill: 'var(--severity-low)', stroke: 'var(--severity-low-stroke)', weight: 0.3 },
}

export const DISASTER_ICONS: Record<string, string> = {
  Flood: '[~]', Earthquake: '[/]', Cyclone: '[O]', Drought: '(sun)', Fire: '[F]', Landslide: '[^]', Other: '[.]',
}

export const COVERAGE_COLORS: Record<string, string> = {
  Covered: 'var(--coverage-covered)',
  Partial: 'var(--coverage-partial)',
  Gap: 'var(--coverage-gap)',
}

export const SEVERITY_OPTIONS = ['All', 'Critical', 'High', 'Medium', 'Low']
export const DISASTER_OPTIONS = ['All', ...Object.keys(DISASTER_ICONS)]
export const STATUS_OPTIONS = ['All', 'Active', 'Monitoring', 'Resolved', 'Closed']

export const DEFAULT_FORM: ZoneForm = {
  name: '', description: '', centerLat: '20.5937', centerLng: '78.9629', radiusKm: '10',
  severity: 'Medium', status: 'Active', disasterType: 'Other', affectedPopulation: '', notes: '',
}
