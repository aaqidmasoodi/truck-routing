import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import type { PlannedCheckpoint } from '../api/client'
import { formatMiles } from '../format'

const NO_FORECAST = '#bdbdbd'

interface RiskStripProps {
  checkpoints: PlannedCheckpoint[]
}

/** The route as one bar, start to finish, each stretch in its checkpoint's risk colour. */
function RiskStrip({ checkpoints }: RiskStripProps) {
  const summary = checkpoints
    .map((c) => `${formatMiles(c.mile)}: ${c.risk?.level.label ?? 'no forecast'}`)
    .join(', ')

  return (
    <Box
      role="img"
      aria-label={`Risk along the route. ${summary}`}
      sx={{ display: 'flex', height: 8, borderRadius: '4px', overflow: 'hidden', gap: '1px' }}
    >
      {checkpoints.map((checkpoint) => {
        const level = checkpoint.risk?.level
        return (
          <Tooltip
            key={checkpoint.mile}
            title={`${formatMiles(checkpoint.mile)} in: ${level?.label ?? 'No forecast'}`}
          >
            <Box
              data-testid="risk-stretch"
              sx={(theme) => ({
                flexGrow: checkpoint.segment_miles,
                flexBasis: 0,
                minWidth: 2,
                bgcolor: level ? theme.palette.risk[level.value]?.main : NO_FORECAST,
              })}
            />
          </Tooltip>
        )
      })}
    </Box>
  )
}

export default RiskStrip
