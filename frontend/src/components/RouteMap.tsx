import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import {
  CircleMarker,
  MapContainer,
  Pane,
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import type { PlannedRoute } from '../api/client'
import { CAUSE_NAMES, condition, tint, troubleSpots, type MapLayer } from '../conditions'
import { formatMiles } from '../format'
import {
  boundsOf,
  DARK_LABELS,
  DARK_TILES,
  drawOrder,
  LABELS,
  lineStyle,
  TILES,
  type LatLng,
} from '../map'
import { routeName } from '../routes'
import HeatBand from './HeatBand'
import RiskLegend from './RiskLegend'
import TroubleMarkers from './TroubleMarkers'

// Before any plan: the North Atlantic, with North America and Europe both in view.
const WORLD_VIEW = { center: [42, -40] as LatLng, zoom: 3 }
// Wait for the bottom sheet to finish sliding before zooming to the routes again.
const SETTLE_MS = 300
// The fewest pixels of map height the routes are squeezed into.
const MIN_VISIBLE = 120

interface RouteMapProps {
  routes: PlannedRoute[]
  selectedId: string
  onSelect: (routeId: string) => void
  /** Pixels at the bottom covered by something else, like the planner sheet on a phone. */
  inset?: number
  /** Leave out the zoom buttons, for touch screens where pinching does the job. */
  compact?: boolean
}

/** Zoom to the routes when a new set comes in or the visible area changes size. */
function FitToRoutes({ bounds, inset }: { bounds: [LatLng, LatLng]; inset: number }) {
  const map = useMap()
  const key = bounds.flat().join(',')
  const fitted = useRef<string | null>(null)

  const fit = (animate: boolean) => {
    map.invalidateSize()
    // Fit the routes into the strip of map the sheet leaves free, keeping at least a
    // little room even when the sheet covers most of the screen.
    const free = map.getSize().y - 64 - 32
    const covered = Math.max(0, Math.min(inset, free - MIN_VISIBLE))
    map.fitBounds(bounds, {
      paddingTopLeft: [24, 64],
      paddingBottomRight: [24, covered + 32],
      animate,
    })
  }

  // New routes: go straight to them before the screen is drawn, so they never show up
  // zoomed out on the world map first and then fly in.
  useLayoutEffect(() => {
    if (fitted.current === key) return
    fitted.current = key
    fit(false)
    // `key` stands in for `bounds`, which is a new array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key])

  // The visible area changed size (the phone sheet moved): let it settle, then glide over.
  useEffect(() => {
    const timer = setTimeout(() => fit(true), SETTLE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, inset])
  return null
}

/** One line over the map: "Clear all the way", or the worst thing on the selected route. */
function Summary({ route, layer, top }: { route: PlannedRoute; layer: MapLayer; top: number }) {
  const spots = troubleSpots(route.checkpoints, layer)
  const worst = spots.reduce<(typeof spots)[number] | undefined>(
    (a, b) => (!a || b.level > a.level ? b : a),
    undefined,
  )
  const look = condition(worst?.level ?? 0)
  const tones = tint(look, useTheme().palette.mode)
  const what = worst?.cause ? CAUSE_NAMES[worst.cause].toLowerCase() : 'bad weather'
  const label = worst
    ? `${look.label}: ${what} for ${formatMiles(worst.miles)}` +
      (spots.length > 1 ? `, ${spots.length - 1} more` : '')
    : 'Clear all the way'
  return (
    <Chip
      icon={worst ? <WarningIcon /> : <CheckCircleIcon />}
      label={label}
      sx={{
        position: 'absolute',
        left: 12,
        top,
        zIndex: 1000, // above Leaflet's panes
        maxWidth: 'calc(100% - 24px)',
        bgcolor: tones.background,
        color: tones.text,
        border: 1,
        borderColor: look.colour,
        fontWeight: 500,
        boxShadow: 2,
        '& .MuiChip-icon': { color: look.colour },
      }}
    />
  )
}

function RouteMap({ routes, selectedId, onSelect, inset = 0, compact = false }: RouteMapProps) {
  const theme = useTheme()
  const dark = theme.palette.mode === 'dark'
  // The credit line shows while planning; once routes are showing it's in the way, so the
  // key carries it instead.
  const creditInKey = routes.length > 0
  const tiles = dark ? DARK_TILES : TILES
  const labels = dark ? DARK_LABELS : LABELS
  const [layer, setLayer] = useState<MapLayer>('overall')
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
        // The tiles' own grey, so loading doesn't flash white (or black).
        bgcolor: dark ? '#262626' : '#e8e8e8',
        // Leaflet's own controls and popups, nudged towards Material 3.
        '& .leaflet-container': { bgcolor: 'transparent', fontFamily: 'inherit' },
        // Chrome draws a focus box around a route line or marker once it's clicked.
        '& .leaflet-interactive:focus, & .trouble-marker:focus': { outline: 'none' },
        '& .leaflet-bar': {
          border: 'none',
          boxShadow: 2,
          borderRadius: '12px',
          overflow: 'hidden',
        },
        '& .leaflet-bar a': { color: 'm3.onSurface', bgcolor: 'm3.surfaceContainer' },
        // Leaflet's own stylesheet paints this white, so the selector has to beat it.
        '& .leaflet-container .leaflet-control-attribution': {
          fontSize: 10,
          bgcolor: 'm3.surfaceContainer',
          color: 'm3.onSurfaceVariant',
          '& a': { color: 'primary.main' },
          // With routes showing, the credit moves into the key instead.
          display: creditInKey ? 'none' : undefined,
        },
        '& .leaflet-bottom': { bottom: inset, transition: 'bottom 250ms ease' },
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
        // Quarter steps, so the routes fill the space they're fitted into.
        zoomSnap={0.25}
        style={{ height: '100%', width: '100%' }}
      >
        {compact ? null : <ZoomControl position="bottomright" />}
        {/* Keyed by mode, so switching themes swaps the tiles rather than mixing them. */}
        <TileLayer
          key={`base-${tiles.url}`}
          url={tiles.url}
          attribution={tiles.attribution}
          maxZoom={tiles.maxZoom}
        />
        {/* Place names above the routes but below the markers, and never in a click's way. */}
        <Pane name="labels" style={{ zIndex: 450, pointerEvents: 'none' }}>
          <TileLayer key={`labels-${labels.url}`} url={labels.url} maxZoom={labels.maxZoom} />
        </Pane>
        {selected ? <HeatBand route={selected} layer={layer} /> : null}
        {drawOrder(routes, selectedId).map((route) => {
          const selected = route.id === selectedId
          // The selected route is drawn in its colours above; this keeps it clickable.
          return (
            <Polyline
              key={`${route.id}-${selected}`}
              positions={route.points as LatLng[]}
              pathOptions={
                selected
                  ? { color: '#000000', weight: 14, opacity: 0 }
                  : lineStyle(false, theme.palette.primary.main, theme.palette.m3.outline)
              }
              eventHandlers={{ click: () => onSelect(route.id) }}
            >
              <Tooltip sticky>{routeName(route)}</Tooltip>
            </Polyline>
          )
        })}
        {selected ? <TroubleMarkers checkpoints={selected.checkpoints} layer={layer} /> : null}
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
        {/* On a phone, keep the routes clear of the layer buttons above the sheet too. */}
        {bounds ? <FitToRoutes bounds={bounds} inset={compact ? inset + 48 : inset} /> : null}
      </MapContainer>
      {routes.length > 0 ? (
        <ToggleButtonGroup
          size="small"
          exclusive
          value={layer}
          onChange={(_event, value: MapLayer | null) => value && setLayer(value)}
          aria-label="Colour the route by"
          sx={{
            position: 'absolute',
            // On a phone it sits at the bottom, above the sheet, leaving the top to the summary.
            ...(compact ? { bottom: inset + 24, transition: 'bottom 250ms ease' } : { top: 12 }),
            right: 12,
            zIndex: 1000, // above Leaflet's panes
            bgcolor: 'm3.surfaceContainer',
            boxShadow: 2,
          }}
        >
          <ToggleButton value="overall">Overall</ToggleButton>
          <ToggleButton value="wind">Wind</ToggleButton>
          <ToggleButton value="rain">Rain</ToggleButton>
          <ToggleButton value="snow">Snow</ToggleButton>
        </ToggleButtonGroup>
      ) : null}
      {selected ? <Summary route={selected} layer={layer} top={12} /> : null}
      {routes.length > 0 ? (
        <RiskLegend layer={layer} bottom={inset + 24} compact={compact} showCredit={creditInKey} />
      ) : (
        <Chip
          label="Plan a trip to see the routes here"
          sx={{
            position: 'absolute',
            left: '50%',
            top: 16,
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

// Skips redrawing (hundreds of route pieces) when nothing it shows has changed.
export default memo(RouteMap)
