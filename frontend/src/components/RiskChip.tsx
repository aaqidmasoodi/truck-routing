import Chip from '@mui/material/Chip'
import type { RiskLevel } from '../api/client'
import { condition } from '../conditions'

/** A level in plain words and its traffic-light colour. */
function RiskChip({ level }: { level: RiskLevel | null }) {
  const { label, colour, text } = condition(level)
  return (
    <Chip
      size="small"
      label={label}
      sx={{ fontWeight: 500, bgcolor: colour, color: text, flexShrink: 0 }}
    />
  )
}

export default RiskChip
