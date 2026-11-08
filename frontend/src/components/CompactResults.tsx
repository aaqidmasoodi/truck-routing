import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonBase from '@mui/material/ButtonBase'
import Slider from '@mui/material/Slider'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import type { TripPlan } from '../api/client'
import { formatDuration, formatMiles } from '../format'
import { routeName, worstRisk } from '../routes'
import { departureClock, describeDeparture, safestHour } from '../timeline'
import RiskChip from './RiskChip'

interface CompactResultsProps {
  /** The plan as the server sent it, with its timeline. */
  planned: TripPlan
  /** The same plan for the chosen departure hour. */
  plan: TripPlan
  hours: number
  onHoursChange: (hours: number) => void
  selectedId: string
  onSelect: (routeId: string) => void
  /** Open the sheet all the way, with every detail and checkpoint. */
  onMore: () => void
}

/**
 * The results squeezed onto a phone: one line of advice, a slim departure slider and a
 * short row per route, so it all fits in the sheet with the map still in view.
 */
function CompactResults({
  planned,
  plan,
  hours,
  onHoursChange,
  selectedId,
  onSelect,
  onMore,
}: CompactResultsProps) {
  const best = plan.routes[0]
  const departure = planned.routes[0]?.checkpoints[0]?.eta
  const maxHours = planned.timeline.length - 1
  const safest = safestHour(planned)
  const safe = plan.safe_to_travel
  const count = plan.routes.length

  return (
    <Stack spacing={1.5}>
      {best ? (
        <Box
          component="section"
          aria-label="Recommendation"
          sx={{
            px: 1.5,
            py: 1,
            borderRadius: '12px',
            bgcolor: safe ? 'm3.primaryContainer' : 'm3.errorContainer',
            color: safe ? 'm3.onPrimaryContainer' : 'm3.onErrorContainer',
          }}
        >
          <Typography variant="overline" component="p" sx={{ lineHeight: 1.6 }}>
            {safe ? 'Recommended' : 'No safe route right now'}
          </Typography>
          <Typography variant="body2">
            <Box component="span" sx={{ fontWeight: 600 }}>
              {safe ? `Take ${routeName(best)}` : `Least risky is ${routeName(best)}`}
            </Box>
            <Box component="span"> {safe ? `${plan.reason}.` : 'Consider leaving later.'}</Box>
          </Typography>
        </Box>
      ) : null}

      {departure && maxHours > 0 ? (
        <Box>
          <Stack direction="row" sx={{ alignItems: 'center', minHeight: 28 }}>
            <Typography id="departure-label" variant="body2" sx={{ flexGrow: 1 }}>
              {describeDeparture(departure, hours)}
            </Typography>
            {safest !== hours ? (
              <Button size="small" onClick={() => onHoursChange(safest)} sx={{ minHeight: 28 }}>
                {safest === 0 ? 'Safest: now' : `Safest: +${safest} h`}
              </Button>
            ) : null}
          </Stack>
          <Slider
            size="small"
            aria-labelledby="departure-label"
            value={hours}
            min={0}
            max={maxHours}
            step={1}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => departureClock(departure, value)}
            getAriaValueText={(value) => describeDeparture(departure, value)}
            onChange={(_event, value) => onHoursChange(value)}
            sx={{ mx: 1, width: 'calc(100% - 16px)', py: 1 }}
          />
        </Box>
      ) : null}

      <Box>
        <Typography variant="caption" color="text.secondary" component="h3" sx={{ mb: 0.5 }}>
          {count === 1 ? '1 route found' : `${count} routes found`}, safest first
          {plan.routes.some((route) => route.unknown_weather_miles > 0)
            ? ' · part of the trip is beyond the forecast'
            : ''}
        </Typography>
        <Stack component="ol" spacing={0.75} sx={{ listStyle: 'none', p: 0, m: 0 }}>
          {plan.routes.map((route) => {
            const selected = route.id === selectedId
            return (
              <Box component="li" key={route.id}>
                <ButtonBase
                  onClick={() => onSelect(route.id)}
                  aria-label={`Show ${routeName(route)} on the map`}
                  aria-current={selected ? 'true' : undefined}
                  sx={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    py: 1,
                    borderRadius: '12px',
                    border: 1,
                    borderColor: selected ? 'primary.main' : 'm3.outlineVariant',
                    bgcolor: selected ? 'm3.surfaceContainerHigh' : 'm3.surfaceContainerLowest',
                    textAlign: 'left',
                  }}
                >
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      flexShrink: 0,
                      bgcolor: selected ? 'primary.main' : 'm3.outline',
                    }}
                  />
                  <Typography variant="subtitle2" sx={{ flexShrink: 0 }}>
                    {routeName(route)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ flexGrow: 1 }}>
                    {formatMiles(route.distance_miles)} · {formatDuration(route.duration_minutes)}
                  </Typography>
                  <RiskChip level={worstRisk(route)} />
                </ButtonBase>
              </Box>
            )
          })}
        </Stack>
      </Box>

      <Button
        variant="outlined"
        fullWidth
        startIcon={<KeyboardArrowUpIcon />}
        onClick={onMore}
        sx={{ borderRadius: '20px' }}
      >
        Details &amp; checkpoints
      </Button>
    </Stack>
  )
}

export default CompactResults
