from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SignalMeta:
    key: str
    label: str
    category: str
    weight: float
    bit: int
    pitch: str
    talking_point: str

    @property
    def mask(self) -> int:
        return 1 << self.bit
