# 0002 — Filter shared infrastructure out of the prospect set

## Context

The first ranking by footprint was dominated by dynamic-DNS providers, device
clouds, and mass hosts — `quickconnect.to`, `dahuaddns.com`, `duckdns.org`,
`stratoserver.net`. They have huge hostname counts but they aren't companies;
they're one registrable domain shared by thousands of unrelated parties.

## Decision

Classify a domain as infrastructure and drop it from the served table when it
matches structural rules (too many /24 networks, platform-scale hostname count, a
wildcard/vhost farm, or a mass-hosting host:ip ratio) or a denylist of known
free-subdomain and DDNS registries. Keep the filtered count and examples in `meta`
and show them in the app.

## Why

Without this the product is unusable — the "best" prospects are all noise. The
structural rules generalise across the whole dataset (they don't depend on knowing
each provider), and the denylist mops up the low-footprint free-subdomain services
that slip under them.

## Trade-off

The heuristics are not perfect: a genuinely enormous, highly distributed
enterprise can trip the network-sprawl rule and get filtered. That's an acceptable
loss for a prospecting tool whose failure mode should be "occasionally omits a
mega-corp", not "top results are camera DDNS domains". The thresholds live in
`signals.yaml` and are easy to tune. Documented as a known limitation.
