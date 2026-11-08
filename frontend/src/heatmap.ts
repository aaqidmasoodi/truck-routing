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

/** The point halfway along a path, measured along the path itself. */
export function midpointAlong(path: LatLng[]): LatLng | null {
  if (path.length === 0) return null
  const legs = path.slice(1).map((point, i) => milesBetween(path[i]!, point))
  let left = legs.reduce((sum, miles) => sum + miles, 0) / 2
  for (const [i, miles] of legs.entries()) {
    if (left <= miles) {
      const share = miles > 0 ? left / miles : 0
      const [lat1, lon1] = path[i]!
      const [lat2, lon2] = path[i + 1]!
      return [lat1 + (lat2 - lat1) * share, lon1 + (lon2 - lon1) * share]
    }
    left -= miles
  }
  return path[path.length - 1]!
}
