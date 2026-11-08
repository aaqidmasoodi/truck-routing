import { useMemo } from 'react'
import { Polyline } from 'react-leaflet'
import type { PlannedRoute } from '../api/client'
import { condition, levelOn, type MapLayer } from '../conditions'
import { stretches } from '../heatmap'
import type { LatLng } from '../map'

interface HeatBandProps {
  route: PlannedRoute
  layer: MapLayer
}

/**
 * The selected route coloured like traffic on a map app: a soft glow along the corridor
 * (the heatmap) and a crisp line on top, each stretch in its checkpoint's colour.
 */
function HeatBand({ route, layer }: HeatBandProps) {
  // Cutting the road up is the costly part, and it only depends on the shape and the
  // checkpoint miles, which stay put while the departure slider moves.
  const pieces = useMemo(
    () => stretches(route.points as LatLng[], route.checkpoints, route.distance_miles),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [route.id, route.points, route.distance_miles],
  )
  const colours = pieces.map(
    (piece) => condition(levelOn(layer, route.checkpoints[piece.checkpoint]?.risk ?? null)).colour,
  )

  return (
    <>
      {pieces.map((piece, i) => (
        <Polyline
          key={`glow-${piece.checkpoint}`}
          positions={piece.positions}
          interactive={false}
          pathOptions={{ color: colours[i], weight: 22, opacity: 0.3, lineCap: 'butt' }}
        />
      ))}
      <Polyline
        positions={route.points as LatLng[]}
        interactive={false}
        pathOptions={{ color: '#ffffff', weight: 9, opacity: 1 }}
      />
      {pieces.map((piece, i) => (
        <Polyline
          key={`line-${piece.checkpoint}`}
          positions={piece.positions}
          interactive={false}
          pathOptions={{ color: colours[i], weight: 5, opacity: 1 }}
        />
      ))}
    </>
  )
}

export default HeatBand
