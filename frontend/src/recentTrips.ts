import type { Place } from './api/client'

/** The last few trips planned in this browser, newest first. */
export interface RecentTrip {
  origin: Place
  destination: Place
}

const KEY = 'truck-routing:recent-trips'
export const MAX_RECENT = 5

function samePlace(a: Place, b: Place): boolean {
  return a.latitude === b.latitude && a.longitude === b.longitude
}

function isPlace(value: unknown): value is Place {
  if (typeof value !== 'object' || value === null) return false
  const place = value as Record<string, unknown>
  return (
    typeof place.name === 'string' &&
    typeof place.display_name === 'string' &&
    typeof place.latitude === 'number' &&
    typeof place.longitude === 'number'
  )
}

/** What's saved, ignoring anything broken. Storage can be missing or blocked. */
export function loadRecentTrips(): RecentTrip[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(saved)) return []
    return saved
      .filter(
        (item): item is RecentTrip =>
          typeof item === 'object' &&
          item !== null &&
          isPlace((item as RecentTrip).origin) &&
          isPlace((item as RecentTrip).destination),
      )
      .slice(0, MAX_RECENT)
  } catch {
    return []
  }
}

/** Put a trip at the front, dropping any earlier copy of it, and save the list. */
export function rememberTrip(trips: RecentTrip[], trip: RecentTrip): RecentTrip[] {
  const others = trips.filter(
    (t) => !(samePlace(t.origin, trip.origin) && samePlace(t.destination, trip.destination)),
  )
  const next = [trip, ...others].slice(0, MAX_RECENT)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Private browsing or full storage: still remembered until the page closes.
  }
  return next
}

/** Every place from the recent trips, newest first, each once. */
export function recentPlaces(trips: RecentTrip[]): Place[] {
  const places: Place[] = []
  for (const { origin, destination } of trips) {
    for (const place of [origin, destination]) {
      if (!places.some((p) => samePlace(p, place))) places.push(place)
    }
  }
  return places.slice(0, MAX_RECENT)
}

/** "Srīnagar" and "Srinagar" read the same to a driver. */
function plain(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/** A place's short name, plus its region when another recent place has the same name. */
export function shortName(place: Place, others: Place[]): string {
  const clash = others.some(
    (other) => plain(other.name) === plain(place.name) && !samePlace(other, place),
  )
  return clash && place.region ? `${place.name}, ${place.region}` : place.name
}

/** "Denver → Chicago", telling apart places that share a name. */
export function tripLabel(trip: RecentTrip, trips: RecentTrip[]): string {
  const all = trips.flatMap((t) => [t.origin, t.destination])
  return `${shortName(trip.origin, all)} → ${shortName(trip.destination, all)}`
}
