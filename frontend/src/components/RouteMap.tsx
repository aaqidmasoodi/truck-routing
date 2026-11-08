import { useEffect } from 'react'
import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import Box from '@mui/material/Box'
import { useTheme } from '@mui/material/styles'
import type { PlannedRoute } from '../api/client'
import { boundsOf, drawOrder, lineStyle, TILES, type LatLng } from '../map'
import { routeName } from '../routes'
import CheckpointMarkers from './CheckpointMarkers'
import RiskLegend from './RiskLegend'

interface RouteMapProps {
  routes: PlannedRoute[]
  selectedId: string
  onSelect: (routeId: string) => void
}

/** Zoom to the routes whenever a new set comes in, but not on every re-render. */
function FitToRoutes({ bounds }: { bounds: [LatLng, LatLng] }) {
  const map = useMap()
  const key = bounds.flat().join(',')
  useEffect(() => {
    map.fitBounds(bounds, { padding: [32, 32] })
    // `key` stands in for `bounds`, which is a new array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key])
  return null
}

function RouteMap({ routes, selectedId, onSelect }: RouteMapProps) {
  const theme = useTheme()
  const bounds = boundsOf(routes)
  const selected = routes.find((route) => route.id === selectedId)
  const first = routes[0]?.points
  const start = first?.[0]
  const end = first?.[first.length - 1]

  return (
    <Box
      sx={{
        position: 'relative',
        height: { xs: 320, md: 440 },
        borderRadius: '16px',
        overflow: 'hidden',
        border: 1,
        borderColor: 'm3.outlineVariant',
        // Leaflet's own controls, nudged towards Material 3.
        '& .leaflet-bar a': { color: 'm3.onSurface' },
      }}
    >
      <MapContainer
        center={start ? [start[0] ?? 0, start[1] ?? 0] : [39.8, -98.6]}
        zoom={5}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer url={TILES.url} attribution={TILES.attribution} />
        {drawOrder(routes, selectedId).map((route) => {
          const selected = route.id === selectedId
          return (
            <Polyline
              key={`${route.id}-${selected}`}
              positions={route.points as LatLng[]}
              pathOptions={lineStyle(
                selected,
                theme.palette.primary.main,
                theme.palette.m3.outline,
              )}
              eventHandlers={{ click: () => onSelect(route.id) }}
            >
              <Tooltip sticky>{routeName(route)}</Tooltip>
            </Polyline>
          )
        })}
        {selected ? <CheckpointMarkers checkpoints={selected.checkpoints} /> : null}
        {/* Rings around the first and last checkpoints; clicks go through to the dots. */}
        {start ? (
          <CircleMarker
            center={start as LatLng}
            radius={12}
            interactive={false}
            pathOptions={{ color: theme.palette.primary.main, weight: 3, fill: false }}
          />
        ) : null}
        {end ? (
          <CircleMarker
            center={end as LatLng}
            radius={12}
            interactive={false}
            pathOptions={{ color: theme.palette.m3.tertiary, weight: 3, fill: false }}
          />
        ) : null}
        {bounds ? <FitToRoutes bounds={bounds} /> : null}
      </MapContainer>
      <RiskLegend />
    </Box>
  )
}

export default RouteMap
