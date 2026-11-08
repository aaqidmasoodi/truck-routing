import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { apiUrl } from '../api/client'

/** Data credits, kept small at the very bottom of the panel. */
function Credits() {
  return (
    <Box component="footer" sx={{ mt: 3 }}>
      <Divider sx={{ mb: 1.5 }} />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', fontSize: '0.7rem', lineHeight: 1.5 }}
      >
        Routes by <Link href="https://project-osrm.org">OSRM</Link>, map data ©{' '}
        <Link href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</Link>.
        Places and weather by <Link href="https://open-meteo.com">Open-Meteo</Link>, places based on{' '}
        <Link href="https://www.geonames.org">GeoNames</Link>. ·{' '}
        <Link href={apiUrl('/api/docs/')}>API docs</Link>
      </Typography>
    </Box>
  )
}

export default Credits
