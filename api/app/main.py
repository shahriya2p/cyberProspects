from __future__ import annotations

import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import config
from .db import Database, get_db
from .routes import company, export, signal, stats

app = FastAPI(
    title="Cyber Prospect",
    description="Attack-surface prospecting on a global DNS dataset.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CYBER_PROSPECT_CORS", "*").split(","),
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(company.router)
app.include_router(stats.router)
app.include_router(export.router)
app.include_router(signal.router)


@app.get("/", tags=["meta"])
def root():
    return {"message": "Welcome to the Cyber Prospect API. The backend service is running successfully."}


@app.get("/healthz", tags=["meta"])
def healthz(db: Database = Depends(get_db)) -> dict[str, str]:
    return {"status": "ok", "database": db.path}


# Serve the built React bundle from the same origin when it's present (i.e. in
# the container). In dev the frontend runs on its own Vite server and talks to
# this API over CORS, so this block simply does nothing.
if config.WEB_DIST.exists():
    assets = config.WEB_DIST / "assets"
    if assets.exists():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        candidate = config.WEB_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(config.WEB_DIST / "index.html")
