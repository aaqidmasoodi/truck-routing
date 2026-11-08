import Link from '@mui/material/Link'
import Typography from '@mui/material/Typography'
import { apiUrl } from '../api/client'

function Credits() {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      component="footer"
      sx={{ display: 'block', mt: 4 }}
    >
      Routes by <Link href="https://project-osrm.org">OSRM</Link>, map data ©{' '}
      <Link href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</Link>. Places
      and weather by <Link href="https://open-meteo.com">Open-Meteo</Link>, places based on{' '}
      <Link href="https://www.geonames.org">GeoNames</Link>.{' '}
      <Link href={apiUrl('/api/docs/')}>API docs</Link>
    </Typography>
  )
}

export default Credits
