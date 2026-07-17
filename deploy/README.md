# Deploying Cyber Prospect

The whole app ships as one image: FastAPI serves the API and the built React
bundle from a single origin, with the DuckDB file baked in. There's nothing else
to run — no separate database, no external services.

## Build and run

```bash
make data                      # build pipeline/data/derived/app.duckdb first
docker build -f deploy/Dockerfile -t cyber-prospect .
docker run -p 8000:8000 cyber-prospect
# open http://localhost:8000
```

The image is ~1.9 GB because the analytical database travels inside it. That's the
trade-off for a zero-dependency deploy; shrink it by building on fewer buckets
(`make data BUCKETS="18 28"`).

## Hosting it

Any host that runs a container works. A few that need almost no setup:

- **Fly.io** — `fly launch` picks up `deploy/Dockerfile`. Set the internal port to
  8000. Always-on costs a couple of dollars a month.
- **Render** — new Web Service → Docker → point at `deploy/Dockerfile`. The free
  tier sleeps after 15 minutes and has 512 MB RAM, which is tight for the larger
  builds; the $7 instance is comfortable.
- **Hugging Face Spaces (Docker SDK)** — free CPU tier gives 16 GB RAM and 50 GB
  disk, which fits even a full-data build. Add a Space `README.md` header with
  `sdk: docker` and `app_port: 8000`.

`PORT` is read from the environment if the platform injects one.
