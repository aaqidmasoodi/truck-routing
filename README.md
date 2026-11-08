# Weather-Aware Truck Routing

Helps a truck driver pick the safest route based on weather, load weight and travel time.

- `backend/`: Django + Django REST Framework API
- `frontend/`: React + Vite + TypeScript + Material UI

## How risk is worked out

Every checkpoint gets a risk level for wind, rain and snow using the thresholds from
the brief (see `backend/routing/risk.py`). Levels go Low, Moderate, High, Severe,
No Travel. When a value sits exactly on the edge between two bands it counts as the
higher one, so 25 mph wind is Moderate and 0.25 in/hr of rain is High.

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
