import type { CheckpointRisk, PlannedCheckpoint, RiskLevel, Weather } from './api/client'

/**
 * The five risk levels in plain words, in calm traffic-light colours drivers already know.
 * The API keeps the brief's names (Low to No Travel); the page shows these.
 *
 * Each level has a solid `colour` for lines and markers on the map, and a soft tinted
 * `container` with darker `onContainer` text in the same hue for chips and banners.
 */
export interface Condition {
  label: string
  advice: string
  colour: string
  /** Icon colour that reads on top of `colour`. */
  text: string
  container: string
  onContainer: string
  /** The same soft tint and text for dark mode. */
  darkContainer: string
  onDarkContainer: string
}

export const CONDITIONS: readonly Condition[] = [
  {
    label: 'Clear',
    advice: 'Normal driving',
    colour: '#4c9a5b',
    text: '#ffffff',
    container: '#e3f1e6',
    onContainer: '#1f5130',
    darkContainer: '#1e3a26',
    onDarkContainer: '#b7e4c2',
  },
  {
    label: 'Caution',
    advice: 'Stay alert',
    colour: '#d9a521',
    text: '#3d2c00',
    container: '#fbf1d2',
    onContainer: '#6a4d00',
    darkContainer: '#3d3110',
    onDarkContainer: '#f5d98a',
  },
  {
    label: 'Slow down',
    advice: 'Reduce speed',
    colour: '#d9772f',
    text: '#ffffff',
    container: '#fbe6d6',
    onContainer: '#7f3a0a',
    darkContainer: '#43260f',
    onDarkContainer: '#f7c39b',
  },
  {
    label: 'Dangerous',
    advice: 'Avoid if you can',
    colour: '#c94a4a',
    text: '#ffffff',
    container: '#f8dede',
    onContainer: '#7f1f1f',
    darkContainer: '#4a1d1d',
    onDarkContainer: '#f4b4b4',
  },
  {
    label: 'Do not drive',
    advice: 'Wait it out',
    colour: '#3d3a40',
    text: '#ffffff',
    container: '#e4e1e6',
    onContainer: '#1d1b20',
    darkContainer: '#2e2c31',
    onDarkContainer: '#e6e1e6',
  },
]

export const NO_FORECAST: Condition = {
  label: 'No forecast',
  advice: 'Beyond the forecast',
  colour: '#9e9e9e',
  text: '#1b1b1f',
  container: '#eeeeee',
  onContainer: '#4a4a4a',
  darkContainer: '#2b2b2b',
  onDarkContainer: '#c4c4c4',
}

/** A condition's soft tint and text for the light or dark theme. */
export function tint(look: Condition, mode: 'light' | 'dark') {
  return mode === 'dark'
    ? { background: look.darkContainer, text: look.onDarkContainer }
    : { background: look.container, text: look.onContainer }
}

export function condition(level: RiskLevel | number | null | undefined): Condition {
  const value = typeof level === 'number' ? level : level?.value
  return value === undefined ? NO_FORECAST : (CONDITIONS[value] ?? NO_FORECAST)
}

export type Cause = 'wind' | 'rain' | 'snow'
export type MapLayer = 'overall' | Cause

export const CAUSE_NAMES: Record<Cause, string> = {
  wind: 'Strong wind',
  rain: 'Heavy rain',
  snow: 'Snow',
}

/** What each colour means in real units, from the brief's tables. */
export const BANDS: Record<Cause, readonly string[]> = {
  wind: ['Under 25 mph', '25–34 mph', '35–44 mph', '45–54 mph', '55 mph or more'],
  rain: ['Under 0.10 in/h', '0.10–0.25 in/h', '0.25–0.50 in/h', '0.50–1.00 in/h', 'Over 1 in/h'],
  snow: ['Under 0.5 in/h', '0.5–1 in/h', '1–2 in/h', '2–3 in/h', 'Over 3 in/h'],
}

/** "38 mph", "0.30 in/h": a condition's reading at a checkpoint. */
export function reading(cause: Cause, weather: Weather): string {
  if (cause === 'wind') return `${Math.round(weather.wind_mph)} mph`
  const rate = cause === 'rain' ? weather.rain_in_per_hr : weather.snow_in_per_hr
  return `${rate.toFixed(2)} in/h`
}

/** The level a checkpoint shows on a layer: its overall level, or one condition's. */
export function levelOn(layer: MapLayer, risk: CheckpointRisk | null): number | null {
  if (!risk) return null
  return layer === 'overall' ? risk.level.value : risk[layer].value
}

/** The condition to blame on a layer: that layer's own, or the worst one overall. */
export function causeOn(layer: MapLayer, risk: CheckpointRisk): Cause | null {
  if (layer !== 'overall') return layer
  const cause = risk.causes[0]
  return cause === 'wind' || cause === 'rain' || cause === 'snow' ? cause : null
}

/** "Slow down: strong wind", or just "Clear". */
export function describeRisk(risk: CheckpointRisk | null): string {
  if (!risk) return NO_FORECAST.label
  const { label } = condition(risk.level)
  const cause = causeOn('overall', risk)
  return cause ? `${label}: ${CAUSE_NAMES[cause].toLowerCase()}` : label
}

/** A stretch of road where conditions aren't clear, as one spot on the map. */
export interface TroubleSpot {
  level: number
  cause: Cause | null
  /** The checkpoint the marker sits on, in the middle of the stretch. */
  checkpoint: PlannedCheckpoint
  /** Where the stretch starts, for when the truck gets there. */
  first: PlannedCheckpoint
  /** The checkpoint with the strongest reading, for the numbers in the popup. */
  worst: PlannedCheckpoint
  fromMile: number
  toMile: number
  miles: number
}

/**
 * Neighbouring checkpoints with the same level and cause, joined into one spot, so a
 * long windy stretch is one marker rather than a dozen.
 */
export function troubleSpots(checkpoints: PlannedCheckpoint[], layer: MapLayer): TroubleSpot[] {
  const runs: PlannedCheckpoint[][] = []
  let key = ''
  for (const checkpoint of checkpoints) {
    const level = levelOn(layer, checkpoint.risk)
    if (level === null || level === 0 || !checkpoint.risk) {
      key = ''
      continue
    }
    const next = `${level}:${causeOn(layer, checkpoint.risk) ?? ''}`
    if (next === key) runs[runs.length - 1]!.push(checkpoint)
    else runs.push([checkpoint])
    key = next
  }
  return runs.map((run) => {
    const first = run[0]!
    const cause = causeOn(layer, first.risk!)
    const strength = (c: PlannedCheckpoint) =>
      !c.weather || !cause
        ? 0
        : cause === 'wind'
          ? c.weather.wind_mph
          : cause === 'rain'
            ? c.weather.rain_in_per_hr
            : c.weather.snow_in_per_hr
    return {
      level: levelOn(layer, first.risk)!,
      cause,
      checkpoint: run[Math.floor(run.length / 2)]!,
      first,
      worst: run.reduce((a, b) => (strength(b) > strength(a) ? b : a)),
      fromMile: first.mile,
      toMile: run[run.length - 1]!.mile,
      miles: run.reduce((sum, c) => sum + c.segment_miles, 0),
    }
  })
}
