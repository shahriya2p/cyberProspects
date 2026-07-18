from __future__ import annotations

from fastapi import APIRouter, Depends

from ..db import Database, get_db
from ..schemas.signal import SignalInfo
from ..services.signal_service import get_meta_service, get_signals_service

router = APIRouter(tags=["meta"])


@router.get("/api/signals", response_model=list[SignalInfo])
def signals(db: Database = Depends(get_db)):
    return get_signals_service(db)


@router.get("/api/meta")
def meta(db: Database = Depends(get_db)) -> dict[str, str]:
    return get_meta_service(db)
