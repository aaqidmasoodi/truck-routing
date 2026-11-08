# Build the frontend, then serve it and the API from one small Python image.

FROM node:22-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_DEBUG=0 \
    LOG_LEVEL=INFO \
    PORT=8000

WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
COPY --from=frontend /app/frontend/dist /app/frontend/dist

# Neither step uses the secret key, but Django won't start in production without one.
RUN DJANGO_SECRET_KEY=build-only python manage.py collectstatic --noinput \
    && DJANGO_SECRET_KEY=build-only python manage.py migrate --noinput \
    && useradd --create-home app && chown -R app /app
USER app

EXPOSE 8000
# Two workers with a few threads each fits Render's free 512 MB, and a trip plan mostly
# waits on OSRM and Open-Meteo, so threads keep it responsive.
CMD gunicorn config.wsgi --bind 0.0.0.0:$PORT --workers 2 --threads 4 --timeout 60 \
    --access-logfile -
