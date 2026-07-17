"""Pull individual bucket shards out of the source archive.

The archive is a ~26GB bz2 of a tar of a partitioned parquet dataset. We never
want the whole thing on disk, so we stream it through tar and lean on bsdtar's
--fast-read, which stops the moment it has seen every member we asked for. The
buckets are a hash partition of the IP space, so the ones that happen to sit at
the front of the archive are just as representative as any others — picking
those keeps extraction to a fraction of the file.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

RAW_DIR = Path("pipeline/data/raw")
DATASET = "ip_hostname.parquet"


def member(ip_type: str, bucket: int) -> str:
    return f"{DATASET}/ip_type={ip_type}/ip_bucket={bucket}/data_0.parquet"


def already_have(m: str) -> bool:
    return (RAW_DIR / m).exists()


def extract(source: Path, buckets: list[int], ipv6: bool) -> list[str]:
    ip_types = ["v4", "v6"] if ipv6 else ["v4"]
    wanted = [member(t, b) for t in ip_types for b in buckets]
    missing = [m for m in wanted if not already_have(m)]
    if not missing:
        print("all requested buckets already extracted")
        return wanted

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    print(f"streaming {source} for {len(missing)} shard(s)...")

    # bzcat does the decompression (it's the slow part); tar --fast-read bails
    # out as soon as the last requested member has been written.
    bz = subprocess.Popen(["bzcat", str(source)], stdout=subprocess.PIPE)
    tar = subprocess.Popen(
        ["tar", "-x", "--fast-read", "-C", str(RAW_DIR), *missing],
        stdin=bz.stdout,
    )
    bz.stdout.close()  # let bzcat get SIGPIPE when tar stops early
    tar.wait()
    bz.wait()
    if tar.returncode not in (0, None):
        sys.exit(f"tar exited with {tar.returncode}")

    for m in missing:
        if not already_have(m):
            sys.exit(f"expected shard was not in the archive: {m}")
        size_mb = (RAW_DIR / m).stat().st_size / 1e6
        print(f"  {m}  ({size_mb:.0f} MB)")
    return wanted


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--source", type=Path, required=True)
    ap.add_argument("--buckets", type=int, nargs="+", required=True)
    ap.add_argument("--ipv6", action="store_true", help="also pull the v6 shards")
    args = ap.parse_args()

    if not args.source.exists():
        sys.exit(f"source archive not found: {args.source}")
    extract(args.source, args.buckets, args.ipv6)


if __name__ == "__main__":
    main()
