import type { CheckpointRisk, PlannedRoute, RiskLevel, TripPlan } from './api/client'
import { formatDuration, formatMiles } from './format'

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

export function checkpointName(index: number, count: number): string {
  if (index === 0) return 'Start'
  if (index === count - 1) return 'Destination'
  return `Checkpoint ${index}`
}

/** "High because of rain", or "Low" when nothing stands out. */
export function explainRisk(risk: CheckpointRisk | null): string {
  if (!risk) return 'Unknown, no forecast for this time'
  if (risk.causes.length === 0) return risk.level.label
  const causes = risk.causes.join(' and ')
  return `${risk.level.label} because of ${causes}`
}

/** The worst risk anywhere on the route, or null if there's no forecast at all. */
export function worstRisk(route: PlannedRoute): RiskLevel | null {
  let worst: RiskLevel | null = null
  for (const checkpoint of route.checkpoints) {
    const level = checkpoint.risk?.level
    if (level && (!worst || level.value > worst.value)) worst = level
  }
  return worst
}

/** When the truck reaches the destination, as an ISO date-time. */
export function arrival(route: PlannedRoute): string | undefined {
  return route.checkpoints[route.checkpoints.length - 1]?.eta
}

export function fastestRoute(plan: TripPlan): PlannedRoute | undefined {
  return plan.routes.reduce<PlannedRoute | undefined>(
    (fastest, route) =>
      !fastest || route.duration_minutes < fastest.duration_minutes ? route : fastest,
    undefined,
  )
}

/** What choosing the safer route costs in time, if it isn't also the fastest. */
export function timeCost(plan: TripPlan): string | null {
  const best = plan.routes[0]
  const fastest = fastestRoute(plan)
  if (!best || !fastest || best.id === fastest.id) return null
  const extra = best.duration_minutes - fastest.duration_minutes
  if (extra < 1) return null
  return `${formatDuration(extra)} longer than ${routeName(fastest)}, the fastest`
}
