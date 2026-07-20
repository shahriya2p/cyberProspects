# Cyber Prospect

**Attack-surface prospecting for a cybersecurity sales team.**

Cyber Prospect turns a global IP→hostname (passive DNS) dataset into a prospecting tool.
It rolls the internet up into companies, reads each company's exposed attack
surface out of its hostnames, scores it, and lets a rep filter the world down to
the accounts their product is built to sell against — with the evidence and the
opening line ready to go.


## Why this, on this data

Most sales-intelligence tools sell firmographics — headcount, revenue, industry.
This dataset has none of that. What it has is every company's **internet-facing
footprint**, and for a security vendor that's the better signal: their buying
trigger isn't *how big are you*, it's *what are you exposing*. A hostname like
`vpn.acme.co.za` or `gitlab.acme.com` is a qualified reason to reach out.

So Cyber Prospect reads subdomains as attack-surface signals — mail infra, cPanel
hosting, remote access, exposed dev/CI, admin panels, storage — groups them by
company, and ranks by exposure. The design write-up is in


## What a rep does with it

**Build a segment** — e.g. South African companies exposing a remote-access
gateway with 10+ hosts — then sort, save the link, and export to CRM.



**Open a company** — see exactly what's exposed, why it matters, and a talking
point grounded in a real hostname.



## Quick start

Prerequisites: Python 3.11+, Node 20+, and the source archive
(`b2_download_file_by_id.bz2`) at the repo's parent directory (or point `SOURCE`
at it).

```bash
make deps          # python venv + npm install
make data          # extract shards → resolve domains → build app.duckdb  (~4 min)
make api           # FastAPI on :8000   (terminal 1)
make web           # Vite dev server on :5173, proxies /api  (terminal 2)
```

Or run the whole thing as one container:

```bash
make data
make image
docker run -p 8000:8000 cyber-prospect     # http://localhost:8000
```

`make data` defaults to a representative sample of buckets; it's a uniform random
sample of the global address space, so it's honestly representative. Scale up with
`make data BUCKETS="0 1 2 3 4 5 6 7"` or `make data-full`.

## How it works

Three parts meeting at one artifact, `app.duckdb`:

- **`pipeline/`** — a DuckDB batch job. Extracts bucket shards from the archive,
  resolves hostnames to registrable domains through the Public Suffix List
  (`tldextract`), aggregates per company, reads the signals, scores, filters out
  shared-infrastructure noise, and precomputes the dashboard rollups.
- **`api/`** — FastAPI over the read-only database. Faceted search, the company
  dossier, stats, and CSV export. The filter compiles to one parameterised query
  reused by the list, the facets, and the export.
- **`web/`** — React + Vite + Tailwind. Dashboard, Explore, Company. Filter state
  lives in the URL, so a saved segment is just a shareable link.

Full detail in [docs/architecture.md](docs/architecture.md); the scoring model in
[docs/scoring.md](docs/scoring.md); the schema in
[docs/data-dictionary.md](docs/data-dictionary.md).

## Repo layout

```
pipeline/   extract.py · domains.py · build.py · signals.yaml · ccmap.csv
api/        app/{main.py,config.py} · app/models/ · app/schemas/ · app/services/ · app/routes/
web/        src/{pages,components,lib,api}
deploy/     Dockerfile · deploy notes
docs/       architecture · scoring · data-dictionary · planning · notes · decisions
```

