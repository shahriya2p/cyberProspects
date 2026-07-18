from __future__ import annotations

from fastapi import HTTPException

from .. import pitch
from ..db import Database
from ..filters import Filters
from ..schemas.company import (
    CompanyDetail,
    CompanyList,
    CompanySummary,
    HostSample,
    ScoreFactor,
    SignalHit,
)
from ..schemas.facets import FacetBucket, Facets

SUMMARY_COLS = (
    "domain, country, cc, hostname_count, ip_count, net24_count, "
    "signal_mask, signal_count, surface_score, priority_score, sample_hostnames"
)


def to_summary(db: Database, row: tuple) -> CompanySummary:
    (domain, country, cc, hosts, ips, nets, mask, sig_count,
     surface, priority, sample) = row
    return CompanySummary(
        domain=domain,
        country=country,
        cc=cc,
        hostname_count=hosts,
        ip_count=ips,
        net24_count=nets,
        signal_count=sig_count,
        signals=db.keys_in_mask(mask),
        surface_score=surface,
        priority_score=priority,
        sample_hostnames=list(sample or []),
    )


def list_companies_service(f: Filters, db: Database) -> CompanyList:
    where, params = f.where(db)
    rows = db.rows(
        f"SELECT {SUMMARY_COLS} FROM company {where} {f.order_by} LIMIT ? OFFSET ?",
        [*params, f.limit, f.offset],
    )
    total = db.row(f"SELECT count(*) FROM company {where}", params)[0]
    return CompanyList(
        items=[to_summary(db, r) for r in rows],
        total=total,
        page=f.page,
        limit=f.limit,
        facets=build_facets(db, f),
    )


def build_facets(db: Database, f: Filters) -> Facets:
    # Each facet counts over the filter minus its own dimension, so the rep can
    # see what else they could pick rather than just what they already picked.
    cw, cp = f.where(db, exclude={"country"})
    country = [
        FacetBucket(value=country, label=country, count=n)
        for country, n in db.rows(
            f"SELECT country, count(*) FROM company {cw} GROUP BY country "
            "ORDER BY count(*) DESC LIMIT 40",
            cp,
        )
    ]

    sw, sp = f.where(db, exclude={"signal"})
    selects = ", ".join(
        f"count(*) FILTER (WHERE signal_mask & {s.mask} <> 0)" for s in db.signals
    )
    counts = db.row(f"SELECT {selects} FROM company {sw}", sp) or ()
    signal = [
        FacetBucket(value=s.key, label=s.label, count=int(n))
        for s, n in zip(db.signals, counts, strict=False)
    ]
    signal.sort(key=lambda b: b.count, reverse=True)
    return Facets(country=country, signal=signal)


def get_company_detail_service(domain: str, db: Database) -> CompanyDetail:
    row = db.row(f"SELECT {SUMMARY_COLS}, tld FROM company WHERE domain = ?", [domain])
    if row is None:
        raise HTTPException(status_code=404, detail="company not found")
    summary = to_summary(db, row[:-1])
    tld = row[-1]

    hits = [
        SignalHit(
            key=key,
            label=label,
            category=category,
            pitch=pitch_text,
            evidence_count=evidence,
            example_hostname=example,
            talking_point=talking,
        )
        for (key, label, category, pitch_text, evidence, example, talking) in db.rows(
            """SELECT sc.key, sc.label, sc.category, sc.pitch,
                      cs.evidence_count, cs.example_hostname, sc.talking_point
               FROM company_signal cs JOIN signal_catalog sc ON cs.signal_id = sc.id
               WHERE cs.domain = ? ORDER BY sc.weight DESC""",
            [domain],
        )
    ]

    id_to_key = {s.bit: s.key for s in db.signals}
    hosts = [
        HostSample(
            hostname=h, ip=ip, net24=net,
            signal=id_to_key.get(sid) if sid is not None and sid >= 0 else None,
        )
        for (h, ip, net, sid) in db.rows(
            """SELECT hostname, ip, net24, signal_id FROM hostname_sample
               WHERE domain = ? ORDER BY is_signal DESC, hostname LIMIT 40""",
            [domain],
        )
    ]

    mask = row[6]
    breakdown = pitch.score_breakdown(db, mask, summary.hostname_count, summary.net24_count)
    return CompanyDetail(
        **summary.model_dump(),
        tld=tld,
        signal_hits=hits,
        hosts=hosts,
        score_breakdown=breakdown,
        summary=pitch.summary(
            domain, summary.country, summary.hostname_count, summary.net24_count, hits
        ),
        talking_points=pitch.talking_points(hits),
    )
