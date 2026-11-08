import { debug } from '../debug'
import type { components } from './schema'

const API_URL = import.meta.env.VITE_API_URL ?? ''

// Generated from the backend's OpenAPI schema; run `npm run gen:api` after API changes.
type Schemas = components['schemas']

export type Place = Schemas['Place']
export type Coordinates = Schemas['Coordinates']
export type Weather = Schemas['Weather']
export type CheckpointRisk = Schemas['Risk']
export type RiskLevel = CheckpointRisk['level']
export type PlannedCheckpoint = Schemas['PlannedCheckpoint']
export type RouteScore = Schemas['RouteScore']
export type PlannedRoute = Schemas['PlannedRoute']
export type TripPlan = Schemas['TripPlan']
export type Spacing = Schemas['SpacingMilesEnum']

export interface Trip {
  origin: Coordinates
  destination: Coordinates
  weightLb: number
  spacingMiles: Spacing
  /** When the truck leaves, as an ISO date-time. Leave it out to mean now. */
  departure?: string
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Full address of an API path, for links as well as requests. */
export function apiUrl(path: string): string {
  return `${API_URL}${path}`
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = apiUrl(path)
  const response = await fetch(url, init)
  debug('api', init.method ?? 'GET', url, response.status)
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null
    throw new ApiError(response.status, body?.detail ?? `API error ${response.status}`)
  }
  return (await response.json()) as T
}

export function getHealth(): Promise<Schemas['Health']> {
  return request('/api/health/')
}

export function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ q: query })
  return request(`/api/places/?${params}`, signal ? { signal } : {})
}

// The free routing and weather services sometimes drop a request and answer the next.
const RETRY_STATUSES = new Set([502, 503, 504])

function worthRetrying(error: unknown): boolean {
  if (error instanceof ApiError) return RETRY_STATUSES.has(error.status)
  return error instanceof TypeError // fetch's way of saying the network failed
}

/** Try `attempt` up to `times` times, waiting a little longer after each failure. */
export async function retrying<T>(
  attempt: () => Promise<T>,
  { times = 3, waitMs = 800 }: { times?: number; waitMs?: number } = {},
): Promise<T> {
  for (let tries = 1; ; tries++) {
    try {
      return await attempt()
    } catch (error) {
      if (tries >= times || !worthRetrying(error)) throw error
      debug('api', `attempt ${tries} failed, trying again`, error)
      await new Promise((resolve) => setTimeout(resolve, waitMs * tries))
    }
  }
}

export function planTrip(trip: Trip): Promise<TripPlan> {
  const body: Schemas['PlanRequest'] = {
    origin: { latitude: trip.origin.latitude, longitude: trip.origin.longitude },
    destination: { latitude: trip.destination.latitude, longitude: trip.destination.longitude },
    weight_lb: trip.weightLb,
    spacing_miles: trip.spacingMiles,
    ...(trip.departure ? { departure: trip.departure } : {}),
  }
  return retrying(() =>
    request<TripPlan>('/api/plan/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}
