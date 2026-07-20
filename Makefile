# Cyber Prospect — attack-surface prospecting built on a global DNS dataset.
# The data pipeline is the interesting part; everything downstream reads the
# DuckDB file it produces.

# Buckets are a hash partition of the IP space, so any subset is a uniform
# sample of the whole internet. These eight sit at the front of the archive,
# which keeps extraction to a fraction of the 26GB.
SOURCE  ?= ../b2_download_file_by_id.bz2
BUCKETS ?= 18 28 11 10 23 22 13 1
DB      ?= pipeline/data/derived/app.duckdb
PY      := .venv/bin/python
PIP     := .venv/bin/pip

.PHONY: help
help:
	@echo "Cyber Prospect make targets:"
	@echo "  make deps        install python + node dependencies"
	@echo "  make data        extract -> domain map -> build $(DB)  (BUCKETS='$(BUCKETS)')"
	@echo "  make data-full   same, but every v4+v6 bucket"
	@echo "  make api         run the FastAPI server on :8000"
	@echo "  make web         run the Vite dev server on :5173"
	@echo "  make test        run the python tests"
	@echo "  make image       build the deployable docker image"

.venv:
	python3 -m venv .venv
	$(PIP) install -q -U pip
	$(PIP) install -q -r pipeline/requirements.txt -r api/requirements.txt

.PHONY: deps
deps: .venv
	cd web && npm install

# --- data pipeline -----------------------------------------------------------

.PHONY: extract
extract: .venv
	$(PY) -m pipeline.extract --source "$(SOURCE)" --buckets $(BUCKETS)

.PHONY: domainmap
domainmap: .venv
	$(PY) -m pipeline.domains

.PHONY: company
company: .venv
	$(PY) -m pipeline.build --db "$(DB)"

.PHONY: data
data: extract domainmap company
	@echo "built $(DB)"

.PHONY: data-full
data-full:
	$(MAKE) data BUCKETS="$(shell seq -s' ' 0 31)" IPV6=1

# --- services ----------------------------------------------------------------

.PHONY: api
api: .venv
	.venv/bin/uvicorn app.main:app --app-dir api --reload --port 8000

.PHONY: web
web:
	cd web && npm run dev

.PHONY: test
test: .venv
	.venv/bin/pytest -q pipeline api

# --- container ---------------------------------------------------------------

.PHONY: image
image:
	docker build -f deploy/Dockerfile -t cyber-prospect .
