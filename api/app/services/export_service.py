from __future__ import annotations

import csv
import io
from collections.abc import Generator

from .. import config
from ..db import Database
from ..filters import Filters

COLUMNS = [
    "domain", "country", "hostname_count", "ip_count", "net24_count",
    "signal_count", "signals", "surface_score", "priority_score",
]


def generate_export_csv_service(f: Filters, db: Database) -> Generator[str, None, None]:
    where, params = f.where(db)
    sql = (
        "SELECT domain, country, hostname_count, ip_count, net24_count, "
        "signal_count, signal_mask, surface_score, priority_score "
        f"FROM company {where} {f.order_by} LIMIT {config.EXPORT_LIMIT}"
    )

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(COLUMNS)
    for row in db.stream(sql, params):
        (domain, country, hosts, ips, nets, sig_count, mask, surface, priority) = row
        writer.writerow(
            [domain, country, hosts, ips, nets, sig_count,
             " ".join(db.keys_in_mask(mask)), surface, priority]
        )
        buffer.seek(0)
        yield buffer.read()
        buffer.seek(0)
        buffer.truncate(0)
