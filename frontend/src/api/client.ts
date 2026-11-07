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

export interface RouteOption {
  id: string
  distance_miles: number
  duration_minutes: number
  points: [number, number][]
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

export function findRoutes(origin: Coordinates, destination: Coordinates): Promise<RouteOption[]> {
  return request('/api/routes/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin, destination }),
  })
}
