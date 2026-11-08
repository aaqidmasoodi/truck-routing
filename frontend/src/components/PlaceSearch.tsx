import { useEffect, useState, type ReactNode } from 'react'
import Autocomplete from '@mui/material/Autocomplete'
import CircularProgress from '@mui/material/CircularProgress'
import InputAdornment from '@mui/material/InputAdornment'
import TextField from '@mui/material/TextField'
import { searchPlaces, type Place } from '../api/client'
import { debug } from '../debug'

interface PlaceSearchProps {
  label: string
  value: Place | null
  onChange: (place: Place | null) => void
  /** A problem with the chosen place, shown under the field. */
  error?: string | undefined
  /** Shown at the start of the field, like the start and end pins on a map. */
  icon?: ReactNode
  /** Smaller, for a phone screen. */
  compact?: boolean
}

interface SearchResult {
  query: string
  places: Place[]
  failed: boolean
}

const MIN_LETTERS = 2
const TYPING_PAUSE_MS = 300

function PlaceSearch({ label, value, onChange, error, icon, compact }: PlaceSearchProps) {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<SearchResult>({ query: '', places: [], failed: false })

  const query = input.trim()
  // Once a place is picked the box shows its full name; that's not a new search.
  const showingChoice = value !== null && query === value.display_name
  const ready = query.length >= MIN_LETTERS && !showingChoice

  useEffect(() => {
    if (!ready) return

    // Wait for a pause in typing so "Denver" is one request, not six.
    const controller = new AbortController()
    const timer = setTimeout(() => {
      debug('places', 'searching', query)
      searchPlaces(query, controller.signal)
        .then((places) => setResult({ query, places, failed: false }))
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          debug('places', 'search failed', query, error)
          setResult({ query, places: [], failed: true })
        })
    }, TYPING_PAUSE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, ready])

  const loading = ready && result.query !== query
  const failed = ready && !loading && result.failed

  return (
    <Autocomplete
      options={showingChoice ? [value] : ready ? result.places : []}
      value={value}
      onChange={(_event, place) => onChange(place)}
      onInputChange={(_event, text) => setInput(text)}
      getOptionLabel={(place) => place.display_name}
      isOptionEqualToValue={(a, b) => a.latitude === b.latitude && a.longitude === b.longitude}
      filterOptions={(places) => places}
      loading={loading}
      noOptionsText={ready ? 'No places found' : 'Type at least 2 letters'}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          size={compact ? 'small' : 'medium'}
          error={failed || Boolean(error)}
          // A compact field only makes room underneath when there's something to say.
          helperText={
            failed ? 'Place search is unavailable right now' : (error ?? (compact ? null : ' '))
          }
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps.input,
              startAdornment: icon ? (
                <InputAdornment position="start" sx={{ ml: 0.5, mr: 0 }}>
                  {icon}
                </InputAdornment>
              ) : undefined,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={18} /> : null}
                  {params.slotProps.input.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  )
}

export default PlaceSearch
