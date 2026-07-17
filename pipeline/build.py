"""Turn the raw (ip, hostname) rows into the company table the app serves.

Everything the product shows is derived here: we roll hostnames up to their
registrable domain, read the attack-surface signals out of the subdomains,
score each company, flag the shared-infrastructure noise, and precompute the
dashboard rollups. The output is a single read-only DuckDB file.

The signal columns and the scoring arithmetic are generated from signals.yaml
so the taxonomy lives in exactly one place.
"""

from __future__ import annotations

import argparse
import datetime as dt
from pathlib import Path

import duckdb

from pipeline import signals

RAW_GLOB = "pipeline/data/raw/ip_hostname.parquet/**/data_0.parquet"
DOMAIN_MAP = "pipeline/data/derived/domain_map.parquet"
CCMAP = "pipeline/ccmap.csv"
SAMPLE_PER_DOMAIN = 20


def resolved_view(con: duckdb.DuckDBPyConnection) -> None:
    # Raw rows joined to their registrable domain, with the two derived fields
    # the aggregation needs: the /24 network (v4 only) and the ccTLD's country.
    con.execute(
        f"""
        CREATE TEMP VIEW resolved AS
        SELECT
            m.registrable_domain               AS domain,
            m.suffix                            AS suffix,
            m.subdomain                         AS subdomain,
            r.hostname                          AS hostname,
            r.ip                                AS ip,
            CASE WHEN r.ip LIKE '%.%'
                 THEN regexp_replace(r.ip, '\\.\\d+$', '.0/24')
            END                                 AS net24,
            lower(regexp_extract(m.suffix, '[^.]+$')) AS cc_label
        FROM read_parquet('{RAW_GLOB}') r
        JOIN read_parquet('{DOMAIN_MAP}') m USING (hostname)
        WHERE m.registrable_domain IS NOT NULL
        """
    )


def build_company(con: duckdb.DuckDBPyConnection, tx: signals.Taxonomy) -> dict:
    sig = tx.signals
    # bool_or per signal -> presence flags; the same flags feed the mask and the
    # weighted score, so we compute them once in the aggregate.
    flags = ",\n            ".join(
        f"bool_or(regexp_matches(subdomain, '{s.regex}')) AS sig_{s.key}" for s in sig
    )
    mask = " + ".join(f"(sig_{s.key})::int * {s.mask}" for s in sig)
    weight_sum = " + ".join(f"(sig_{s.key})::int * {s.weight}" for s in sig)
    sc = tx.scoring
    infra = tx.infra
    denylist = ", ".join(f"'{d}'" for d in sorted(infra.domains))

    con.execute(f"CREATE TEMP TABLE ccmap AS SELECT * FROM read_csv_auto('{CCMAP}')")
    con.execute(
        f"""
        CREATE TEMP TABLE agg AS
        SELECT
            domain,
            any_value(suffix)        AS tld,
            any_value(cc_label)      AS cc_label,
            count(DISTINCT hostname) AS hostname_count,
            count(DISTINCT ip)       AS ip_count,
            count(DISTINCT net24)    AS net24_count,
            {flags}
        FROM resolved
        GROUP BY domain
        """
    )

    # Every domain, scored and classified. We keep this around only long enough
    # to split prospects from infrastructure; the served table is a subset.
    con.execute(
        f"""
        CREATE TEMP TABLE company_all AS
        WITH s AS (
            SELECT
                a.domain,
                a.tld,
                upper(c.iso2)                 AS cc,
                coalesce(c.country, 'Global') AS country,
                a.hostname_count,
                a.ip_count,
                a.net24_count,
                ({mask})                      AS signal_mask,
                ({weight_sum})                AS weight_sum,
                LEAST(1.0, ln(1 + a.hostname_count) / ln(1 + {sc.size_cap})) AS size_c,
                LEAST(1.0, ln(1 + a.net24_count) / ln(1 + {sc.spread_cap}))  AS spread_c
            FROM agg a
            LEFT JOIN ccmap c ON a.cc_label = c.cc_label
        )
        SELECT
            domain, tld, cc, country,
            hostname_count, ip_count, net24_count,
            signal_mask,
            bit_count(signal_mask)::smallint AS signal_count,
            round(100 * ({sc.signal_weight} * (weight_sum / {tx.total_weight})
                       + {sc.size_weight} * size_c
                       + {sc.spread_weight} * spread_c), 1) AS surface_score,
            (domain IN ({denylist})
             OR net24_count >= {infra.max_networks}
             OR hostname_count >= {infra.max_hostnames}
             OR (hostname_count >= {infra.farm_min_hosts}
                 AND net24_count <= {infra.farm_max_networks})
             OR (hostname_count >= {infra.vhost_min_hosts}
                 AND hostname_count >= {infra.vhost_ratio} * ip_count)) AS is_infrastructure
        FROM s
        """
    )

    # The served universe: real prospects only. Priority leans on footprint so
    # "big and exposed" sorts above "exposed but tiny".
    con.execute(
        f"""
        CREATE TABLE company AS
        SELECT
            domain, tld, cc, country,
            hostname_count, ip_count, net24_count,
            signal_mask, signal_count, surface_score,
            round(surface_score * (0.6 + 0.4 *
                  LEAST(1.0, ln(1+hostname_count)/ln(1+{sc.size_cap}))), 1) AS priority_score,
            []::VARCHAR[] AS sample_hostnames,
            current_date AS snapshot_date
        FROM company_all
        WHERE NOT is_infrastructure
          AND (signal_count >= 1 OR hostname_count >= {tx.min_hostnames})
        """
    )
    con.execute("CREATE INDEX company_priority ON company(priority_score)")
    con.execute("CREATE INDEX company_domain ON company(domain)")
    con.execute("CREATE TEMP TABLE kept AS SELECT domain FROM company")

    stats = con.execute(
        "SELECT count(*), count(*) FILTER (WHERE is_infrastructure) FROM company_all"
    ).fetchone()
    examples = con.execute(
        "SELECT domain, hostname_count FROM company_all WHERE is_infrastructure "
        "ORDER BY hostname_count DESC LIMIT 12"
    ).fetchall()
    return {"total_domains": stats[0], "infrastructure": stats[1], "infra_examples": examples}


