import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { BANDS, CONDITIONS, type MapLayer } from '../conditions'

const TITLES: Record<MapLayer, string> = {
  overall: 'Driving conditions',
  wind: 'Wind',
  rain: 'Rain',
  snow: 'Snow',
}

interface RiskLegendProps {
  layer?: MapLayer
  bottom?: number
}

/** What the colours mean: advice for the overall view, real units for wind, rain, snow. */
function RiskLegend({ layer = 'overall', bottom = 24 }: RiskLegendProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        left: 12,
        bottom,
        transition: 'bottom 250ms ease',
        zIndex: 1000, // above Leaflet's panes
        px: 1.5,
        py: 1,
        borderRadius: '12px',
        bgcolor: 'm3.surfaceContainer',
        boxShadow: 2,
      }}
    >
      <Typography variant="caption" component="p" sx={{ fontWeight: 600, mb: 0.5 }}>
        {TITLES[layer]}
      </Typography>
      <Box role="list" aria-label={`${TITLES[layer]} key`}>
        {CONDITIONS.map((item, value) => (
          <Stack
            key={item.label}
            role="listitem"
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center' }}
          >
            <Box
              sx={{ width: 14, height: 6, borderRadius: 3, bgcolor: item.colour, flexShrink: 0 }}
            />
            <Typography variant="caption" sx={{ fontWeight: 500, minWidth: 68 }}>
              {item.label}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {layer === 'overall' ? item.advice : BANDS[layer][value]}
            </Typography>
          </Stack>
        ))}
      </Box>
      {layer === 'wind' ? (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
          Heavy loads go up a level in strong wind
        </Typography>
      ) : null}
    </Box>
  )
}

export default RiskLegend
