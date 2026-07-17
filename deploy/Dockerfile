# One image that serves the API and the built web bundle from a single origin,
# with the DuckDB file baked in. Build from the repo root:
#   docker build -f deploy/Dockerfile -t cyber-prospect .
# The database must exist first (`make data`); it's copied in at the last step
# so day-to-day code changes don't bust the heavier layers.

FROM node:22-alpine AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM python:3.13-slim AS runtime
WORKDIR /srv
COPY api/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY api/ ./api/
COPY --from=web /web/dist ./web/dist
COPY pipeline/data/derived/app.duckdb ./data/app.duckdb

ENV CYBER_PROSPECT_DB=/srv/data/app.duckdb \
    CYBER_PROSPECT_WEB=/srv/web/dist \
    PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --app-dir api --host 0.0.0.0 --port ${PORT:-8000}"]
