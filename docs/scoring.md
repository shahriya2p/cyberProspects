# Signals and scoring

Everything a rep sees is derived from one idea: **a company's internet-facing
attack surface is written into its hostnames.** `webmail.acme.com` says they run
mail; `vpn.acme.com` says they have a remote-access edge; `gitlab.acme.com` says
their engineering surface is public. Cyber Prospect reads those signals, weights them by
how much a security buyer cares, and adds a footprint term.

The taxonomy and every weight live in `pipeline/signals.yaml` — one file, read by
both the pipeline and (via the database) the API.

## The signals

| Signal | Example labels | Weight | Sales angle |
|---|---|---|---|
| Email infrastructure | webmail, smtp, autodiscover, owa | 1.0 | email security / DMARC |
| Unmanaged shared hosting | cpanel, whm, plesk, webdisk | 1.3 | managed security / patching |
| Remote access / perimeter | vpn, citrix, anyconnect, rdp | 3.0 | zero-trust / ransomware |
| Exposed engineering surface | git, gitlab, jenkins, grafana | 2.5 | secrets / DevSecOps |
| Non-production exposed | dev, staging, uat, sandbox | 2.0 | attack surface management |
| Admin & management panels | admin, phpmyadmin, dashboard | 2.2 | access control |
| Storage & file transfer | ftp, nas, backup, nextcloud | 1.6 | data protection |

Weights encode risk, not frequency. Email infrastructure is everywhere, so it's
worth the least; an exposed VPN or a public git server is a real foothold, so it
weighs the most. Tokens match as whole hyphen/dot components, so `dev` fires on
`dev.acme.com` and `api-dev.acme.com` but not on `development`.

## Surface score (0–100)

The score blends three explainable components:

```
signal_c = Σ weight(present signals) / Σ weight(all signals)
size_c   = ln(1 + hostname_count) / ln(1 + 512)      capped at 1
spread_c = ln(1 + net24_count)   / ln(1 + 64)        capped at 1

surface_score = 100 · (0.55·signal_c + 0.30·size_c + 0.15·spread_c)
```

- **signal_c** — which surfaces are exposed, risk-weighted. The largest share.
- **size_c** — how many public hostnames, log-scaled so a 50-host company and a
  500-host company aren't 10× apart.
- **spread_c** — how many distinct /24 networks, a rough proxy for how
  distributed the estate is.

The dossier shows each component's point contribution, so a rep can see *why* a
company scored the way it did rather than trusting a black box.

## Priority score

For ranking, `priority_score` tilts the surface score toward bigger footprints so
"broad and exposed" sorts above "exposed but tiny":

```
priority_score = surface_score · (0.6 + 0.4 · size_c)
```

## Infrastructure filter

Before anything is scored, domains that are shared infrastructure rather than
companies are removed (see `docs/notes.md` for how they were found). A domain is
flagged when any of these hold:

- it's on the denylist of known dynamic-DNS / free-subdomain / device-cloud
  domains (`duckdns.org`, `synology.me`, the `*.uk.com` CentralNic set, …);
- `net24_count ≥ 150` — sprawls across more networks than one company runs;
- `hostname_count ≥ 8000` — platform-scale name counts;
- `hostname_count ≥ 2000` on ≤ 2 networks — a wildcard/vhost farm;
- `hostname_count ≥ 1000` and `≥ 50 × ip_count` — mass shared hosting.

Flagged domains never enter the served table; the count and a few examples are
kept in `meta` and shown in the app's "About the data" panel.

## Tuning

Change a weight, a token list, or a threshold in `signals.yaml`, re-run
`make company`, and the scores, facets, and talking points all move together. No
code change needed.
