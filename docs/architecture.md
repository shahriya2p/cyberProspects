# Architecture

Cyber Prospect has three parts: a batch pipeline that turns the raw DNS dump into a
scored company table, a read-only API over that table, and a React front end.
They meet at exactly one artifact — `app.duckdb` — so each part can be understood
on its own.

```
 26GB bz2 (ip, hostname)                 pipeline/            api/            web/
 ┌───────────────────┐   extract   ┌──────────────┐   read  ┌────────┐  fetch ┌────────┐
 │ ip_hostname.parquet│──shards────▶│ DuckDB build │────────▶│FastAPI │◀───────│ React  │
 │  v4/v6 · buckets   │  tldextract │  → app.duckdb│  (ro)   │ + SPA  │  JSON  │ +Query │
 └───────────────────┘             └──────────────┘         └────────┘        └────────┘
```

## Pipeline (`pipeline/`)

Three stages, wired together by the `Makefile`:

1. **extract** (`extract.py`) streams the bz2 through `tar --fast-read` and pulls
   only the requested bucket shards. Buckets are an IP hash partition, so a
   contiguous front-of-archive slice is both a uniform sample and cheap to reach.
2. **domains** (`domains.py`) is the one thing DuckDB can't do: resolve each
   distinct hostname to its registrable domain via the Public Suffix List
   (`tldextract`, pinned to a committed snapshot). It fans the millions of
   lookups across cores and writes a `hostname → domain` parquet.
3. **build** (`build.py`) joins the raw rows to that map, aggregates per domain,
   reads the attack-surface signals out of the subdomains, scores each company,
   flags shared-infrastructure noise, and precomputes the dashboard rollups. The
   signal columns and scoring arithmetic are all generated from `signals.yaml`,
   so the taxonomy lives in one place.

Output is a single `app.duckdb`. The whole thing is reproducible with `make data`
and deterministic given the pinned suffix list and a fixed bucket set.

## API (`api/`, FastAPI)

Opens `app.duckdb` read-only and answers analytical queries. It's deliberately
thin — the hard work already happened in the pipeline.

- `GET /api/companies` — faceted search. The filter compiles to one parameterised
  `WHERE` (`filters.py`) that the page query, the count, and the facet queries all
  reuse. Facets leave their own dimension out so the counts show what else the rep
  could pick. Signal filters are a bitmask test: `signal_mask & m = m` (all) or
  `& m <> 0` (any).
- `GET /api/companies/{domain}` — the dossier: evidence per signal, a host sample,
  the score broken into its factors, and talking points assembled from the
  taxonomy (`pitch.py`).
- `GET /api/stats` — reads the precomputed rollup tables.
- `GET /api/export.csv` — streams the current filter as a lead list.
- `GET /api/signals`, `/api/meta`, `/healthz`.

Signal metadata is read from the database's `signal_catalog` at startup, so the
API carries no dependency on the pipeline code.

## Web (`web/`, React + Vite + Tailwind)

Three views — Dashboard, Explore, Company. TanStack Query handles fetching and
caching. The filter state lives entirely in the URL (`useFilters`), which is what
makes a saved segment just a shareable link and keeps the back button working.
In production FastAPI serves the built bundle, so there's a single origin and no
CORS; in dev Vite proxies `/api` to the API server.

## Why these tools

- **DuckDB** for both the build and the serve. It chews through the aggregation
  in-process and then answers faceted `GROUP BY`s over ~1.7M rows in single-digit
  milliseconds — no separate database to run.
- **tldextract** because correct eTLD+1 needs the real Public Suffix List, and
  getting `co.za` / `com.ng` wrong would merge unrelated companies.
- **FastAPI + Pydantic** for typed request/response with an OpenAPI schema for
  free.
- **One container** so a Python API with a bundled analytical dataset deploys
  anywhere that runs Docker, with nothing else to stand up.
