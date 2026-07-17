from __future__ import annotations

from pydantic import BaseModel

from .company import CompanySummary


class CountryStat(BaseModel):
    cc: str | None
    country: str
    companies: int
    avg_score: float


class SignalStat(BaseModel):
    key: str
    label: str
    category: str
    companies: int


class ScoreBin(BaseModel):
    lo: int
    hi: int
    count: int


class Stats(BaseModel):
    prospects: int
    domains_seen: int
    infrastructure_filtered: int
    countries: int
    by_country: list[CountryStat]
    by_signal: list[SignalStat]
    score_hist: list[ScoreBin]
    top_prospects: list[CompanySummary]
    meta: dict[str, str]
