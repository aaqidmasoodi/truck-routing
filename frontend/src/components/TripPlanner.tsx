import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type RefObject,
  type TouchEvent,
  type WheelEvent,
} from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import ButtonBase from '@mui/material/ButtonBase'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Skeleton from '@mui/material/Skeleton'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { ApiError, planTrip, type Trip, type TripPlan } from '../api/client'
import { debug } from '../debug'
import { planAt } from '../timeline'
import CompactResults from './CompactResults'
import Credits from './Credits'
import PlanningPlaceholder from './PlanningPlaceholder'
import PlanResults from './PlanResults'
import TripForm from './TripForm'

// Leaflet is the biggest dependency, so it loads in its own chunk.
const RouteMap = lazy(() => import('./RouteMap'))

type Lookup =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'done'; plan: TripPlan }
  | { state: 'failed'; message: string }

/** The panel shows one page at a time: the trip form, or the routes it found. */
type Page = 'form' | 'results'

/**
 * How far the phone sheet is pulled up: just its header, about half the screen with the
 * map above, or all the way with every detail of the results.
 */
type Sheet = 'peek' | 'half' | 'full'

// How far a finger has to move before it counts as a swipe.
const SWIPE_PX = 40
// The app bar and the sheet's own header, which a full sheet stops below.
const FULL_SHEET_OFFSET = '124px'

/** How tall an element is, kept up to date as it grows and shrinks. */
function useHeight(ref: RefObject<HTMLElement | null>): number {
  const [height, setHeight] = useState(0)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => setHeight(element.offsetHeight))
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return height
}

/**
 * Laid out like a map app. On a big screen the planner is a panel on the left and the map
 * fills the rest; on a phone the map fills the screen and the planner is a sheet over it
 * that can be pulled up for every detail or pushed down out of the way.
 */
