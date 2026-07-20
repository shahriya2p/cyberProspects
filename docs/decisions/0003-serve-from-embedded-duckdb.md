# 0003 — Serve from an embedded DuckDB file, baked into one image

## Context

The API needs to answer faceted search — filter, sort, paginate, and count by
country and by signal — over ~1.7M company rows, fast, on cheap hosting.

## Decision

Precompute everything into a single read-only DuckDB file and open it in-process
from FastAPI. Bake that file into the same container that serves the API and the
React bundle.

## Why

DuckDB is columnar and vectorised, so `GROUP BY` facets and counts over a couple
of million rows come back in single-digit milliseconds with no indexes to tend and
no separate database to run. A row store (SQLite) would need careful indexing and
still lose on the facet aggregations.

Baking the file into one image means the deployment is a single artifact with zero
external dependencies — it runs anywhere Docker does, which suits the "host it
yourself" requirement.

## Trade-off

The image is large (~1.9 GB) because the dataset travels inside it, and the file
is read-only so there's no runtime persistence (fine — nothing writes to it). Both
are acceptable for a self-hosted analytical prototype; a bigger build can trim the
image by using fewer buckets.
