import { CircleMarker, Popup } from 'react-leaflet'
import Typography from '@mui/material/Typography'
import { useTheme } from '@mui/material/styles'
import type { PlannedCheckpoint } from '../api/client'
import { formatArrival, formatMiles, formatWeather } from '../format'
import { checkpointName, explainRisk } from '../routes'

const NO_FORECAST = '#9e9e9e'

interface CheckpointMarkersProps {
  checkpoints: PlannedCheckpoint[]
}

/** One dot per checkpoint in its risk colour, with the details in a popup. */
function CheckpointMarkers({ checkpoints }: CheckpointMarkersProps) {
  const theme = useTheme()
  const departure = checkpoints[0]?.eta ?? ''

  return checkpoints.map((checkpoint, index) => {
    const level = checkpoint.risk?.level
    const fill = level ? theme.palette.risk[level.value]?.main : NO_FORECAST
    return (
      <CircleMarker
        key={checkpoint.mile}
        center={[checkpoint.latitude, checkpoint.longitude]}
        radius={6}
        pathOptions={{ color: '#fff', weight: 2, fillColor: fill, fillOpacity: 1 }}
      >
        <Popup>
          <Typography variant="subtitle2">{checkpointName(index, checkpoints.length)}</Typography>
          <Typography variant="body2">
            {formatMiles(checkpoint.mile)} in, {formatArrival(checkpoint.eta, departure)}
          </Typography>
          <Typography variant="body2">{formatWeather(checkpoint.weather)}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {explainRisk(checkpoint.risk)}
          </Typography>
        </Popup>
      </CircleMarker>
    )
  })
}

export default CheckpointMarkers
