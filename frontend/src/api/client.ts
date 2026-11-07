import { debug } from '../debug'

const API_URL = import.meta.env.VITE_API_URL ?? ''

export async function getHealth(): Promise<{ status: string }> {
  const url = `${API_URL}/api/health/`
  const response = await fetch(url)
  debug('api', 'GET', url, response.status)
  if (!response.ok) throw new Error(`API error ${response.status}`)
  return response.json()
}
