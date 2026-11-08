import type { Place, Spacing, Trip } from './api/client'

/** What's in the trip form, before it's been checked. */
export interface TripDraft {
  origin: Place | null
  destination: Place | null
  weightText: string
  spacing: Spacing
  /** A datetime-local value like "2026-11-09T06:30", or '' to leave now. */
  leaveAt: string
}

export interface DraftErrors {
  destination?: string
  weight?: string
  leaveAt?: string
}

export const MAX_WEIGHT_LB = 200_000
// The forecast only reaches about two days ahead, so neither can the departure.
export const FORECAST_HOURS = 48
const HOUR_MS = 60 * 60 * 1000
// A little slack so a time picked a minute ago still counts as now.
const GRACE_MS = 5 * 60 * 1000

export const emptyDraft: TripDraft = {
  origin: null,
  destination: null,
  weightText: '',
  spacing: 25,
  leaveAt: '',
}

export function parseWeight(text: string): number | null {
  const weight = Number(text.replaceAll(',', ''))
  return text.trim() !== '' && weight > 0 && weight <= MAX_WEIGHT_LB ? weight : null
}

/** A Date as the "YYYY-MM-DDTHH:mm" local time a datetime-local input uses. */
export function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

export function latestDeparture(now: Date): Date {
  return new Date(now.getTime() + FORECAST_HOURS * HOUR_MS)
}

function samePlace(a: Place, b: Place): boolean {
  return a.latitude === b.latitude && a.longitude === b.longitude
}

/**
 * Checks the form. Errors are only given for things the driver has filled in, so a
 * half-done form isn't covered in red. `trip` is set once everything is valid.
 */
export function checkDraft(
  draft: TripDraft,
  now: Date = new Date(),
): { trip: Trip | null; errors: DraftErrors } {
  const errors: DraftErrors = {}

  if (draft.origin && draft.destination && samePlace(draft.origin, draft.destination)) {
    errors.destination = 'Pick a destination different from the start'
  }

  const weightLb = parseWeight(draft.weightText)
  if (draft.weightText.trim() !== '' && weightLb === null) {
    errors.weight = 'Enter a weight up to 200,000 lb'
  }

  let departure: string | undefined
  if (draft.leaveAt !== '') {
    const leaving = new Date(draft.leaveAt)
    if (Number.isNaN(leaving.getTime())) {
      errors.leaveAt = 'Pick a date and time'
    } else if (leaving.getTime() < now.getTime() - GRACE_MS) {
      errors.leaveAt = 'That time has already passed'
    } else if (leaving > latestDeparture(now)) {
      errors.leaveAt = `Pick a time within the next ${FORECAST_HOURS} hours`
    } else {
      departure = leaving.toISOString()
    }
  }

  const complete = draft.origin && draft.destination && weightLb !== null
  if (!complete || Object.keys(errors).length > 0) return { trip: null, errors }

  return {
    errors,
    trip: {
      origin: draft.origin!,
      destination: draft.destination!,
      weightLb: weightLb!,
      spacingMiles: draft.spacing,
      ...(departure ? { departure } : {}),
    },
  }
}
