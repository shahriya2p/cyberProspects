# Planning — what we're building and why

## The brief, restated

A cybersecurity software company's sales team needs to find and target businesses
that would buy their product. We have one asset to build on: a global IP↔hostname
(passive DNS) dataset. The job is to turn that into something a rep actually
prospects with.

## The insight

Sales-intelligence tools (ZoomInfo, Apollo, Clay) sell *firmographics* — headcount,
revenue, industry. This dataset has none of that. What it does have, uniquely, is
every company's **internet-facing footprint**. For a security vendor that's better
than firmographics, because their buying trigger isn't "how big are you" — it's
"what are you exposing." An external attack-surface tool, an email-security vendor,
a ransomware-prevention play: all of them qualify accounts on observable exposure.

So the product isn't a generic contact database. It's an **attack-surface
prospecting** tool: filter the internet down to companies whose exposed surface
matches what the vendor sells, and hand the rep the evidence and the opening line.

## Who uses it

An SDR or AE at a security vendor. Their loop:

1. **Segment** — "South African companies with an exposed VPN and 10+ hosts."
2. **Prioritise** — sort by how broad and risky the surface is.
3. **Understand** — open a company and see *what* is exposed and *why it matters*.
4. **Act** — export the list to the CRM, or send a teammate the segment link.

## How the dataset powers it

Every hostname carries a subdomain, and subdomains are self-labelling:
`vpn`, `cpanel`, `gitlab`, `staging`, `autodiscover`. Group hostnames into
companies (registrable domain), read those labels as signals, and you can answer
real prospecting questions:

- *Territory plans* — filter by country (from the ccTLD) for patch-based reps.
- *Product-led segments* — "everyone exposing a git server" for a secrets vendor;
  "everyone on cPanel" for a managed-security play.
- *Account qualification* — a per-company dossier with the exposed surface, the
  footprint, and a talking point grounded in a real hostname.
- *Lead lists* — one-click CSV of the current segment.

## Scope for a one-week prototype

In:

- The pipeline (raw → scored companies), the API, the three-view app, CSV export,
  shareable segments, and the infrastructure-noise filter that makes the ranking
  trustworthy.

Deliberately out (noted as next steps, not attempted):

- Real firmographic/contact enrichment (the data doesn't carry it; a pluggable
  hook is the honest way to add it later).
- Change-over-time / re-scan alerting — this is a single snapshot.
- Auth, multi-user saved lists, CRM write-back.

## Honest limitations

- Passive DNS is a **snapshot** and can carry stale records.
- Signals show *exposure*, not confirmed vulnerabilities — an exposed cPanel isn't
  necessarily unpatched. They're conversation starters, not findings.
- Footprint is a **proxy for size**, not real firmographics.
- Company grouping is eTLD+1, so subsidiaries on separate domains aren't merged,
  and the infrastructure filter will occasionally catch a genuinely huge
  distributed enterprise.

These are surfaced in the app's "About the data" panel so a rep is never misled.
