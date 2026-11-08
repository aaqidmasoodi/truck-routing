import Box from '@mui/material/Box'
import Tooltip from '@mui/material/Tooltip'
import type { PlannedCheckpoint } from '../api/client'
import { condition } from '../conditions'
import { formatMiles } from '../format'

interface RiskStripProps {
  checkpoints: PlannedCheckpoint[]
}

/** The route as one bar, start to finish, each stretch in its checkpoint's colour. */
function RiskStrip({ checkpoints }: RiskStripProps) {
  const summary = checkpoints
    .map((c) => `${formatMiles(c.mile)}: ${condition(c.risk?.level).label}`)
    .join(', ')

  return (
    <Box
      role="img"
      aria-label={`Conditions along the route. ${summary}`}
      sx={{ display: 'flex', height: 8, borderRadius: '4px', overflow: 'hidden', gap: '1px' }}
    >
      {checkpoints.map((checkpoint) => {
        const { label, colour } = condition(checkpoint.risk?.level)
        return (
          <Tooltip key={checkpoint.mile} title={`${formatMiles(checkpoint.mile)} in: ${label}`}>
            <Box
              data-testid="risk-stretch"
              sx={{
                flexGrow: checkpoint.segment_miles,
                flexBasis: 0,
                minWidth: 2,
                bgcolor: colour,
              }}
            />
          </Tooltip>
        )
      })}
    </Box>
  )
}

export default RiskStrip
