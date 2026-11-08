import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

/** Roughly the shape of the results, so the panel doesn't jump when they arrive. */
function PlanningPlaceholder({ compact = false }: { compact?: boolean }) {
  return (
    <Box role="status" aria-live="polite">
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Finding routes and checking the forecast along each one…
      </Typography>
      <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />
      {/* On a phone, the same short height the results will take. */}
      <Stack spacing={1.5} sx={compact ? { '& > :nth-of-type(n+3)': { display: 'none' } } : {}}>
        <Skeleton variant="rounded" height={64} sx={{ borderRadius: '12px' }} />
        <Skeleton variant="rounded" height={140} sx={{ borderRadius: '12px' }} />
        <Skeleton variant="rounded" height={110} sx={{ borderRadius: '12px' }} />
        <Skeleton variant="rounded" height={110} sx={{ borderRadius: '12px' }} />
      </Stack>
    </Box>
  )
}

export default PlanningPlaceholder
