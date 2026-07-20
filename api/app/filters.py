"""The prospect filter, shared by the list, facet, and export queries.

Everything the rep can narrow by lives here. clauses() builds a parameterised
WHERE (values always bound, never interpolated) and can leave one dimension out
so a facet can count the options the rep hasn't picked yet.
"""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Query

from .db import Database

SORT_COLUMNS = {
    "priority": "priority_score",
    "surface": "surface_score",
    "hosts": "hostname_count",
    "domain": "domain",
}


@dataclass
class Filters:
    q: str | None
    countries: list[str]
    signals: list[str]
    signal_mode: str
    min_score: float | None
    min_hosts: int | None
    sort: str
    order: str
    page: int
    limit: int

    def clauses(self, db: Database, exclude: set[str] = frozenset()) -> tuple[list[str], list]:
        parts: list[str] = []
        params: list = []
        if self.q and "q" not in exclude:
            parts.append("lower(domain) LIKE ?")
            params.append(f"%{self.q.lower()}%")
        if self.countries and "country" not in exclude:
            placeholders = ", ".join("?" * len(self.countries))
            parts.append(f"country IN ({placeholders})")
            params.extend(self.countries)
        if self.signals and "signal" not in exclude:
            mask = db.mask_for(self.signals)
            if mask and self.signal_mode == "all":
                parts.append("signal_mask & ? = ?")
                params.extend([mask, mask])
            elif mask:
                parts.append("signal_mask & ? <> 0")
                params.append(mask)
        if self.min_score is not None:
            parts.append("surface_score >= ?")
            params.append(self.min_score)
        if self.min_hosts is not None:
            parts.append("hostname_count >= ?")
            params.append(self.min_hosts)
        return parts, params

    def where(self, db: Database, exclude: set[str] = frozenset()) -> tuple[str, list]:
        parts, params = self.clauses(db, exclude)
        return ("WHERE " + " AND ".join(parts) if parts else ""), params

    @property
    def order_by(self) -> str:
        column = SORT_COLUMNS.get(self.sort, "priority_score")
        direction = "ASC" if self.order == "asc" else "DESC"
        # domain as the tiebreak keeps pagination stable
        return f"ORDER BY {column} {direction}, domain ASC"

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit


def filter_params(
    q: str | None = Query(None, description="domain contains"),
    country: list[str] = Query(default=[]),
    signal: list[str] = Query(default=[], description="signal keys"),
    signal_mode: str = Query("any", pattern="^(any|all)$"),
    min_score: float | None = Query(None, ge=0, le=100),
    min_hosts: int | None = Query(None, ge=0),
    sort: str = Query("priority"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
) -> Filters:
    return Filters(
        q=q,
        countries=country,
        signals=signal,
        signal_mode=signal_mode,
        min_score=min_score,
        min_hosts=min_hosts,
        sort=sort,
        order=order,
        page=page,
        limit=limit,
    )
