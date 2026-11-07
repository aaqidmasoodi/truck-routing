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
