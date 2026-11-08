import type { CheckpointRisk, RiskLevel, TripPlan, Weather } from './api/client'

const LABELS = ['Low', 'Moderate', 'High', 'Severe', 'No Travel'] as const
const CONDITIONS = ['wind', 'rain', 'snow'] as const
const HOUR_MS = 60 * 60 * 1000

function level(value: number): RiskLevel {
  const clamped = Math.min(Math.max(Math.round(value), 0), 4) as RiskLevel['value']
  return { value: clamped, label: LABELS[clamped] }
}

/** Unpack one timeline row: [risk, wind risk, rain risk, snow risk, wind, rain, snow]. */
export function unpackRow(row: number[] | null): {
  weather: Weather | null
  risk: CheckpointRisk | null
} {
  if (!row || row.length < 7) return { weather: null, risk: null }
  const [overall = 0, wind = 0, rain = 0, snow = 0, windMph = 0, rainRate = 0, snowRate = 0] = row
  const perCondition = [wind, rain, snow]
  return {
    weather: { wind_mph: windMph, rain_in_per_hr: rainRate, snow_in_per_hr: snowRate },
    risk: {
      level: level(overall),
      wind: level(wind),
      rain: level(rain),
      snow: level(snow),
      causes: overall > 0 ? CONDITIONS.filter((_, i) => perCondition[i] === overall) : [],
    },
  }
}

function later(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * HOUR_MS).toISOString()
}

/**
 * The plan as it would be if the truck left `hours` later, built from the timeline the
 * server sent, so the slider can move without another request.
 */
export function planAt(plan: TripPlan, hours: number): TripPlan {
  const moment = plan.timeline[hours]
  if (hours === 0 || !moment) return plan

  const byId = new Map(plan.routes.map((route) => [route.id, route]))
  const routes = moment.routes.flatMap((now) => {
    const route = byId.get(now.id)
    if (!route) return []
    return [
      {
        ...route,
        score: now.score,
        unknown_weather_miles: now.unknown_weather_miles,
        checkpoints: route.checkpoints.map((checkpoint, i) => ({
          ...checkpoint,
          eta: later(checkpoint.eta, hours),
          ...unpackRow(now.conditions[i] ?? null),
        })),
      },
    ]
  })

  return {
    ...plan,
    recommended_route_id: moment.recommended_route_id,
    reason: moment.reason,
    safe_to_travel: moment.safe_to_travel,
    routes,
  }
}
