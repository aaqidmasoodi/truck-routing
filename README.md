# Weather-Aware Truck Routing

Pick the safest route for a truck, based on weather, load weight and travel time.

Enter a start, a destination, the truck's weight and when to leave. The app finds three
routes, checks the forecast every 10, 25 or 50 miles for the time the truck gets there, and
recommends the safest one. A slider shows how things change if you leave up to 48 hours
later.

- `backend/`: Django REST API
- `frontend/`: React, TypeScript, Material UI, Leaflet

## On the map

The selected route is coloured like traffic: **Clear**, **Caution**, **Slow down**,
**Dangerous**, **Do not drive**. An icon marks each stretch that isn't clear (wind, rain,
snow, or a stop sign) and says what's wrong, how bad and when you'd get there. Switch to
Wind, Rain or Snow to see one condition, with its limits in real units.

## Rules

Each checkpoint takes the worst of its wind, rain and snow level:

| Level        | Wind      | Rain (in/h) | Snow (in/h) |
| ------------ | --------- | ----------- | ----------- |
| Clear        | < 25 mph  | < 0.10      | < 0.5       |
| Caution      | 25–34     | 0.10–0.25   | 0.5–1.0     |
| Slow down    | 35–44     | 0.25–0.50   | 1.0–2.0     |
| Dangerous    | 45–54     | 0.50–1.00   | 2.0–3.0     |
| Do not drive | ≥ 55      | > 1.00      | > 3.0       |

Heavy loads: 45–54 mph over 30,000 lb is Do not drive; 35–44 mph over 40,000 lb is
Dangerous. A value on a shared edge goes to the higher level.

Routes are ranked by fewest Do not drive miles, then Dangerous miles, then Slow down miles,
then lowest average level (weighted by miles), then shortest time.

## Routes

Routes come from the public [OSRM](https://project-osrm.org) servers, which often return
only one or two. The rest come from detours through a point either side of the trip. A
detour is kept only if it's at most 1.6× as slow as the fastest route and mostly on
different roads. Where geography leaves no third sensible road, a trip shows fewer.

Places and weather come from [Open-Meteo](https://open-meteo.com). No API keys are needed.
Lookups are cached; miles beyond the forecast count as Clear and are flagged.

## Run locally

```bash
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt && python manage.py migrate && python manage.py runserver
```

```bash
cd frontend && npm install && npm run dev
```

Open http://localhost:5173. API docs are at http://localhost:8000/api/docs/.

## Deploy

One Docker service serves the API and the built frontend. On Render, choose **New >
Blueprint** and pick this repo; `render.yaml` does the rest.

| Variable               | Default                 | Meaning                     |
| ---------------------- | ----------------------- | --------------------------- |
| `DJANGO_SECRET_KEY`    | dev key when debugging  | Required in production      |
| `DJANGO_DEBUG`         | `1` (`0` in the image)  | Debug mode                  |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1`   | Hostnames to answer         |
| `ROUTING_URLS`         | two public OSRM servers | OSRM servers, tried in turn |

## Checks

```bash
cd backend && ruff check . && mypy . && pytest --cov
cd frontend && npm run lint && npm run typecheck && npm test
```

`backend/routing/tests/test_brief_conformance.py` checks the risk, load, ranking and
checkpoint rules against a reference written from the brief, across thousands of inputs.
CI runs everything on every pull request.
