import type { PlannedRoute } from './api/client'

export type LatLng = [number, number]

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas'

// Esri's light gray canvas: quiet enough that the routes and risk colours stand out, and
// it needs no API key. (CARTO's free basemap, used before, now asks for one.)
export const TILES = {
  url: `${ESRI}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
  attribution:
    'Tiles &copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, ' +
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 16,
}

/** Place names, drawn over the routes so they stay readable. */
export const LABELS = {
  url: `${ESRI}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
  maxZoom: 16,
}

/** The same canvas in dark grey, for dark mode. */
export const DARK_TILES = {
  ...TILES,
  url: `${ESRI}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
}
export const DARK_LABELS = {
  ...LABELS,
  url: `${ESRI}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
}

/** South-west and north-east corners that take in every route. */
export function boundsOf(routes: PlannedRoute[]): [LatLng, LatLng] | null {
  const points = routes.flatMap((route) => route.points)
  if (points.length === 0) return null
  const lats = points.map((point) => point[0] ?? 0)
  const lons = points.map((point) => point[1] ?? 0)
  return [
    [Math.min(...lats), Math.min(...lons)],
    [Math.max(...lats), Math.max(...lons)],
  ]
}

export interface LineStyle {
  color: string
  weight: number
  opacity: number
}

/** The selected route is bold and on top; the others stay visible but quiet. */
export function lineStyle(selected: boolean, primary: string, muted: string): LineStyle {
  return selected
    ? { color: primary, weight: 6, opacity: 0.95 }
    : { color: muted, weight: 4, opacity: 0.7 }
}

/** Draw quiet routes first so the selected one is never hidden underneath. */
export function drawOrder(routes: PlannedRoute[], selectedId: string): PlannedRoute[] {
  return [...routes].sort((a, b) => Number(a.id === selectedId) - Number(b.id === selectedId))
}
