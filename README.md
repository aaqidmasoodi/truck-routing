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
