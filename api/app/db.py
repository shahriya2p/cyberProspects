"""Read-only access to the DuckDB file plus the signal catalog it carries.

DuckDB is opened once, read-only, and each request runs on its own cursor so
concurrent requests don't step on each other. The signal catalog is small and
never changes at runtime, so we read it once at startup and hand it around.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import cached_property

import duckdb

from . import config

from .models.signal import SignalMeta

class Database:
    def __init__(self, path: str | None = None):
        self.path = str(path or config.DB_PATH)
        self._con = duckdb.connect(self.path, read_only=True)

    def rows(self, sql: str, params: list | None = None) -> list[tuple]:
        return self._con.cursor().execute(sql, params or []).fetchall()

    def row(self, sql: str, params: list | None = None) -> tuple | None:
        return self._con.cursor().execute(sql, params or []).fetchone()

    def columns(self, sql: str, params: list | None = None) -> list[str]:
        cur = self._con.cursor().execute(sql, params or [])
        return [d[0] for d in cur.description]

    def stream(self, sql: str, params: list | None = None, size: int = 2000):
        cur = self._con.cursor().execute(sql, params or [])
        while batch := cur.fetchmany(size):
            yield from batch

    @cached_property
    def signals(self) -> list[SignalMeta]:
        rows = self.rows(
            "SELECT key, label, category, weight, bit, pitch, talking_point "
            "FROM signal_catalog ORDER BY bit"
        )
        return [SignalMeta(*r) for r in rows]

    @cached_property
    def signal_by_key(self) -> dict[str, SignalMeta]:
        return {s.key: s for s in self.signals}

    def mask_for(self, keys: list[str]) -> int:
        mask = 0
        for k in keys:
            s = self.signal_by_key.get(k)
            if s:
                mask |= s.mask
        return mask

    def keys_in_mask(self, mask: int) -> list[str]:
        # highest-weight signals first, so a company's badges lead with the
        # most interesting surface
        ordered = sorted(self.signals, key=lambda s: s.weight, reverse=True)
        return [s.key for s in ordered if mask & s.mask]

    def meta(self) -> dict[str, str]:
        return {k: v for k, v in self.rows("SELECT key, value FROM meta")}


_db: Database | None = None


def get_db() -> Database:
    global _db
    if _db is None:
        _db = Database()
    return _db
