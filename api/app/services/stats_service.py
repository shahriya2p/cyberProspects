from __future__ import annotations

from ..db import Database
from ..schemas.stats import CountryStat, ScoreBin, SignalStat, Stats
from .company_service import SUMMARY_COLS, to_summary


def get_stats_service(db: Database) -> Stats:
    meta = db.meta()
    by_country = [
        CountryStat(cc=cc, country=country, companies=n, avg_score=avg)
        for cc, country, n, avg in db.rows(
            "SELECT cc, country, companies, avg_score FROM rollup_country LIMIT 25"
        )
    ]
    key_by_id = {s.bit: s.key for s in db.signals}
    by_signal = [
        SignalStat(key=key_by_id.get(sid, str(sid)), label=label, category=cat, companies=n)
        for sid, label, cat, n in db.rows(
            "SELECT signal_id, label, category, companies "
            "FROM rollup_signal ORDER BY companies DESC"
        )
    ]
    score_hist = [
        ScoreBin(lo=int(lo), hi=int(hi), count=n)
        for lo, hi, n in db.rows("SELECT lo, hi, count FROM rollup_score_hist ORDER BY lo")
    ]
    top = [
        to_summary(db, r)
        for r in db.rows(
            f"SELECT {SUMMARY_COLS} FROM company ORDER BY priority_score DESC LIMIT 8"
        )
    ]
    countries = db.row("SELECT count(*) FROM rollup_country")[0]
    return Stats(
        prospects=int(meta.get("prospects", 0)),
        domains_seen=int(meta.get("domains_seen", 0)),
        infrastructure_filtered=int(meta.get("infrastructure_filtered", 0)),
        countries=countries,
        by_country=by_country,
        by_signal=by_signal,
        score_hist=score_hist,
        top_prospects=top,
        meta=meta,
    )
