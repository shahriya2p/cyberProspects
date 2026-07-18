import os
from pathlib import Path

import pytest

# Point the app at the built database before it's imported. Skip the whole
# module cleanly if the pipeline hasn't run yet.
DB = Path(__file__).resolve().parents[2] / "pipeline/data/derived/app.duckdb"
if not DB.exists():
    pytest.skip("build the database first: `make data`", allow_module_level=True)
os.environ["CYBER_PROSPECT_DB"] = str(DB)

from app.db import get_db  # noqa: E402
from app.filters import Filters  # noqa: E402
from app.main import app  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

client = TestClient(app)


def base_filters(**kw) -> Filters:
    defaults = dict(
        q=None, countries=[], signals=[], signal_mode="any",
        min_score=None, min_hosts=None, sort="priority", order="desc", page=1, limit=25,
    )
    defaults.update(kw)
    return Filters(**defaults)


def test_signal_filter_compiles_to_bitmask():
    db = get_db()
    all_clause, all_params = base_filters(signals=["email"], signal_mode="all").clauses(db)
    any_clause, any_params = base_filters(signals=["email"], signal_mode="any").clauses(db)
    mask = db.mask_for(["email"])
    assert all_clause == ["signal_mask & ? = ?"]
    assert all_params == [mask, mask]
    assert any_clause == ["signal_mask & ? <> 0"]
    assert any_params == [mask]


def test_exclude_drops_that_dimension():
    db = get_db()
    f = base_filters(countries=["Germany"], signals=["email"])
    clauses, _ = f.clauses(db, exclude={"country"})
    assert not any("country" in c.lower() for c in clauses)


def test_list_returns_facets_and_items():
    r = client.get("/api/companies", params={"limit": 5})
    assert r.status_code == 200
    body = r.json()
    assert len(body["items"]) == 5
    assert body["total"] > 0
    assert {b["value"] for b in body["facets"]["signal"]}  # signal facet present


def test_match_all_is_subset_of_match_any():
    two = {"signal": ["remote_access", "devops"]}
    any_total = client.get("/api/companies", params={**two, "signal_mode": "any"}).json()["total"]
    all_total = client.get("/api/companies", params={**two, "signal_mode": "all"}).json()["total"]
    assert all_total <= any_total


def test_detail_has_talking_points():
    domain = client.get("/api/companies", params={"limit": 1}).json()["items"][0]["domain"]
    d = client.get(f"/api/companies/{domain}").json()
    assert d["domain"] == domain
    assert d["summary"]
    assert len(d["talking_points"]) == d["signal_count"]
    # the score breakdown reconstructs the stored surface score
    assert abs(sum(f["contribution"] for f in d["score_breakdown"]) - d["surface_score"]) < 1.0


def test_unknown_company_is_404():
    assert client.get("/api/companies/nope.invalid").status_code == 404


def test_export_streams_csv():
    r = client.get("/api/export.csv", params={"country": "South Africa", "limit": 10})
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/csv")
    assert r.text.splitlines()[0].startswith("domain,country")
