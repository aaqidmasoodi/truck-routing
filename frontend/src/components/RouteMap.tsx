import { useEffect, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  ZoomControl,
} from 'react-leaflet'
import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { useTheme } from '@mui/material/styles'
import type { PlannedRoute } from '../api/client'
import type { HeatLayer } from '../heatmap'
import { boundsOf, drawOrder, lineStyle, TILES, type LatLng } from '../map'
import { routeName } from '../routes'
import CheckpointMarkers from './CheckpointMarkers'
import HeatBand from './HeatBand'
import RiskLegend from './RiskLegend'

// Before any plan: the North Atlantic, with North America and Europe both in view.
const WORLD_VIEW = { center: [42, -40] as LatLng, zoom: 3 }

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
  const [layer, setLayer] = useState<HeatLayer>('risk')
  const bounds = boundsOf(routes)
  const selected = routes.find((route) => route.id === selectedId)
  const first = routes[0]?.points
  const start = first?.[0]
  const end = first?.[first.length - 1]

  return (
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        overflow: 'hidden',
        // Leaflet's own controls and popups, nudged towards Material 3.
        '& .leaflet-bar a': { color: 'm3.onSurface' },
        '& .leaflet-popup-content-wrapper, & .leaflet-popup-tip': {
          bgcolor: 'm3.surfaceContainerHigh',
          color: 'm3.onSurface',
        },
        '& .leaflet-popup-content-wrapper': { borderRadius: '12px' },
        '& .leaflet-popup-content': { m: 1.5, lineHeight: 1.5 },
        '& .leaflet-popup-content p': { m: 0 },
      }}
    >
      <MapContainer
        center={start ? [start[0] ?? 0, start[1] ?? 0] : WORLD_VIEW.center}
        zoom={start ? 6 : WORLD_VIEW.zoom}
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <ZoomControl position="bottomright" />
        <TileLayer url={TILES.url} attribution={TILES.attribution} />
        {selected ? <HeatBand route={selected} layer={layer} /> : null}
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
      {routes.length > 0 ? (
        <ToggleButtonGroup
          size="small"
          exclusive
          value={layer}
          onChange={(_event, value: HeatLayer | null) => value && setLayer(value)}
          aria-label="Colour the route by"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 1000, // above Leaflet's panes
            bgcolor: 'm3.surfaceContainer',
            boxShadow: 1,
          }}
        >
          <ToggleButton value="risk">Risk</ToggleButton>
          <ToggleButton value="wind">Wind</ToggleButton>
          <ToggleButton value="rain">Rain</ToggleButton>
          <ToggleButton value="snow">Snow</ToggleButton>
        </ToggleButtonGroup>
      ) : null}
      {routes.length > 0 ? (
        <RiskLegend layer={layer} />
      ) : (
        <Chip
          label="Plan a trip to see the routes here"
          sx={{
            position: 'absolute',
            left: '50%',
            bottom: 32,
            transform: 'translateX(-50%)',
            zIndex: 1000, // above Leaflet's panes
            bgcolor: 'm3.surfaceContainerHigh',
            boxShadow: 2,
          }}
        />
      )}
    </Box>
  )
}

export default RouteMap
