import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import type { Checkpoint } from '../api/client'
import { formatArrival, formatMiles } from '../format'

interface CheckpointListProps {
  checkpoints: Checkpoint[]
}

function placeName(index: number, count: number): string {
  if (index === 0) return 'Start'
  if (index === count - 1) return 'Destination'
  return `Checkpoint ${index}`
}

function CheckpointList({ checkpoints }: CheckpointListProps) {
  const departure = checkpoints[0]?.eta ?? ''

  return (
    <List dense disablePadding>
      {checkpoints.map((checkpoint, index) => (
        <ListItem key={checkpoint.mile} disableGutters divider={index < checkpoints.length - 1}>
          <ListItemText
            primary={placeName(index, checkpoints.length)}
            secondary={`${formatMiles(checkpoint.mile)} in`}
          />
          <ListItemText
            primary={formatArrival(checkpoint.eta, departure)}
            slotProps={{ primary: { sx: { textAlign: 'right' } } }}
          />
        </ListItem>
      ))}
    </List>
  )
}

export default CheckpointList
