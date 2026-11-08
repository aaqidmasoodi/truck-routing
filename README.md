# Weather-Aware Truck Routing

Helps a truck driver pick the safest route based on weather, load weight and travel time.

- `backend/`: Django + Django REST Framework API
- `frontend/`: React + Vite + TypeScript + Material UI

The UI follows Material 3. Colours come from Google's
[material-color-utilities](https://github.com/material-foundation/material-color-utilities),
generated from one seed colour in `frontend/src/colorScheme.ts`, and are mapped onto the
Material UI theme in `frontend/src/theme.ts`.

## How risk is worked out

Every checkpoint gets a risk level for wind, rain and snow using the thresholds from
the brief (see `backend/routing/risk.py`). Levels go Low, Moderate, High, Severe,
No Travel. When a value sits exactly on the edge between two bands it counts as the
higher one, so 25 mph wind is Moderate and 0.25 in/hr of rain is High.

Heavy trucks catch more wind, so the load weight can push the wind level up:

- 45-54 mph wind with more than 30,000 lb becomes No Travel
- 35-44 mph wind with more than 40,000 lb becomes Severe

The checkpoint's overall level is the worst of the three. You can try it directly:

```bash
curl -X POST localhost:8000/api/checkpoint-risk/ \
  -H "Content-Type: application/json" \
  -d '{"wind_mph": 48, "rain_in_per_hr": 0.2, "snow_in_per_hr": 0, "weight_lb": 35000}'
```

This returns the level for each condition, the overall level, and which conditions caused it.

## The trip form

Start, destination, truck weight (required, up to 200,000 lb), when to leave and how often
to check the weather. Leaving the time blank means now; otherwise it has to be within the
next 48 hours, since that's as far as the forecast goes. The form checks everything before
asking the server (`frontend/src/tripDraft.ts`): a weight that isn't a number, the same
place twice, or a time that's passed or too far ahead all get a message under the field.
Enter submits, and the arrows swap start and destination.

## Finding places

Start and destination are looked up with the free
[Open-Meteo geocoding API](https://open-meteo.com/en/docs/geocoding-api), which needs no
API key. The backend wraps it at `GET /api/places/?q=denver`, caches each search for a day,
and returns a 502 with a friendly message if the geocoder is down. The search field waits
for a short pause in typing before it asks, so a word is one request, not one per letter.

Location data is based on [GeoNames](https://www.geonames.org).

## Finding routes

Up to three driving routes come from [OSRM](https://project-osrm.org), each with its
distance, drive time and the points along the road. OSRM sends the shape as an encoded polyline, which `backend/routing/polyline.py`
decodes. Results are cached for an hour. It asks the OpenStreetMap-hosted OSRM server first
and falls back to the OSRM project's demo server, since both are free and best effort.

Two things to know:

- The public OSRM server only has a car profile, so it doesn't know about truck
  restrictions such as low bridges or weight limits. Set `ROUTING_URLS` (comma separated)
  to an OSRM server with a truck profile to change that.
- OSRM only returns alternatives it thinks are reasonable, so some trips get fewer than three.

Map data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright).

## Checkpoints

Weather is checked at points along each route rather than everywhere. The driver picks
the spacing: every 10, 25 or 50 miles (`spacing_miles`, 25 by default). Each route gets a
checkpoint at the start, one at every spacing mark, and one at the destination
(`backend/routing/checkpoints.py`).

- Distances along the route shape use the haversine formula. The decoded shape cuts a few
  corners, so checkpoint miles are scaled to the road distance OSRM reports.
- Each checkpoint covers half the road to its neighbours on either side, so the shares add
  up to the whole route. Ranking uses this to count Severe and High miles.
- Arrival times assume the route's average speed all the way. OSRM only gives a total
  time, and this spreads the error evenly instead of letting it pile up at one end.

`departure` is optional (now by default) and must be within the next 48 hours, since
that's as far as the forecast reaches.

## Weather at each checkpoint

Forecasts come from the free [Open-Meteo forecast API](https://open-meteo.com/en/docs)
(`backend/routing/clients/weather.py`). Every checkpoint gets the forecast for the hour
the truck is due there, not the weather right now.

- All checkpoints of all routes go out in one request (100 places per request), with
  coordinates rounded to about 1 km so nearby checkpoints share a forecast.
- Forecasts are cached per place for 30 minutes, so asking again only fetches new places.
- Rain is `rain + showers` and snow is `snowfall`, both totals for the hour ending at each
  timestamp, so a truck due at 14:20 gets the 14:00 to 15:00 hour. Wind is a snapshot, so it
  uses the nearest hour. Units come back as mm and cm and are converted to inches here.
- If Open-Meteo is down, routes still come back and the weather shows as unknown.

## Planning a trip

`POST /api/plan/` does the whole job (`backend/routing/planner.py`): it finds the route
options, places checkpoints, looks up the forecast for every checkpoint on every route in
one go, works out each checkpoint's risk for the truck's weight, and ranks the routes.

```bash
curl -X POST localhost:8000/api/plan/ -H "Content-Type: application/json" \
  -d '{"origin": {"latitude": 39.74, "longitude": -104.98},
       "destination": {"latitude": 41.88, "longitude": -87.63},
       "weight_lb": 36000, "spacing_miles": 25}'
```

| Field | Required | Notes |
|---|---|---|
| `origin`, `destination` | yes | `{"latitude": ..., "longitude": ...}` |
| `weight_lb` | yes | Gross weight, 1 to 200,000 lb |
| `spacing_miles` | no | 10, 25 (default) or 50 |
| `departure` | no | ISO date-time within the next 48 hours, now by default |

The answer lists the routes safest first, with `recommended_route_id`, a plain `reason`
("12 fewer miles of Severe weather"), and `safe_to_travel`, which is false when even the
best route runs into No Travel weather. Every checkpoint carries its arrival time, the
forecast, and its risk level with the conditions that caused it. Miles with no forecast
(past the forecast window, or Open-Meteo down) are reported as `unknown_weather_miles` and
count as Low, so the ranking falls back to drive time instead of failing.

No road between the places gives a 404, and the routing service being down gives a 502.

## The map

Routes are drawn with [Leaflet](https://leafletjs.com) on CARTO's light basemap
(`frontend/src/components/RouteMap.tsx`). Every option is on the map; the selected one is
bold and drawn on top, and it starts as the recommended route. Clicking a line or a route
card selects it in both places. The map zooms to fit the routes for each new plan, and its
code only loads once there are results, so the first page load stays small.

The selected route's checkpoints are dots in their risk colour (grey when there's no
forecast for that time), with a key in the corner. Clicking one shows when the truck gets
there, the forecast, and why it got its level, for example "Severe because of wind".

## How routes are ranked

Each checkpoint covers a stretch of road, and that stretch takes the checkpoint's risk
level. Routes are then compared in this order (see `backend/routing/ranking.py`):

1. Fewest miles of No Travel weather. The brief doesn't rank these, but the truck
   shouldn't drive into them at all, so they come first.
2. Fewest Severe miles
3. Fewest High miles
4. Lowest average risk, weighted by distance
5. Shortest travel time

The top route also gets a short reason, such as "12 fewer miles of Severe weather".

## Running locally

Backend (Python 3.12+):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python manage.py migrate
python manage.py runserver
```

Frontend (Node 22+), in a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Requests to `/api` are proxied to the backend on port 8000.

### Debugging

- Backend: with `DJANGO_DEBUG=1` (the default locally) the app logs debug lines to the
  console. Set `LOG_LEVEL` to change that, for example `LOG_LEVEL=WARNING`.
- Frontend: debug logs show in the browser console during `npm run dev`. For a production
  build, set `VITE_DEBUG=true` to keep them.

## API docs and types

With the backend running, the interactive docs are at http://localhost:8000/api/docs/ and
the raw OpenAPI schema at `/api/schema/`. The schema is also committed as
`backend/openapi.yaml`, and the frontend's API types in `frontend/src/api/schema.ts` are
generated from it, so the two sides can't drift apart quietly.

After changing an endpoint or serializer:

```bash
cd backend && python manage.py spectacular --file openapi.yaml
cd ../frontend && npm run gen:api
```

A backend test fails if `openapi.yaml` is out of date, and CI fails if the generated types
are. The generator runs with its own copy of TypeScript 5, since TypeScript 7 doesn't have
the compiler API it needs.

## Checks

Backend:

```bash
cd backend
ruff check . && ruff format --check .
mypy .
pytest --cov
```

Frontend:

```bash
cd frontend
npm run lint && npm run format:check
npm run typecheck
npm test
```

Both run in CI on every pull request. To run them before each commit:

```bash
pip install pre-commit
pre-commit install
```
