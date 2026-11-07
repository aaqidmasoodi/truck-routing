import { debug } from '../debug'

const API_URL = import.meta.env.VITE_API_URL ?? ''

export interface Place {
  name: string
  region: string
  country: string
  display_name: string
  latitude: number
  longitude: number
}

export interface Coordinates {
  latitude: number
  longitude: number
}

export interface Weather {
  wind_mph: number
  rain_in_per_hr: number
  snow_in_per_hr: number
}

export interface Checkpoint {
  latitude: number
  longitude: number
  mile: number
  segment_miles: number
  eta: string
  /** Forecast for when the truck gets there; null if it's past the forecast or unavailable. */
  weather: Weather | null
}

export interface RouteOption {
  id: string
  distance_miles: number
  duration_minutes: number
  points: [number, number][]
  checkpoints: Checkpoint[]
}

export type Spacing = 10 | 25 | 50

export interface RiskLevel {
  /** 0 Low, 1 Moderate, 2 High, 3 Severe, 4 No Travel */
  value: 0 | 1 | 2 | 3 | 4
  label: string
}

export interface CheckpointRisk {
  level: RiskLevel
  wind: RiskLevel
  rain: RiskLevel
  snow: RiskLevel
  /** Which conditions set the overall level, e.g. ["wind"]. Empty when it's Low. */
  causes: string[]
}

export interface PlannedCheckpoint extends Checkpoint {
  risk: CheckpointRisk | null
}

export interface RouteScore {
  no_travel_miles: number
  severe_miles: number
  high_miles: number
  average_risk: number
}

export interface PlannedRoute extends Omit<RouteOption, 'checkpoints'> {
  score: RouteScore
  unknown_weather_miles: number
  checkpoints: PlannedCheckpoint[]
}

export interface TripPlan {
  recommended_route_id: string
  /** Why the recommended route beats the next best, in plain words. */
  reason: string
  /** False when even the best route runs into No Travel weather. */
  safe_to_travel: boolean
  /** Safest first. */
  routes: PlannedRoute[]
}

export interface Trip {
  origin: Coordinates
  destination: Coordinates
  weightLb: number
  spacingMiles: Spacing
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${API_URL}${path}`
  const response = await fetch(url, init)
  debug('api', init.method ?? 'GET', url, response.status)
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null
    throw new ApiError(response.status, body?.detail ?? `API error ${response.status}`)
  }
  return (await response.json()) as T
}

export function getHealth(): Promise<{ status: string }> {
  return request('/api/health/')
}

export function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ q: query })
  return request(`/api/places/?${params}`, signal ? { signal } : {})
}

export function findRoutes(
  origin: Coordinates,
  destination: Coordinates,
  spacingMiles: Spacing = 25,
): Promise<RouteOption[]> {
  return request('/api/routes/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin, destination, spacing_miles: spacingMiles }),
  })
}

export function planTrip(trip: Trip): Promise<TripPlan> {
  return request('/api/plan/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin: { latitude: trip.origin.latitude, longitude: trip.origin.longitude },
      destination: { latitude: trip.destination.latitude, longitude: trip.destination.longitude },
      weight_lb: trip.weightLb,
      spacing_miles: trip.spacingMiles,
    }),
  })
}
