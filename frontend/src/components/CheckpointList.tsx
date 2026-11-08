import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { PlannedCheckpoint } from '../api/client'
import { formatArrival, formatMiles, formatWeather } from '../format'
import { checkpointName } from '../routes'
import RiskChip from './RiskChip'

interface CheckpointListProps {
  checkpoints: PlannedCheckpoint[]
}

function CheckpointList({ checkpoints }: CheckpointListProps) {
  const departure = checkpoints[0]?.eta ?? ''

  return (
    <List dense disablePadding>
      {checkpoints.map((checkpoint, index) => (
        <ListItem key={checkpoint.mile} disableGutters divider={index < checkpoints.length - 1}>
          <ListItemText
            primary={checkpointName(index, checkpoints.length)}
            secondary={`${formatMiles(checkpoint.mile)} in · ${formatWeather(checkpoint.weather)}`}
          />
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
            <Typography variant="body2">{formatArrival(checkpoint.eta, departure)}</Typography>
            <RiskChip level={checkpoint.risk?.level ?? null} />
          </Stack>
        </ListItem>
      ))}
    </List>
  )
}

export default CheckpointList
