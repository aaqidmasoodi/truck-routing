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

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`
  const response = await fetch(url, init)
  debug('api', 'GET', url, response.status)
  if (!response.ok) throw new Error(`API error ${response.status}`)
  return (await response.json()) as T
}

export function getHealth(): Promise<{ status: string }> {
  return getJson('/api/health/')
}

export function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({ q: query })
  return getJson(`/api/places/?${params}`, signal ? { signal } : {})
}
