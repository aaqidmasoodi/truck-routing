import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { HEAT_TOP, heatRamp, type HeatLayer } from '../heatmap'

const LEVELS = ['Low', 'Moderate', 'High', 'Severe', 'No Travel']
const UNITS = { wind: 'mph', rain: 'in/h', snow: 'in/h' } as const

/** Key to the colours on the map, laid over its corner. */
function RiskLegend({ layer = 'risk' }: { layer?: HeatLayer }) {
  return (
    <Box
      sx={{
        position: 'absolute',
        left: 12,
        bottom: 24,
        zIndex: 1000, // above Leaflet's panes
        px: 1.5,
        py: 1,
        borderRadius: '12px',
        bgcolor: 'm3.surfaceContainer',
        boxShadow: 1,
      }}
    >
      {layer === 'risk' ? (
        <Box role="list" aria-label="Risk levels">
          {LEVELS.map((label, value) => (
            <Stack
              key={label}
              role="listitem"
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center' }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: (theme) => theme.palette.risk[value]?.main,
                }}
              />
              <Typography variant="caption">{label}</Typography>
            </Stack>
          ))}
        </Box>
      ) : (
        <Box aria-label={`${layer} scale`} role="img">
          <Box
            sx={{
              width: 120,
              height: 10,
              borderRadius: '5px',
              background: `linear-gradient(to right, ${heatRamp(layer).join(', ')})`,
            }}
          />
          <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
            <Typography variant="caption">0</Typography>
            <Typography variant="caption">
              {HEAT_TOP[layer]}+ {UNITS[layer]}
            </Typography>
          </Stack>
        </Box>
      )}
    </Box>
  )
}

export default RiskLegend
