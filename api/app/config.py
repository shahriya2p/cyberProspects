import os
from pathlib import Path

# The served database. Default points at the pipeline output for local dev; the
# container overrides it to the baked-in copy.
DB_PATH = Path(os.environ.get("CYBER_PROSPECT_DB", "api/app_sample.duckdb"))

# Where the built web bundle lives, if we're serving it from the same process.
WEB_DIST = Path(os.environ.get("CYBER_PROSPECT_WEB", "web/dist"))

# Cap on a single CSV export so a wide filter can't stream the whole database.
EXPORT_LIMIT = int(os.environ.get("CYBER_PROSPECT_EXPORT_LIMIT", "25000"))
