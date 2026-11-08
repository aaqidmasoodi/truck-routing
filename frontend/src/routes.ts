import type { PlannedRoute, RiskLevel, TripPlan } from './api/client'
import { condition } from './conditions'
import { formatDuration, formatMiles } from './format'

export function routeName(route: PlannedRoute): string {
  return `Route ${route.id.replace('route-', '')}`
}

/** "Clear all the way", or the miles of each worse condition, worst first. */
export function riskyMiles(route: PlannedRoute): string {
  const { no_travel_miles, severe_miles, high_miles } = route.score
  const parts = [
    [no_travel_miles, 4],
    [severe_miles, 3],
    [high_miles, 2],
  ] as const
  const risky = parts.filter(([miles]) => miles >= 0.5)
  if (risky.length === 0) return 'No dangerous stretches'
  return risky
    .map(([miles, level]) => `${formatMiles(miles)} ${condition(level).label.toLowerCase()}`)
    .join(' · ')
}

export function checkpointName(index: number, count: number): string {
  if (index === 0) return 'Start'
  if (index === count - 1) return 'Destination'
  return `Checkpoint ${index}`
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
