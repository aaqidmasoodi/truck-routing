import { describe, expect, it } from 'vitest'
import type { CheckpointRisk, RiskLevel } from './api/client'
import {
  BANDS,
  CONDITIONS,
  condition,
  describeRisk,
  levelOn,
  reading,
  troubleSpots,
} from './conditions'
import { checkpoint, HIGH, LOW, SEVERE } from './test/fixtures'

const level = (value: number): RiskLevel => ({ value: value as RiskLevel['value'], label: '' })

function risk(overall: number, causes: string[], wind = 0, rain = 0, snow = 0): CheckpointRisk {
  return {
    level: level(overall),
    wind: level(wind),
    rain: level(rain),
    snow: level(snow),
    causes,
  }
}

function at(mile: number, r: CheckpointRisk | null, wind = 10) {
  return {
    ...checkpoint(mile, '2026-11-09T08:00:00Z'),
    segment_miles: 10,
    risk: r,
    weather: { wind_mph: wind, rain_in_per_hr: 0, snow_in_per_hr: 0 },
  }
}

describe('conditions', () => {
  it('names the five levels in plain words, safest first', () => {
    expect(CONDITIONS.map((c) => c.label)).toEqual([
      'Clear',
      'Caution',
      'Slow down',
      'Dangerous',
      'Do not drive',
    ])
  })

  it('looks a level up by its value, from the API or as a number', () => {
    expect(condition(SEVERE).label).toBe('Dangerous')
    expect(condition(2).label).toBe('Slow down')
    expect(condition(null).label).toBe('No forecast')
  })

  it('gives every condition a band in real units for each level', () => {
    for (const bands of Object.values(BANDS)) expect(bands).toHaveLength(CONDITIONS.length)
    expect(BANDS.wind[4]).toBe('55 mph or more')
  })

  it('reads the weather in the units drivers use', () => {
    const weather = { wind_mph: 37.6, rain_in_per_hr: 0.3, snow_in_per_hr: 1.25 }
    expect(reading('wind', weather)).toBe('38 mph')
    expect(reading('rain', weather)).toBe('0.30 in/h')
    expect(reading('snow', weather)).toBe('1.25 in/h')
  })

  it('describes a checkpoint by its level and what caused it', () => {
    expect(describeRisk(risk(2, ['wind'], 2))).toBe('Slow down: strong wind')
    expect(describeRisk(risk(0, []))).toBe('Clear')
    expect(describeRisk(null)).toBe('No forecast')
  })

  it('takes one condition’s own level on its layer', () => {
    const r = risk(3, ['rain'], 1, 3, 0)
    expect(levelOn('overall', r)).toBe(3)
    expect(levelOn('wind', r)).toBe(1)
    expect(levelOn('snow', r)).toBe(0)
    expect(levelOn('wind', null)).toBeNull()
  })
})

describe('troubleSpots', () => {
  it('has nothing to show on a clear route', () => {
    const clear = [at(0, risk(0, [])), at(10, risk(0, [])), at(20, risk(0, []))]

    expect(troubleSpots(clear, 'overall')).toEqual([])
  })

  it('joins neighbouring checkpoints with the same problem into one spot', () => {
    const windy = risk(2, ['wind'], 2)
    const route = [at(0, risk(0, [])), at(10, windy, 36), at(20, windy, 41), at(30, windy, 38)]

    const [spot, ...rest] = troubleSpots(route, 'overall')

    expect(rest).toEqual([])
    expect(spot).toMatchObject({ level: 2, cause: 'wind', fromMile: 10, toMile: 30, miles: 30 })
    expect(spot?.worst.weather?.wind_mph).toBe(41)
    expect(spot?.checkpoint.mile).toBe(20)
    expect(spot?.first.mile).toBe(10)
    expect([spot?.fromIndex, spot?.toIndex]).toEqual([1, 3])
  })

  it('starts a new spot when the level or the cause changes', () => {
    const route = [
      at(0, risk(2, ['wind'], 2)),
      at(10, risk(3, ['wind'], 3)),
      at(20, risk(3, ['rain'], 0, 3)),
      at(30, risk(0, [])),
      at(40, risk(3, ['rain'], 0, 3)),
    ]

    expect(troubleSpots(route, 'overall').map((s) => [s.level, s.cause, s.fromMile])).toEqual([
      [2, 'wind', 0],
      [3, 'wind', 10],
      [3, 'rain', 20],
      [3, 'rain', 40],
    ])
  })

  it('looks only at the chosen condition on its layer', () => {
    const route = [at(0, risk(3, ['rain'], 1, 3)), at(10, risk(0, []))]

    expect(troubleSpots(route, 'wind')).toMatchObject([{ level: 1, cause: 'wind' }])
    expect(troubleSpots(route, 'snow')).toEqual([])
  })

  it('skips checkpoints with no forecast', () => {
    expect(
      troubleSpots([at(0, null), at(10, risk(HIGH.value, ['snow'], 0, 0, 2))], 'overall'),
    ).toHaveLength(1)
    expect(LOW.value).toBe(0)
  })
})
