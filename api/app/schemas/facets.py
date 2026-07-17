from __future__ import annotations

from pydantic import BaseModel


class FacetBucket(BaseModel):
    value: str
    label: str
    count: int


class Facets(BaseModel):
    country: list[FacetBucket]
    signal: list[FacetBucket]