function TripPlanner() {
  const theme = useTheme()
  const wide = useMediaQuery(theme.breakpoints.up('md'), { noSsr: true })
  const [lookup, setLookup] = useState<Lookup>({ state: 'idle' })
  const [page, setPage] = useState<Page>('form')
  const [tripName, setTripName] = useState('')
  const [sheetState, setSheetState] = useState<Sheet>('half')
  const [hours, setHours] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const sheet = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const sheetHeight = useHeight(sheet)
  const touch = useRef<{ y: number; atTop: boolean } | null>(null)

  const planned = lookup.state === 'done' ? lookup.plan : null
  const plan = planned ? planAt(planned, hours) : null
  // Follow the recommendation until the driver picks a route themselves.
  const selectedId =
    plan && picked && plan.routes.some((route) => route.id === picked)
      ? picked
      : (plan?.recommended_route_id ?? '')

  // Only the results have more to show than half a screen.
  const canGoFull = page === 'results' && planned !== null
  const full = !wide && sheetState === 'full'
  const bodyHidden = !wide && sheetState === 'peek'


  const up = () =>
    setSheetState((state) => (state === 'peek' ? 'half' : canGoFull ? 'full' : state))
  const down = () => setSheetState((state) => (state === 'full' ? 'half' : 'peek'))
  const toggle = () => setSheetState((state) => (state === 'half' ? 'peek' : 'half'))

  const startSwipe = (event: TouchEvent) => {
    const y = event.touches[0]?.clientY
    if (y !== undefined) touch.current = { y, atTop: (body.current?.scrollTop ?? 0) <= 0 }
  }

  /** On the header any swipe moves the sheet; on the body only when it can't scroll. */
  const endSwipe = (event: TouchEvent, onHeader: boolean) => {
    const start = touch.current
    const y = event.changedTouches[0]?.clientY
    touch.current = null
    if (!start || y === undefined) return
    const moved = y - start.y
    if (moved < -SWIPE_PX && (onHeader || sheetState === 'half')) up()
    else if (moved > SWIPE_PX && (onHeader || (sheetState === 'full' && start.atTop))) down()
  }

  /** Scrolling up past the summary pulls the sheet open; scrolling down at the top shuts it. */
  const wheel = (event: WheelEvent) => {
    if (wide) return
    if (event.deltaY > 0 && sheetState === 'half') up()
    else if (event.deltaY < 0 && sheetState === 'full' && (body.current?.scrollTop ?? 0) <= 0)
      down()
  }

  const search = async (trip: Trip, name: string) => {
    setTripName(name)
    setPage('results')
    setSheetState('half')
    setLookup({ state: 'loading' })
    try {
      const found = await planTrip(trip)
      debug('trip', found.routes.length, 'routes, recommending', found.recommended_route_id)
      setHours(0)
      setPicked(null)
      setLookup({ state: 'done', plan: found })
    } catch (error) {
      debug('trip', 'route lookup failed', error)
      const message =
        error instanceof ApiError ? error.message : "Couldn't reach the server. Try again."
      setLookup({ state: 'failed', message })
    }
  }

  const backToForm = () => {
    setPage('form')
    setSheetState('half')
  }

  const title = page === 'form' ? 'Plan a trip' : tripName
  const headerLabel =
    sheetState === 'peek' ? 'Show planner' : sheetState === 'full' ? 'Show less' : 'Hide planner'

  return (
    <Box sx={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex' }}>
      <Box
        component="section"
        aria-label="Map"
        sx={{
          order: 2,
          flex: 1,
          minWidth: 0,
          // On a phone the map sits behind the sheet and fills the whole screen.
          position: { xs: 'absolute', md: 'relative' },
          inset: { xs: 0, md: 'auto' },
        }}
      >
        <Suspense fallback={<Skeleton variant="rectangular" sx={{ height: '100%' }} />}>
          <RouteMap
            routes={plan?.routes ?? []}
            selectedId={selectedId}
            onSelect={setPicked}
            inset={wide ? 0 : sheetHeight}
            compact={!wide}
          />
        </Suspense>
      </Box>

      <Paper
        ref={sheet}
        component="section"
        aria-label="Trip planner"
        elevation={0}
        sx={{
          order: 1,
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'm3.surfaceContainerLow',
          // A side panel on big screens…
          width: { md: 440, lg: 480 },
          flexShrink: 0,
          borderRight: { md: 1 },
          borderColor: { md: 'm3.outlineVariant' },
          // …and a sheet over the bottom of the map on a phone.
          borderRadius: { xs: full ? 0 : '28px 28px 0 0', md: 0 },
          position: { xs: 'absolute', md: 'relative' },
          left: { xs: 0 },
          right: { xs: 0 },
          bottom: { xs: 0 },
          zIndex: { xs: 1100, md: 'auto' },
          boxShadow: { xs: '0 -4px 24px rgba(0, 0, 0, 0.16)', md: 'none' },
          transition: 'border-radius 250ms ease',
        }}
      >
        {wide ? null : (
          // The sheet's header: a grab bar, then back (on the results page), title and toggle.
          // Swipe it up or down to move the sheet, or tap it.
          <Box
            onTouchStart={startSwipe}
            onTouchEnd={(event) => endSwipe(event, true)}
            sx={{ px: 1, pt: 1, pb: 0.5, touchAction: 'none' }}
          >
            <Box
              aria-hidden
              onClick={sheetState === 'full' ? down : up}
              sx={{
                mx: 'auto',
                width: 32,
                height: 4,
                borderRadius: 2,
                bgcolor: 'm3.outline',
                opacity: 0.5,
                mb: 0.5,
                cursor: 'pointer',
              }}
            />
            <Stack direction="row" sx={{ alignItems: 'center', minHeight: 44 }}>
              {page === 'results' ? (
                <IconButton aria-label="Back to trip" onClick={backToForm}>
                  <ArrowBackIcon />
                </IconButton>
              ) : null}
              <ButtonBase
                onClick={sheetState === 'full' ? down : toggle}
                aria-expanded={sheetState !== 'peek'}
                aria-label={headerLabel}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  alignSelf: 'stretch',
                  justifyContent: 'space-between',
                  gap: 1,
                  pl: page === 'results' ? 0.5 : 1.5,
                  pr: 1,
                  borderRadius: '12px',
                }}
              >
                <Typography variant="subtitle1" noWrap sx={{ fontWeight: 500 }}>
                  {title}
                </Typography>
                {sheetState === 'peek' ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ButtonBase>
            </Stack>
          </Box>
        )}

        <Box
          ref={body}
          inert={bodyHidden}
          onWheel={wheel}
          onTouchStart={startSwipe}
          onTouchEnd={(event) => endSwipe(event, false)}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            overflowY: bodyHidden ? 'hidden' : 'auto',
            // On a phone it can still scroll, but without a scroll bar squeezing the layout.
            scrollbarWidth: { xs: 'none', md: 'auto' },
            '&::-webkit-scrollbar': { display: { xs: 'none', md: 'block' } },
            overscrollBehavior: 'contain',
            px: { xs: 2.5, sm: 3 },
            pb: bodyHidden ? 0 : 2,
            pt: bodyHidden ? 0 : { xs: 0.5, md: 3 },
            // A tall panel on big screens; on a phone it slides between its three heights.
            flex: { md: 1 },
            minHeight: { md: 0 },
            height: { xs: full ? `calc(100dvh - ${FULL_SHEET_OFFSET})` : 'auto', md: 'auto' },
            maxHeight: {
              xs: bodyHidden ? 0 : full ? `calc(100dvh - ${FULL_SHEET_OFFSET})` : '78dvh',
              md: 'none',
            },
            transition: 'max-height 250ms ease, height 250ms ease, padding 250ms ease',
          }}
        >
          {/* The form stays mounted while results show, so going back keeps what was typed. */}
          <Box
            sx={{
              display: page === 'form' ? 'flex' : 'none',
              flexDirection: 'column',
              flex: 1,
            }}
          >
            {wide ? (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 500 }}>
                  Plan a trip
                </Typography>
                <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                  Compare routes by weather risk and travel time.
                </Typography>
              </Box>
            ) : null}
            <TripForm
              compact={!wide}
              loading={lookup.state === 'loading'}
              onSubmit={(trip, name) => void search(trip, name)}
              onChange={() =>
                setLookup((current) => (current.state === 'loading' ? current : { state: 'idle' }))
              }
            />
          </Box>

          {page === 'results' ? (
            <Box sx={{ flex: 1 }}>
              {/* On a phone the sheet's own header has the back button and the trip name. */}
              {wide ? (
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 2, ml: -1 }}>
                  <Tooltip title="Edit the trip">
                    <IconButton aria-label="Back to trip" onClick={backToForm}>
                      <ArrowBackIcon />
                    </IconButton>
                  </Tooltip>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="overline" color="text.secondary" component="p">
                      Your routes
                    </Typography>
                    <Typography variant="h6" component="h2" noWrap sx={{ fontWeight: 500 }}>
                      {tripName}
                    </Typography>
                  </Box>
                </Stack>
              ) : null}
              {lookup.state === 'loading' ? <PlanningPlaceholder compact={!wide} /> : null}
              {lookup.state === 'failed' ? <Alert severity="error">{lookup.message}</Alert> : null}
              {planned && plan ? (
                // Everything on a big screen or a fully open sheet; the summary at half height.
                wide || full ? (
                  <PlanResults
                    planned={planned}
                    plan={plan}
                    hours={hours}
                    onHoursChange={setHours}
                    selectedId={selectedId}
                    onSelect={setPicked}
                  />
                ) : (
                  <CompactResults
                    planned={planned}
                    plan={plan}
                    hours={hours}
                    onHoursChange={setHours}
                    selectedId={selectedId}
                    onSelect={setPicked}
                    onMore={() => setSheetState('full')}
                  />
                )
              ) : null}
            </Box>
          ) : null}

          {/* On a phone the credits sit on the form page and the full results only. */}
          {wide || page === 'form' || full ? <Credits /> : null}
        </Box>
      </Paper>
    </Box>
  )
}

export default TripPlanner
