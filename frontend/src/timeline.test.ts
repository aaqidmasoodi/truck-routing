import { describe, expect, it } from 'vitest'
import type { TripPlan } from './api/client'
import { plannedRoute, tripPlan } from './test/fixtures'
import { planAt, unpackRow } from './timeline'

const calm = [0, 0, 0, 0, 5, 0, 0]
const gusty = [3, 3, 0, 0, 48, 0, 0]
const score = { no_travel_miles: 0, severe_miles: 0, high_miles: 0, average_risk: 0 }

function withTimeline(): TripPlan {
  const plan = tripPlan([plannedRoute('route-1'), plannedRoute('route-2')], {
    reason: '10 min faster',
  })
  return {
    ...plan,
    timeline: [
      {
        recommended_route_id: 'route-1',
        reason: '10 min faster',
        safe_to_travel: true,
        routes: [
          { id: 'route-1', score, unknown_weather_miles: 0, conditions: [calm, calm] },
          { id: 'route-2', score, unknown_weather_miles: 0, conditions: [calm, calm] },
        ],
      },
      {
        recommended_route_id: 'route-2',
        reason: '65 fewer miles of Severe weather',
        safe_to_travel: true,
        routes: [
          { id: 'route-2', score, unknown_weather_miles: 0, conditions: [calm, calm] },
          {
            id: 'route-1',
            score: { ...score, severe_miles: 65 },
            unknown_weather_miles: 0,
            conditions: [gusty, null],
          },
        ],
      },
    ],
  }
}

describe('unpackRow', () => {
  it('turns a row back into weather and risk', () => {
    expect(unpackRow([3, 3, 1, 0, 48, 0.12, 0])).toEqual({
      weather: { wind_mph: 48, rain_in_per_hr: 0.12, snow_in_per_hr: 0 },
      risk: {
        level: { value: 3, label: 'Severe' },
        wind: { value: 3, label: 'Severe' },
        rain: { value: 1, label: 'Moderate' },
        snow: { value: 0, label: 'Low' },
        causes: ['wind'],
      },
    })
  })

  it('has no causes when everything is Low', () => {
    expect(unpackRow(calm).risk?.causes).toEqual([])
  })

  it('is unknown without a forecast', () => {
    expect(unpackRow(null)).toEqual({ weather: null, risk: null })
  })
})

describe('planAt', () => {
  it('is the plan itself for leaving now', () => {
    const plan = withTimeline()

    expect(planAt(plan, 0)).toBe(plan)
  })

  it('re-ranks the routes for a later departure', () => {
    const later = planAt(withTimeline(), 1)

    expect(later.recommended_route_id).toBe('route-2')
    expect(later.reason).toBe('65 fewer miles of Severe weather')
    expect(later.routes.map((route) => route.id)).toEqual(['route-2', 'route-1'])
    expect(later.routes[1]?.score.severe_miles).toBe(65)
  })

  it("moves the arrival times and swaps in that hour's weather", () => {
    const route = planAt(withTimeline(), 1).routes[1]

    expect(route?.checkpoints[0]?.eta).toBe('2026-11-09T09:00:00.000Z')
    expect(route?.checkpoints[0]?.risk?.level.label).toBe('Severe')
    expect(route?.checkpoints[1]?.weather).toBeNull()
  })

  it('falls back to the plan when the hour is past the timeline', () => {
    const plan = withTimeline()

    expect(planAt(plan, 30)).toBe(plan)
  })
})
