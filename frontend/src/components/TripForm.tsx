import { useState, type FormEvent } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import PlaceIcon from '@mui/icons-material/Place'
import RouteIcon from '@mui/icons-material/Route'
import SwapVertIcon from '@mui/icons-material/SwapVert'
import TripOriginIcon from '@mui/icons-material/TripOrigin'
import type { Trip } from '../api/client'
import { checkDraft, emptyDraft, latestDeparture, toLocalInput, type TripDraft } from '../tripDraft'
import PlaceSearch from './PlaceSearch'
import SpacingPicker from './SpacingPicker'

interface TripFormProps {
  loading: boolean
  /** The checked trip, plus a short name for it like "Denver → Chicago". */
  onSubmit: (trip: Trip, name: string) => void
  /** Called on any edit, since old results no longer match the form. */
  onChange: () => void
  /** Small fields and no hints, so the whole form fits on a phone without scrolling. */
  compact?: boolean
}

function TripForm({ loading, onSubmit, onChange, compact = false }: TripFormProps) {
  const [draft, setDraft] = useState<TripDraft>(emptyDraft)
  // The clock moves on, so this is refreshed on every edit and checked again on submit.
  const [now, setNow] = useState(() => new Date())
  const { trip, errors } = checkDraft(draft, now)
  const size = compact ? 'small' : 'medium'

  const update = <K extends keyof TripDraft>(key: K, value: TripDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setNow(new Date())
    onChange()
  }

  const swap = () => {
    setDraft((current) => ({
      ...current,
      origin: current.destination,
      destination: current.origin,
    }))
    onChange()
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const latest = checkDraft(draft, new Date())
    if (latest.trip && !loading) {
      onSubmit(latest.trip, `${draft.origin?.name ?? ''} → ${draft.destination?.name ?? ''}`)
    }
  }

  const weight = (
    <TextField
      label="Truck weight"
      size={size}
      value={draft.weightText}
      onChange={(event) => update('weightText', event.target.value)}
      error={Boolean(errors.weight)}
      helperText={errors.weight ?? (compact ? null : 'Gross weight, load included')}
      fullWidth
      slotProps={{
        htmlInput: { inputMode: 'numeric' },
        input: { endAdornment: <InputAdornment position="end">lb</InputAdornment> },
      }}
      sx={compact ? { flex: 1 } : undefined}
    />
  )

  const leaveAt = (
    <TextField
      label="Leave at"
      type="datetime-local"
      size={size}
      value={draft.leaveAt}
      onChange={(event) => update('leaveAt', event.target.value)}
      error={Boolean(errors.leaveAt)}
      helperText={
        errors.leaveAt ?? (compact ? null : 'Leave blank to go now, or pick up to 48 h ahead')
      }
      fullWidth
      slotProps={{
        inputLabel: { shrink: true },
        htmlInput: { min: toLocalInput(now), max: toLocalInput(latestDeparture(now)) },
      }}
      sx={compact ? { flex: 1.25 } : undefined}
    />
  )

  return (
    <Box
      component="form"
      onSubmit={submit}
      noValidate
      sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      {/* Start above destination with a swap button beside them, like a map app. */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <Stack spacing={compact ? 1.5 : 0} sx={{ flex: 1, minWidth: 0 }}>
          <PlaceSearch
            label="From"
            value={draft.origin}
            onChange={(place) => update('origin', place)}
            icon={<TripOriginIcon fontSize="small" color="primary" />}
            compact={compact}
          />
          <PlaceSearch
            label="To"
            value={draft.destination}
            onChange={(place) => update('destination', place)}
            error={errors.destination}
            icon={<PlaceIcon fontSize="small" sx={{ color: 'm3.tertiary' }} />}
            compact={compact}
          />
        </Stack>
        <Tooltip title="Swap start and destination">
          <span>
            <IconButton
              aria-label="Swap start and destination"
              onClick={swap}
              disabled={!draft.origin && !draft.destination}
              sx={{ mb: compact ? 0 : 2.5 }}
            >
              <SwapVertIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
      {compact ? (
        // Phone: weight and departure share a row, then the spacing on one short line.
        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
          <Stack direction="row" spacing={1}>
            {weight}
            {leaveAt}
          </Stack>
          <SpacingPicker
            compact
            value={draft.spacing}
            onChange={(spacing) => update('spacing', spacing)}
          />
        </Stack>
      ) : (
        <Stack spacing={2} sx={{ mt: 0.5, pr: 5.5 }}>
          {weight}
          {leaveAt}
          <SpacingPicker value={draft.spacing} onChange={(spacing) => update('spacing', spacing)} />
        </Stack>
      )}
      {/* At the bottom of the panel, just above the credits. */}
      <Box sx={{ mt: 'auto', pt: compact ? 2 : 3 }}>
        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={!trip || loading}
          loading={loading}
          startIcon={<RouteIcon />}
          sx={{
            minHeight: compact ? 48 : 56,
            borderRadius: compact ? '24px' : '28px',
            fontSize: '1rem',
          }}
        >
          Find routes
        </Button>
      </Box>
    </Box>
  )
}

export default TripForm
