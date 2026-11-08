import type { Weather } from './api/client'

const miles = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export function formatMiles(value: number): string {
  return `${miles.format(value)} mi`
}

export function formatDuration(totalMinutes: number): string {
  const rounded = Math.round(totalMinutes)
  const hours = Math.floor(rounded / 60)
  const minutes = rounded % 60
  if (hours === 0) return `${minutes} min`
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`
}

export function formatArrival(eta: string, departure: string, timeZone?: string): string {
  const arrive = new Date(eta)
  const options: Intl.DateTimeFormatOptions = timeZone ? { timeZone } : {}
  const time = arrive.toLocaleTimeString('en-US', {
    ...options,
    hour: 'numeric',
    minute: '2-digit',
  })
  const day = (date: Date) => date.toLocaleDateString('en-US', { ...options, weekday: 'short' })
  const sameDay =
    arrive.toLocaleDateString('en-US', options) ===
    new Date(departure).toLocaleDateString('en-US', options)
  return sameDay ? time : `${day(arrive)} ${time}`
}

// Below this a rate rounds to 0.00 in/h, so it reads better as nothing at all.
const TRACE_INCHES = 0.005

export function formatWeather(weather: Weather | null): string {
  if (!weather) return 'No forecast'
  const parts = [`${Math.round(weather.wind_mph)} mph wind`]
  if (weather.rain_in_per_hr >= TRACE_INCHES)
    parts.push(`${weather.rain_in_per_hr.toFixed(2)} in/h rain`)
  if (weather.snow_in_per_hr >= TRACE_INCHES)
    parts.push(`${weather.snow_in_per_hr.toFixed(2)} in/h snow`)
  if (parts.length === 1) parts.push('dry')
  return parts.join(', ')
}
