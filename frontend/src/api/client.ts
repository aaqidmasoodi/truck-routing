const API_URL = import.meta.env.VITE_API_URL ?? ''

export async function getHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_URL}/api/health/`)
  if (!response.ok) throw new Error(`API error ${response.status}`)
  return response.json()
}
