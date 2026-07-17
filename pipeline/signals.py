"""Loads the signal taxonomy and turns it into the bits and regexes the rest of
the pipeline needs. Both the ETL and the API import this so the definition of a
signal never drifts between them."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import yaml

SIGNALS_FILE = Path(__file__).with_name("signals.yaml")


@dataclass(frozen=True)
class Signal:
    key: str
    bit: int
    label: str
    category: str
    weight: float
    tokens: tuple[str, ...]
    pitch: str
    talking_point: str

    @property
    def mask(self) -> int:
        return 1 << self.bit

    @property
    def regex(self) -> str:
        # Match each token as a whole hyphen/dot-delimited component, so `dev`
        # catches dev.acme.com and api-dev.acme.com but leaves "development"
        # alone. Tokens may already carry regex (mail\d*), so we don't escape.
        body = "|".join(self.tokens)
        return rf"(^|[.-])({body})([.-]|$)"


@dataclass(frozen=True)
class Scoring:
    signal_weight: float
    size_weight: float
    spread_weight: float
    size_cap: int
    spread_cap: int


@dataclass(frozen=True)
class InfraRules:
    domains: frozenset[str]
    max_networks: int
    max_hostnames: int
    farm_min_hosts: int
    farm_max_networks: int
    vhost_min_hosts: int
    vhost_ratio: int


@dataclass(frozen=True)
class Taxonomy:
    signals: tuple[Signal, ...]
    scoring: Scoring
    infra: InfraRules
    min_hostnames: int

    def by_key(self, key: str) -> Signal:
        return next(s for s in self.signals if s.key == key)

    @property
    def total_weight(self) -> float:
        return sum(s.weight for s in self.signals)


@lru_cache(maxsize=1)
def load(path: Path = SIGNALS_FILE) -> Taxonomy:
    raw = yaml.safe_load(path.read_text())
    signals = tuple(
        Signal(
            key=s["key"],
            bit=s["bit"],
            label=s["label"],
            category=s["category"],
            weight=float(s["weight"]),
            tokens=tuple(s["tokens"]),
            pitch=s["pitch"],
            talking_point=" ".join(s["talking_point"].split()),
        )
        for s in raw["signals"]
    )
    bits = [s.bit for s in signals]
    if len(set(bits)) != len(bits):
        raise ValueError("duplicate signal bits in signals.yaml")

    sc = raw["scoring"]
    scoring = Scoring(
        signal_weight=sc["signal_weight"],
        size_weight=sc["size_weight"],
        spread_weight=sc["spread_weight"],
        size_cap=sc["size_cap"],
        spread_cap=sc["spread_cap"],
    )
    inf = raw["infrastructure"]
    infra = InfraRules(
        domains=frozenset(inf["domains"]),
        max_networks=inf["max_networks"],
        max_hostnames=inf["max_hostnames"],
        farm_min_hosts=inf["farm_min_hosts"],
        farm_max_networks=inf["farm_max_networks"],
        vhost_min_hosts=inf["vhost_min_hosts"],
        vhost_ratio=inf["vhost_ratio"],
    )
    return Taxonomy(
        signals=signals,
        scoring=scoring,
        infra=infra,
        min_hostnames=raw["serving"]["min_hostnames"],
    )
