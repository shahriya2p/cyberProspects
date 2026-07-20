# Data dictionary

The served database `app.duckdb`, one row per registrable domain plus supporting
tables. Everything here is precomputed by `pipeline/build.py`.

## `company` — the prospect table (one row per company)

| Column | Type | Notes |
|---|---|---|
| `domain` | VARCHAR | registrable domain (eTLD+1), e.g. `webafrica.co.za` |
| `tld` | VARCHAR | public suffix, e.g. `co.za` |
| `cc` | VARCHAR | ISO-2 country, null for generic TLDs |
| `country` | VARCHAR | display country, `Global` for generic TLDs |
| `hostname_count` | INTEGER | distinct hostnames seen under the domain |
| `ip_count` | INTEGER | distinct IPs those hostnames resolve to |
| `net24_count` | INTEGER | distinct /24 networks (v4) |
| `signal_mask` | INTEGER | bitmask of exposed signal categories |
| `signal_count` | SMALLINT | popcount of `signal_mask` |
| `surface_score` | DOUBLE | 0–100 exposure score (see scoring.md) |
| `priority_score` | DOUBLE | ranking score, footprint-weighted |
| `sample_hostnames` | VARCHAR[] | a few signal-bearing hosts for the list preview |
| `snapshot_date` | DATE | build date |

Indexed on `priority_score` and `domain`. Infrastructure/DDNS domains are **not**
in this table — they're filtered during the build.

## `signal_catalog` — the taxonomy (7 rows)

| Column | Type | Notes |
|---|---|---|
| `id` / `bit` | SMALLINT | bit position in `signal_mask` |
| `key` | VARCHAR | stable key, e.g. `remote_access` |
| `label` | VARCHAR | display name |
| `category` | VARCHAR | grouping (Access, Engineering, …) |
| `weight` | DOUBLE | risk weight used in scoring |
| `pitch` | VARCHAR | the product angle |
| `talking_point` | VARCHAR | the rep's opening line for this signal |

## `company_signal` — evidence (one row per company × fired signal)

| Column | Type | Notes |
|---|---|---|
| `domain` | VARCHAR | |
| `signal_id` | SMALLINT | joins `signal_catalog.id` |
| `evidence_count` | INTEGER | how many hostnames matched this signal |
| `example_hostname` | VARCHAR | a real matching host, for the dossier |

## `hostname_sample` — drill-down (≤ 20 rows per company)

| Column | Type | Notes |
|---|---|---|
| `domain` | VARCHAR | |
| `hostname` | VARCHAR | |
| `ip` | VARCHAR | |
| `net24` | VARCHAR | e.g. `102.222.124.0/24` |
| `signal_id` | SMALLINT | best-matching signal, or −1 |
| `is_signal` | BOOLEAN | whether the host matched any signal |

Capped per company at build time and ordered signal-bearing-first, so the raw
dataset never has to be queried at request time.

## `rollup_country`, `rollup_signal`, `rollup_score_hist`

Precomputed dashboard aggregates: companies per country (with average score),
companies per signal, and a 10-wide surface-score histogram.

## `meta` — key/value provenance

`snapshot_date`, `buckets`, `domains_seen`, `prospects`,
`infrastructure_filtered`, `infra_examples`, `psl` version, and the scoring
constants the API uses to reconstruct score breakdowns.
