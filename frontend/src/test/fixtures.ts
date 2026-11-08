import type { PlannedCheckpoint, PlannedRoute, RiskLevel, TripPlan } from '../api/client'

export const LOW: RiskLevel = { value: 0, label: 'Low' }
export const HIGH: RiskLevel = { value: 2, label: 'High' }
export const SEVERE: RiskLevel = { value: 3, label: 'Severe' }

export function checkpoint(
  mile: number,
  eta: string,
  level: RiskLevel | null = LOW,
): PlannedCheckpoint {
  return {
    latitude: 53,
    longitude: -7,
    mile,
    segment_miles: 10,
    eta,
    weather: level ? { wind_mph: 10, rain_in_per_hr: 0, snow_in_per_hr: 0 } : null,
    risk: level ? { level, wind: level, rain: LOW, snow: LOW, causes: ['wind'] } : null,
  }
}

export function plannedRoute(id: string, overrides: Partial<PlannedRoute> = {}): PlannedRoute {
  return {
    id,
    distance_miles: 130,
    duration_minutes: 150,
    points: [],
    score: { no_travel_miles: 0, severe_miles: 0, high_miles: 0, average_risk: 0 },
    unknown_weather_miles: 0,
    checkpoints: [checkpoint(0, '2026-11-09T08:00:00Z'), checkpoint(130, '2026-11-09T10:30:00Z')],
    ...overrides,
  }
}

export function tripPlan(routes: PlannedRoute[], overrides: Partial<TripPlan> = {}): TripPlan {
  return {
    recommended_route_id: routes[0]?.id ?? '',
    reason: 'The only route found',
    safe_to_travel: true,
    routes,
    timeline: [],
    ...overrides,
  }
}
