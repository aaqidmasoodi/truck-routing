import { useEffect, useRef, useState, type FormEvent } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import Slider from '@mui/material/Slider'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import HistoryIcon from '@mui/icons-material/History'
import PlaceIcon from '@mui/icons-material/Place'
import RouteIcon from '@mui/icons-material/Route'
import SwapVertIcon from '@mui/icons-material/SwapVert'
import TripOriginIcon from '@mui/icons-material/TripOrigin'
import type { Trip } from '../api/client'
import {
  loadRecentTrips,
  recentPlaces,
  rememberTrip,
  tripLabel,
  type RecentTrip,
} from '../recentTrips'
import {
  checkDraft,
  DEFAULT_WEIGHT_LB,
  emptyDraft,
  latestDeparture,
  parseWeight,
  SLIDER_MAX_LB,
  SLIDER_MIN_LB,
  toLocalInput,
  type TripDraft,
} from '../tripDraft'
import { tripSearch } from '../tripLink'
import PlaceSearch from './PlaceSearch'
import SpacingPicker from './SpacingPicker'

interface TripFormProps {
  loading: boolean
  /** The checked trip, plus a short name for it like "Denver → Chicago". */
  onSubmit: (trip: Trip, name: string) => void
  /** Called on any edit, since old results no longer match the form. */
  onChange: () => void
  /** A trip to start from, such as one opened from a shared link; it's planned straight away. */
  initialDraft?: TripDraft | null
  /** Small fields and no hints, so the whole form fits on a phone without scrolling. */
  compact?: boolean
}

