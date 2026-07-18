from __future__ import annotations

from fastapi import APIRouter, Depends

from ..db import Database, get_db
from ..schemas.stats import Stats
from ..services.stats_service import get_stats_service

router = APIRouter(prefix="/api", tags=["stats"])


@router.get("/stats", response_model=Stats)
def stats(db: Database = Depends(get_db)):
    return get_stats_service(db)
