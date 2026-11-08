import { divIcon, type DivIcon } from 'leaflet'
import { condition, type Cause } from './conditions'

// Material icon shapes (Apache 2.0), drawn as plain SVG so Leaflet can show them.
const PATHS = {
  wind:
    'M14.5 17c0 1.65-1.35 3-3 3s-3-1.35-3-3h2c0 .55.45 1 1 1s1-.45 1-1-.45-1-1-1H2v-2h9.5c1.65 0 ' +
    '3 1.35 3 3M19 6.5C19 4.57 17.43 3 15.5 3S12 4.57 12 6.5h2c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 ' +
    '1.5S16.33 8 15.5 8H2v2h13.5c1.93 0 3.5-1.57 3.5-3.5m-.5 4.5H2v2h16.5c.83 0 1.5.67 1.5 1.5s' +
    '-.67 1.5-1.5 1.5v2c1.93 0 3.5-1.57 3.5-3.5S20.43 11 18.5 11',
  rain:
    'M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8M7.83 ' +
    '14c.37 0 .67.26.74.62.41 2.22 2.28 2.98 3.64 2.87.43-.02.79.32.79.75 0 .4-.32.73-.72.75-2.13' +
    '.13-4.62-1.09-5.19-4.12-.08-.45.28-.87.74-.87',
  snow:
    'M22 11h-4.17l3.24-3.24-1.41-1.42L15 11h-2V9l4.66-4.66-1.42-1.41L13 6.17V2h-2v4.17L7.76 2.93 ' +
    '6.34 4.34 11 9v2H9L4.34 6.34 2.93 7.76 6.17 11H2v2h4.17l-3.24 3.24 1.41 1.42L9 13h2v2l-4.66 ' +
    '4.66 1.42 1.41L11 17.83V22h2v-4.17l3.24 3.24 1.42-1.41L13 15v-2h2l4.66 4.66 1.41-1.42L17.83 ' +
    '13H22z',
  stop:
    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2M4 12c0-4.42 3.58-8 8-8 1.85 ' +
    '0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12m8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 ' +
    '7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8',
} as const

const SIZE = 30
const cache = new Map<string, DivIcon>()

/** A round marker in the level's colour with the cause drawn on it, or a stop sign. */
export function troubleIcon(level: number, cause: Cause | null): DivIcon {
  const shape = level >= 4 || !cause ? 'stop' : cause
  const key = `${level}:${shape}`
  const cached = cache.get(key)
  if (cached) return cached

  const { colour, text } = condition(level)
  const icon = divIcon({
    className: 'trouble-marker',
    iconSize: [SIZE, SIZE],
    iconAnchor: [SIZE / 2, SIZE / 2],
    popupAnchor: [0, -SIZE / 2],
    html:
      `<div style="width:${SIZE}px;height:${SIZE}px;border-radius:50%;background:${colour};` +
      `border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);display:flex;` +
      `align-items:center;justify-content:center;box-sizing:border-box">` +
      `<svg viewBox="0 0 24 24" width="18" height="18" fill="${text}" aria-hidden="true">` +
      `<path d="${PATHS[shape]}"/></svg></div>`,
  })
  cache.set(key, icon)
  return icon
}
