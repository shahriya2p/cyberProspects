from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from ..db import Database, get_db
from ..filters import Filters, filter_params
from ..services.export_service import generate_export_csv_service

router = APIRouter(prefix="/api", tags=["export"])


@router.get("/export.csv")
def export_csv(f: Filters = Depends(filter_params), db: Database = Depends(get_db)):
    headers = {"Content-Disposition": "attachment; filename=cyber-prospect-prospects.csv"}
    return StreamingResponse(
        generate_export_csv_service(f, db), media_type="text/csv", headers=headers
    )