def build_signal_catalog(con: duckdb.DuckDBPyConnection, tx: signals.Taxonomy) -> None:
    con.execute(
        """CREATE TABLE signal_catalog (
            id SMALLINT, key VARCHAR, label VARCHAR, category VARCHAR,
            weight DOUBLE, bit INTEGER, pitch VARCHAR, talking_point VARCHAR)"""
    )
    con.executemany(
        "INSERT INTO signal_catalog VALUES (?,?,?,?,?,?,?,?)",
        [
            (s.bit, s.key, s.label, s.category, s.weight, s.bit, s.pitch, s.talking_point)
            for s in tx.signals
        ],
    )


def build_evidence(con: duckdb.DuckDBPyConnection, tx: signals.Taxonomy) -> None:
    # Long form: one row per (company, signal that fired) with how many hosts
    # back it up and a real example. Drives the facet counts and the dossier.
    parts = [
        f"""SELECT domain, {s.bit} AS signal_id, hostname
            FROM resolved JOIN kept USING (domain)
            WHERE regexp_matches(subdomain, '{s.regex}')"""
        for s in tx.signals
    ]
    con.execute(
        f"""
        CREATE TABLE company_signal AS
        SELECT domain, signal_id,
               count(DISTINCT hostname) AS evidence_count,
               min(hostname)            AS example_hostname
        FROM ({' UNION ALL '.join(parts)})
        GROUP BY domain, signal_id
        """
    )
    con.execute("CREATE INDEX company_signal_domain ON company_signal(domain)")

    # Which single signal best describes a host: highest-weight match wins, so
    # the dossier's host list leads with the most interesting names.
    ordered = sorted(tx.signals, key=lambda s: s.weight, reverse=True)
    case = " ".join(
        f"WHEN regexp_matches(subdomain, '{s.regex}') THEN {s.bit}" for s in ordered
    )
    con.execute(
        f"""
        CREATE TABLE hostname_sample AS
        WITH per_host AS (
            SELECT domain, hostname,
                   any_value(ip)    AS ip,
                   any_value(net24) AS net24,
                   CASE {case} ELSE -1 END AS signal_id
            FROM resolved JOIN kept USING (domain)
            GROUP BY domain, hostname, subdomain
        ),
        ranked AS (
            SELECT *, (signal_id >= 0) AS is_signal,
                   row_number() OVER (
                       PARTITION BY domain
                       ORDER BY (signal_id >= 0) DESC, hostname
                   ) AS rn
            FROM per_host
        )
        SELECT domain, hostname, ip, net24, signal_id, is_signal
        FROM ranked WHERE rn <= {SAMPLE_PER_DOMAIN}
        """
    )
    con.execute("CREATE INDEX hostname_sample_domain ON hostname_sample(domain)")

    # A few example hosts on the company row itself so the table preview doesn't
    # need a join. Signal-bearing hosts first.
    con.execute(
        """
        UPDATE company SET sample_hostnames = s.hosts
        FROM (
            SELECT domain, list(hostname ORDER BY is_signal DESC, hostname)[1:6] AS hosts
            FROM hostname_sample GROUP BY domain
        ) s
        WHERE company.domain = s.domain
        """
    )


