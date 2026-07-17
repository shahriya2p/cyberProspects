"""Map every hostname to its registrable domain (eTLD+1).

This is the one step DuckDB can't do on its own — grouping hosts into companies
needs the Public Suffix List so that autodiscover.acme.co.za and www.acme.co.za
both land on acme.co.za rather than the wrong "co.za". We resolve the distinct
hostnames with tldextract and write a hostname -> domain lookup that the build
step joins back onto the raw rows.

Only distinct hostnames are resolved (far fewer than raw rows), and the work is
fanned out across cores since it's a few million independent lookups.
"""

from __future__ import annotations

from multiprocessing import Pool
from pathlib import Path

import duckdb
import pyarrow as pa
import pyarrow.parquet as pq
import tldextract

RAW_GLOB = "pipeline/data/raw/ip_hostname.parquet/**/data_0.parquet"
PSL_DIR = Path("pipeline/data/psl")
PSL_FILE = PSL_DIR / "public_suffix_list.dat"
OUT_FILE = Path("pipeline/data/derived/domain_map.parquet")
WORKERS = 16

_extract: tldextract.TLDExtract | None = None


def build_extractor() -> tldextract.TLDExtract:
    # Pin the suffix list to the committed snapshot so builds are deterministic
    # and don't reach out to publicsuffix.org. Fall back to the copy bundled
    # with tldextract if the snapshot is somehow missing.
    urls = [PSL_FILE.resolve().as_uri()] if PSL_FILE.exists() else ()
    return tldextract.TLDExtract(
        cache_dir=str(PSL_DIR / ".cache"),
        suffix_list_urls=urls,
        fallback_to_snapshot=True,
    )


def _init_worker() -> None:
    global _extract
    _extract = build_extractor()
    _extract("warmup.example.com")  # load the suffix trie once per process


def _resolve_chunk(hosts: list[str]) -> tuple[list, list, list, list]:
    assert _extract is not None
    domains, suffixes, subs = [], [], []
    for host in hosts:
        e = _extract(host)
        if e.suffix and e.domain:
            domains.append(f"{e.domain}.{e.suffix}")
            suffixes.append(e.suffix)
            subs.append(e.subdomain)
        else:
            domains.append(None)
            suffixes.append(None)
            subs.append("")
    return hosts, domains, suffixes, subs


def chunked(items: list[str], size: int):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def main() -> None:
    con = duckdb.connect()
    con.execute("PRAGMA threads=16")
    print("collecting distinct hostnames...")
    hostnames = [
        r[0]
        for r in con.execute(
            f"SELECT DISTINCT hostname FROM read_parquet('{RAW_GLOB}') "
            "WHERE hostname IS NOT NULL"
        ).fetchall()
    ]
    print(f"resolving {len(hostnames):,} distinct hostnames across {WORKERS} workers")

    all_hosts, all_domains, all_suffixes, all_subs = [], [], [], []
    with Pool(WORKERS, initializer=_init_worker) as pool:
        for hosts, domains, suffixes, subs in pool.imap_unordered(
            _resolve_chunk, chunked(hostnames, 50_000)
        ):
            all_hosts += hosts
            all_domains += domains
            all_suffixes += suffixes
            all_subs += subs

    table = pa.table(
        {
            "hostname": pa.array(all_hosts, pa.string()),
            "registrable_domain": pa.array(all_domains, pa.string()),
            "suffix": pa.array(all_suffixes, pa.string()),
            "subdomain": pa.array(all_subs, pa.string()),
        }
    )
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    pq.write_table(table, OUT_FILE, compression="zstd")

    resolved = sum(d is not None for d in all_domains)
    print(f"wrote {OUT_FILE} ({resolved:,} resolved, {len(hostnames) - resolved:,} skipped)")


if __name__ == "__main__":
    main()
