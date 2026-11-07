# Weather-Aware Truck Routing

Helps a truck driver pick the safest route based on weather, load weight and travel time.

- `backend/`: Django + Django REST Framework API
- `frontend/`: React + Vite + TypeScript + Material UI

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

```bash
cd backend && ruff check . && ruff format --check . && python manage.py test
cd frontend && npm run lint && npm run build
```
