import Box from '@mui/material/Box'
import LinearProgress from '@mui/material/LinearProgress'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

/** Roughly the shape of the results, so the page doesn't jump when they arrive. */
function PlanningPlaceholder() {
  return (
    <Box sx={{ mt: 3 }} role="status" aria-live="polite">
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Finding routes and checking the forecast along each one…
      </Typography>
      <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />
      <Skeleton variant="rounded" height={140} sx={{ mb: 2, borderRadius: '12px' }} />
      <Stack direction={{ xs: 'column', lg: 'row-reverse' }} spacing={2}>
        <Skeleton
          variant="rounded"
          sx={{ flex: 7, height: { xs: 320, md: 440 }, borderRadius: '16px' }}
        />
        <Stack spacing={1.5} sx={{ flex: 5 }}>
          <Skeleton variant="rounded" height={120} sx={{ borderRadius: '12px' }} />
          <Skeleton variant="rounded" height={120} sx={{ borderRadius: '12px' }} />
        </Stack>
      </Stack>
    </Box>
  )
}

export default PlanningPlaceholder
