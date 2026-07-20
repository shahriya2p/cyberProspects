# 0001 — Resolve companies with the Public Suffix List, not string splitting

## Context

Companies are formed by grouping hostnames on their registrable domain (eTLD+1).
DuckDB has no notion of public suffixes, so the tempting shortcut is "last two
labels of the hostname".

## Decision

Resolve every distinct hostname through `tldextract` against a committed Public
Suffix List snapshot, in a dedicated pipeline stage that writes a
`hostname → domain` map. DuckDB joins that map back onto the raw rows.

## Why

The shortcut is wrong for every multi-part ccTLD, and the dataset is full of them:
`acme.co.za`, `acme.com.ng`, `acme.co.ke`. "Last two labels" collapses all of
`co.za` into one bogus company. The PSL gets it right by construction.

Resolving *distinct* hostnames (tens of millions) rather than *raw rows* (hundreds
of millions), fanned across cores, keeps this to seconds. Pinning the suffix list
to a committed file makes the build deterministic and offline.

## Trade-off

One extra pipeline stage and a ~16k-line data file in the repo. Worth it — correct
company grouping is load-bearing for everything downstream.
