import type { PlannedCheckpoint } from './api/client'
import type { LatLng } from './map'

const EARTH_RADIUS_MILES = 3958.8

export function milesBetween([lat1, lon1]: LatLng, [lat2, lon2]: LatLng): number {
  const rad = Math.PI / 180
  const h =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h))
}

export interface Stretch {
  /** Which checkpoint this stretch of road belongs to. */
  checkpoint: number
  positions: LatLng[]
}

/**
 * Cut the road into one stretch per checkpoint, splitting halfway between neighbours,
 * the same way the server shares the miles out. Stretches meet end to end.
 */
export function stretches(
  points: LatLng[],
  checkpoints: PlannedCheckpoint[],
  roadMiles: number,
): Stretch[] {
  if (points.length < 2 || checkpoints.length === 0) return []

  const along = [0]
  for (let i = 1; i < points.length; i++) {
    along.push(along[i - 1]! + milesBetween(points[i - 1]!, points[i]!))
  }
  const shapeMiles = along[along.length - 1]!
  const toShape = roadMiles > 0 ? shapeMiles / roadMiles : 1
  // Shape miles where one checkpoint's stretch ends and the next begins.
  const cuts = checkpoints
    .slice(1)
    .map((checkpoint, i) => ((checkpoints[i]!.mile + checkpoint.mile) / 2) * toShape)

  const result: Stretch[] = [{ checkpoint: 0, positions: [points[0]!] }]
  for (let i = 1; i < points.length; i++) {
    let current = result[result.length - 1]!
    // A cut can fall between two points; finish the stretch exactly there.
    while (current.checkpoint < cuts.length && along[i]! >= cuts[current.checkpoint]!) {
      const cut = cuts[current.checkpoint]!
      const gap = along[i]! - along[i - 1]!
      const share = gap > 0 ? (cut - along[i - 1]!) / gap : 0
      const [lat1, lon1] = points[i - 1]!
      const [lat2, lon2] = points[i]!
      const joint: LatLng = [lat1 + (lat2 - lat1) * share, lon1 + (lon2 - lon1) * share]
      current.positions.push(joint)
      current = { checkpoint: current.checkpoint + 1, positions: [joint] }
      result.push(current)
    }
    current.positions.push(points[i]!)
  }
  return result
}

export type HeatLayer = 'risk' | 'wind' | 'rain' | 'snow'

// Where each scale tops out: the edge of No Travel for that condition.
export const HEAT_TOP = { wind: 55, rain: 1, snow: 3 } as const
// The light ends are deep enough to still show up on the pale basemap.
const HEAT_RAMP = {
  wind: ['#b2dfdb', '#004d40'],
  rain: ['#bbdefb', '#0d47a1'],
  snow: ['#e1bee7', '#4a148c'],
} as const
export const NO_DATA = '#bdbdbd'

function mix(from: string, to: string, share: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
  const parts = [0, 1, 2].map((i) =>
    Math.round(channel(from, i) + (channel(to, i) - channel(from, i)) * share),
  )
  return `#${parts.map((part) => part.toString(16).padStart(2, '0')).join('')}`
}

/** The colour of a weather value on its layer's light-to-dark scale. */
export function heatColour(layer: Exclude<HeatLayer, 'risk'>, value: number): string {
  const share = Math.min(Math.max(value / HEAT_TOP[layer], 0), 1)
  const [from, to] = HEAT_RAMP[layer]
  return mix(from, to, share)
}

export function heatRamp(layer: Exclude<HeatLayer, 'risk'>): readonly [string, string] {
  return HEAT_RAMP[layer]
}
