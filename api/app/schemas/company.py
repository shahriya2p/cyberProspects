from __future__ import annotations

from pydantic import BaseModel

from .facets import Facets


class CompanySummary(BaseModel):
    domain: str
    country: str
    cc: str | None
    hostname_count: int
    ip_count: int
    net24_count: int
    signal_count: int
    signals: list[str]  # signal keys present
    surface_score: float
    priority_score: float
    sample_hostnames: list[str]


class SignalHit(BaseModel):
    key: str
    label: str
    category: str
    pitch: str
    evidence_count: int
    example_hostname: str
    talking_point: str


class HostSample(BaseModel):
    hostname: str
    ip: str | None
    net24: str | None
    signal: str | None  # signal key this host maps to, if any


class ScoreFactor(BaseModel):
    label: str
    detail: str
    contribution: float  # points out of 100


class CompanyDetail(CompanySummary):
    tld: str
    signal_hits: list[SignalHit]
    hosts: list[HostSample]
    score_breakdown: list[ScoreFactor]
    summary: str  # the "why they're a fit" line
    talking_points: list[str]


class CompanyList(BaseModel):
    items: list[CompanySummary]
    total: int
    page: int
    limit: int
    facets: Facets
