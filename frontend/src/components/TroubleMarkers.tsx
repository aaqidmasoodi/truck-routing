import { useMemo } from 'react'
import { Marker, Popup } from 'react-leaflet'
import Typography from '@mui/material/Typography'
import type { PlannedRoute } from '../api/client'
import { CAUSE_NAMES, condition, reading, troubleSpots, type MapLayer } from '../conditions'
import { formatArrival, formatMiles } from '../format'
import { midpointAlong, stretches } from '../heatmap'
import type { LatLng } from '../map'
import { troubleIcon } from '../markerIcons'

interface TroubleMarkersProps {
  route: PlannedRoute
  layer: MapLayer
}

/** A marker only where conditions aren't clear, saying what's wrong and when. */
function TroubleMarkers({ route, layer }: TroubleMarkersProps) {
  const checkpoints = route.checkpoints
  const departure = checkpoints[0]?.eta ?? ''
  // The same stretches the route is coloured in, so each marker can sit in the middle of
  // its own colour, even at the very start or end of the route.
  const pieces = useMemo(
    () => stretches(route.points as LatLng[], route.checkpoints, route.distance_miles),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [route.id, route.points, route.distance_miles],
  )

  return troubleSpots(checkpoints, layer).map((spot) => {
    const { label, advice } = condition(spot.level)
    const what = spot.cause ? CAUSE_NAMES[spot.cause] : 'Bad weather'
    const value =
      spot.cause && spot.worst.weather ? `, ${reading(spot.cause, spot.worst.weather)}` : ''
    const where =
      spot.toMile > spot.fromMile
        ? `Miles ${Math.round(spot.fromMile)}–${Math.round(spot.toMile)}`
        : `Mile ${Math.round(spot.fromMile)}`
    return (
      <Marker
        key={`${spot.fromMile}-${layer}`}
        position={
          midpointAlong(
            pieces
              .filter((p) => p.checkpoint >= spot.fromIndex && p.checkpoint <= spot.toIndex)
              .flatMap((p) => p.positions),
          ) ?? [spot.checkpoint.latitude, spot.checkpoint.longitude]
        }
        icon={troubleIcon(spot.level, spot.cause)}
        title={`${label}: ${what.toLowerCase()}`}
      >
        <Popup>
          <Typography variant="subtitle2">{label}</Typography>
          <Typography variant="body2">
            {what}
            {value}. {advice}.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {where} ({formatMiles(spot.miles)}), from {formatArrival(spot.first.eta, departure)}
          </Typography>
        </Popup>
      </Marker>
    )
  })
}

export default TroubleMarkers
