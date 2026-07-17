from __future__ import annotations

from pydantic import BaseModel


class SignalInfo(BaseModel):
    key: str
    label: str
    category: str
    weight: float
    pitch: str
    talking_point: str
