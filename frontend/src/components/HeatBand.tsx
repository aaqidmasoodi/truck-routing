import { useMemo } from 'react'
import { Polyline } from 'react-leaflet'
import { useTheme } from '@mui/material/styles'
import type { PlannedRoute } from '../api/client'
import { heatColour, NO_DATA, stretches, type HeatLayer } from '../heatmap'
import type { LatLng } from '../map'

interface HeatBandProps {
  route: PlannedRoute
  layer: HeatLayer
}

/** A wide translucent band along the road, each stretch coloured by its checkpoint. */
function HeatBand({ route, layer }: HeatBandProps) {
  const theme = useTheme()
  // Cutting the road up is the costly part, and it only depends on the shape and the
  // checkpoint miles, which stay put while the departure slider moves.
  const pieces = useMemo(
    () => stretches(route.points as LatLng[], route.checkpoints, route.distance_miles),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [route.id, route.points, route.distance_miles],
  )

  return pieces.map((piece) => {
    const checkpoint = route.checkpoints[piece.checkpoint]
    const level = checkpoint?.risk?.level
    const weather = checkpoint?.weather
    let colour = NO_DATA
    if (layer === 'risk' && level) colour = theme.palette.risk[level.value]?.main ?? NO_DATA
    if (layer === 'wind' && weather) colour = heatColour('wind', weather.wind_mph)
    if (layer === 'rain' && weather) colour = heatColour('rain', weather.rain_in_per_hr)
    if (layer === 'snow' && weather) colour = heatColour('snow', weather.snow_in_per_hr)
    return (
      <Polyline
        key={piece.checkpoint}
        positions={piece.positions}
        interactive={false}
        pathOptions={{ color: colour, weight: 18, opacity: 0.55, lineCap: 'butt' }}
      />
    )
  })
}

export default HeatBand
