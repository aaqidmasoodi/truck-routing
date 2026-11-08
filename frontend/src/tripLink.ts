import type { Place, Spacing } from './api/client'
import { emptyDraft, type TripDraft } from './tripDraft'

/**
 * A trip in the page address, so a link opens straight onto the same plan:
 * ?from=39.739,-104.985&fromName=Denver,…&to=…&toName=…&w=65000&every=25&leave=…
 */

const SPACINGS: Spacing[] = [10, 25, 50]

function coords(place: Place): string {
  return `${place.latitude.toFixed(5)},${place.longitude.toFixed(5)}`
}

/** The link's query string for a trip, or '' if it doesn't have both ends yet. */
export function tripSearch(draft: TripDraft): string {
  if (!draft.origin || !draft.destination) return ''
  const params = new URLSearchParams({
    from: coords(draft.origin),
    fromName: draft.origin.display_name,
    to: coords(draft.destination),
    toName: draft.destination.display_name,
    w: draft.weightText.replaceAll(',', ''),
    every: String(draft.spacing),
  })
  if (draft.leaveAt) params.set('leave', draft.leaveAt)
  return `?${params.toString()}`
}

function place(value: string | null, label: string | null): Place | null {
  const [lat, lon] = (value ?? '').split(',').map(Number)
  if (lat === undefined || lon === undefined || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null
  }
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  const displayName = label?.trim() || `${lat}, ${lon}`
  return {
    name: displayName.split(',')[0]!.trim(),
    region: '',
    country: '',
    display_name: displayName,
    latitude: lat,
    longitude: lon,
  }
}

/** The trip in a query string, or null if there isn't a usable one. */
export function draftFromSearch(search: string): TripDraft | null {
  const params = new URLSearchParams(search)
  const origin = place(params.get('from'), params.get('fromName'))
  const destination = place(params.get('to'), params.get('toName'))
  if (!origin || !destination) return null
  const every = Number(params.get('every'))
  return {
    ...emptyDraft,
    origin,
    destination,
    weightText: params.get('w') ?? emptyDraft.weightText,
    spacing: SPACINGS.includes(every as Spacing) ? (every as Spacing) : emptyDraft.spacing,
    leaveAt: params.get('leave') ?? '',
  }
}
