import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

const LEVELS = ['Low', 'Moderate', 'High', 'Severe', 'No Travel']

/** Key to the checkpoint colours, laid over the corner of the map. */
function RiskLegend() {
  return (
    <Box
      role="list"
      aria-label="Risk levels"
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
  )
}

export default RiskLegend
