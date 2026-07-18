from __future__ import annotations

from ..db import Database
from ..schemas.signal import SignalInfo


def get_signals_service(db: Database) -> list[SignalInfo]:
    return [
        SignalInfo(
            key=s.key, label=s.label, category=s.category,
            weight=s.weight, pitch=s.pitch, talking_point=s.talking_point,
        )
        for s in db.signals
    ]


def get_meta_service(db: Database) -> dict[str, str]:
    return db.meta()