def build_rollups(con: duckdb.DuckDBPyConnection) -> None:
    # Precomputed so the dashboard is a handful of tiny reads. company already
    # holds prospects only, so no infrastructure filtering is needed here.
    con.execute(
        """CREATE TABLE rollup_country AS
           SELECT cc, country, count(*) AS companies, round(avg(surface_score), 1) AS avg_score
           FROM company WHERE country <> 'Global'
           GROUP BY cc, country ORDER BY companies DESC"""
    )
    con.execute(
        """CREATE TABLE rollup_signal AS
           SELECT sc.id AS signal_id, sc.label, sc.category,
                  count(*) FILTER (WHERE c.signal_mask & (1 << sc.bit) <> 0) AS companies
           FROM signal_catalog sc
           CROSS JOIN company c
           GROUP BY sc.id, sc.label, sc.category ORDER BY companies DESC"""
    )
    con.execute(
        """CREATE TABLE rollup_score_hist AS
           SELECT (floor(surface_score / 10) * 10)::int AS lo,
                  (floor(surface_score / 10) * 10 + 10)::int AS hi,
                  count(*) AS count
           FROM company
           GROUP BY 1, 2 ORDER BY 1"""
    )


def write_meta(
    con: duckdb.DuckDBPyConnection, buckets: list[str], stats: dict, tx: signals.Taxonomy
) -> None:
    prospects = con.execute("SELECT count(*) FROM company").fetchone()[0]
    psl_ver = "committed snapshot"
    psl_path = Path("pipeline/data/psl/public_suffix_list.dat")
    if psl_path.exists():
        for line in psl_path.read_text().splitlines()[:20]:
            if "VERSION" in line or "Date" in line:
                psl_ver = line.strip("/ ").strip()
                break
    sc = tx.scoring
    con.execute("CREATE TABLE meta (key VARCHAR, value VARCHAR)")
    con.executemany(
        "INSERT INTO meta VALUES (?, ?)",
        [
            ("snapshot_date", dt.date.today().isoformat()),
            ("buckets", ", ".join(buckets)),
            ("domains_seen", str(stats["total_domains"])),
            ("prospects", str(prospects)),
            ("infrastructure_filtered", str(stats["infrastructure"])),
            ("infra_examples", ", ".join(d for d, _ in stats["infra_examples"])),
            ("psl", psl_ver),
            # scoring knobs so the API can reconstruct a company's score breakdown
            ("score_signal_weight", str(sc.signal_weight)),
            ("score_size_weight", str(sc.size_weight)),
            ("score_spread_weight", str(sc.spread_weight)),
            ("score_size_cap", str(sc.size_cap)),
            ("score_spread_cap", str(sc.spread_cap)),
            ("total_signal_weight", str(tx.total_weight)),
        ],
    )


def buckets_from_raw() -> list[str]:
    root = Path("pipeline/data/raw")
    found = sorted(
        p.parent.name.split("=")[-1] for p in root.glob("**/data_0.parquet")
    )
    return found


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--db", default="pipeline/data/derived/app.duckdb")
    args = ap.parse_args()

    db_path = Path(args.db)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    if db_path.exists():
        db_path.unlink()

    tx = signals.load()
    con = duckdb.connect(str(db_path))
    con.execute("PRAGMA threads=16")

    print("joining raw rows to registrable domains...")
    resolved_view(con)
    print("aggregating companies + scoring...")
    stats = build_company(con, tx)
    build_signal_catalog(con, tx)
    print("building signal evidence + host samples...")
    build_evidence(con, tx)
    print("precomputing dashboard rollups...")
    build_rollups(con)
    write_meta(con, buckets_from_raw(), stats, tx)

    kept = con.execute("SELECT count(*) FROM company").fetchone()[0]
    con.close()
    print(
        f"built {db_path}: {kept:,} prospects kept, "
        f"{stats['infrastructure']:,} infrastructure filtered, "
        f"{stats['total_domains']:,} domains seen"
    )


if __name__ == "__main__":
    main()