function TripForm({
  loading,
  onSubmit,
  onChange,
  initialDraft = null,
  compact = false,
}: TripFormProps) {
  const [draft, setDraft] = useState<TripDraft>(initialDraft ?? emptyDraft)
  // The clock moves on, so this is refreshed on every edit and checked again on submit.
  const [now, setNow] = useState(() => new Date())
  const { trip, errors } = checkDraft(draft, now)
  const size = compact ? 'small' : 'medium'
  const [recent, setRecent] = useState<RecentTrip[]>(loadRecentTrips)
  const places = recentPlaces(recent)
  const lastTrip = recent[0]

  /** Fill in both ends of a trip planned before. */
  const reuse = ({ origin, destination }: RecentTrip) => {
    setDraft((current) => ({ ...current, origin, destination }))
    setNow(new Date())
    onChange()
  }

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
    if (latest.trip && !loading && draft.origin && draft.destination) {
      setRecent((trips) =>
        rememberTrip(trips, { origin: draft.origin!, destination: draft.destination! }),
      )
      plan(latest.trip, draft)
    }
  }

  /** Plan the trip, and put it in the page address so the link can be shared. */
  const plan = (checked: Trip, planned: TripDraft) => {
    try {
      window.history.replaceState(null, '', tripSearch(planned) || window.location.pathname)
    } catch {
      // Some embedded browsers refuse; the trip is still planned.
    }
    onSubmit(checked, `${planned.origin?.name ?? ''} → ${planned.destination?.name ?? ''}`)
  }

  // A trip opened from a link is planned once, as soon as the page loads.
  const plannedFromLink = useRef(false)
  useEffect(() => {
    if (plannedFromLink.current || !initialDraft) return
    plannedFromLink.current = true
    const linked = checkDraft(initialDraft, new Date())
    if (linked.trip) plan(linked.trip, initialDraft)
    // Only ever on the first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const swapButton = (
    <Tooltip title="Swap start and destination">
      <span>
        <IconButton
          aria-label="Swap start and destination"
          onClick={swap}
          disabled={!draft.origin && !draft.destination}
        >
          <SwapVertIcon />
        </IconButton>
      </span>
    </Tooltip>
  )

  // The slider only shows while the weight is being set, so it's clear what it's for.
  const [weightOpen, setWeightOpen] = useState(false)
  const weightParts = useRef<HTMLElement[]>([])
  const keepWeightOpen = (element: HTMLElement | null) => {
    if (element && !weightParts.current.includes(element)) weightParts.current.push(element)
  }
  // Close only when the driver presses or tabs somewhere else. Watching for the weight box
  // losing focus closed it mid-drag: pressing the slider's track, or touching it on a phone,
  // takes focus from the box without giving it to the slider.
  useEffect(() => {
    if (!weightOpen) return
    const closeIfElsewhere = (event: Event) => {
      const target = event.target as Node | null
      weightParts.current = weightParts.current.filter((part) => part.isConnected)
      if (!target || !weightParts.current.some((part) => part.contains(target))) {
        setWeightOpen(false)
      }
    }
    document.addEventListener('pointerdown', closeIfElsewhere)
    document.addEventListener('focusin', closeIfElsewhere)
    return () => {
      document.removeEventListener('pointerdown', closeIfElsewhere)
      document.removeEventListener('focusin', closeIfElsewhere)
    }
  }, [weightOpen])

  const weight = (
    <TextField
      ref={keepWeightOpen}
      onFocus={() => setWeightOpen(true)}
      label="Truck weight"
      size={size}
      value={draft.weightText}
      onChange={(event) => update('weightText', event.target.value)}
      error={Boolean(errors.weight)}
      helperText={errors.weight ?? null}
      fullWidth
      slotProps={{
        htmlInput: { inputMode: 'numeric' },
        input: { endAdornment: <InputAdornment position="end">lb</InputAdornment> },
      }}
      sx={compact ? { flex: 1 } : undefined}
    />
  )

  // Where the brief's load rules start: strong wind is worse above these weights.
  const marks = [
    { value: 30_000, label: '30k' },
    { value: 40_000, label: '40k' },
  ]
  const typed = parseWeight(draft.weightText) ?? DEFAULT_WEIGHT_LB
  const weightSlider = (
    <Collapse in={weightOpen} unmountOnExit>
      <Box ref={keepWeightOpen} sx={{ px: 1, pt: compact ? 0.5 : 0 }}>
        <Slider
          aria-label="Truck weight in pounds"
          size={compact ? 'small' : 'medium'}
          min={SLIDER_MIN_LB}
          max={SLIDER_MAX_LB}
          step={1_000}
          marks={marks}
          value={Math.min(Math.max(typed, SLIDER_MIN_LB), SLIDER_MAX_LB)}
          onChange={(_event, value) => update('weightText', String(value))}
          valueLabelDisplay="auto"
          valueLabelFormat={(value) => `${value.toLocaleString('en-US')} lb`}
          sx={{ mt: compact ? 0 : 1, '& .MuiSlider-markLabel': { fontSize: '0.7rem' } }}
        />
        {compact ? null : (
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1.5 }}>
            Gross weight, load included. Over 30k and 40k lb, strong wind is more dangerous.
          </Typography>
        )}
      </Box>
    </Collapse>
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
      {/* Phone: the swap button sits beside the two fields. Desktop: it has its own row
          between them, so both fields use the panel's full width. */}
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
        <Stack spacing={compact ? 1.5 : 0.5} sx={{ flex: 1, minWidth: 0 }}>
          <PlaceSearch
            label="From"
            value={draft.origin}
            onChange={(place) => update('origin', place)}
            icon={<TripOriginIcon fontSize="small" color="primary" />}
            compact={compact}
            suggestions={places}
          />
          {compact ? null : (
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>{swapButton}</Box>
          )}
          <PlaceSearch
            label="To"
            value={draft.destination}
            onChange={(place) => update('destination', place)}
            error={errors.destination}
            icon={<PlaceIcon fontSize="small" sx={{ color: 'm3.tertiary' }} />}
            compact={compact}
            suggestions={places}
          />
        </Stack>
        {compact ? swapButton : null}
      </Stack>
      {lastTrip ? (
        // The last trip, to fill in both ends with one tap. Older places stay in the dropdowns.
        <Box aria-label="Last trip" sx={{ mt: compact ? 1 : 1.5, mb: compact ? 0 : 0.5 }}>
          <Chip
            icon={<HistoryIcon />}
            label={tripLabel(lastTrip, recent)}
            title={`${lastTrip.origin.display_name} → ${lastTrip.destination.display_name}`}
            onClick={() => reuse(lastTrip)}
            size="small"
            variant="outlined"
            sx={{ maxWidth: '100%' }}
          />
        </Box>
      ) : null}
      {compact ? (
        // Phone: weight and departure share a row, then the spacing on one short line.
        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
          <Stack direction="row" spacing={1}>
            {weight}
            {leaveAt}
          </Stack>
          {weightSlider}
          <SpacingPicker
            compact
            value={draft.spacing}
            onChange={(spacing) => update('spacing', spacing)}
          />
        </Stack>
      ) : (
        <Stack spacing={2.5} sx={{ mt: 2.5 }}>
          <Box>
            {weight}
            {weightSlider}
          </Box>
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
