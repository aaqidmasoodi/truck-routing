import type { PlannedRoute } from './api/client'
import { formatMiles } from './format'

export function routeName(route: PlannedRoute): string {
  return `Route ${route.id.replace('route-', '')}`
}

export function riskyMiles(route: PlannedRoute): string {
  const { no_travel_miles, severe_miles, high_miles } = route.score
  const parts = [
    [no_travel_miles, 'No Travel'],
    [severe_miles, 'Severe'],
    [high_miles, 'High'],
  ] as const
  const risky = parts.filter(([miles]) => miles >= 0.5)
  if (risky.length === 0) return 'No High or Severe weather'
  return risky.map(([miles, label]) => `${formatMiles(miles)} ${label}`).join(' · ')
}
