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
