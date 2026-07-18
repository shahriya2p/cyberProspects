from __future__ import annotations

from fastapi import APIRouter, Depends

from ..db import Database, get_db
from ..filters import Filters, filter_params
from ..schemas.company import CompanyDetail, CompanyList
from ..services.company_service import get_company_detail_service, list_companies_service

router = APIRouter(prefix="/api/companies", tags=["companies"])


@router.get("", response_model=CompanyList)
def list_companies(f: Filters = Depends(filter_params), db: Database = Depends(get_db)):
    return list_companies_service(f, db)


@router.get("/{domain}", response_model=CompanyDetail)
def company_detail(domain: str, db: Database = Depends(get_db)):
    return get_company_detail_service(domain, db)
