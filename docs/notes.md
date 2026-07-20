# Dataset notes

Scratch notes from poking at the raw data before writing any pipeline code. The
source is one ~26 GB bz2 of a tar of a partitioned parquet dataset:

```
ip_hostname.parquet/ip_type={v4,v6}/ip_bucket=NN/data_0.parquet
```

48 shards in total (v4 buckets 0–31, v6 0–15). Schema is tiny:

```
ip        VARCHAR
hostname  VARCHAR
ip_bucket BIGINT     -- hash partition of the IP
ip_type   VARCHAR    -- 'v4' | 'v6'
```

So it's a global IP↔hostname map — essentially passive DNS. One v4 shard is
~16M distinct hostnames, which puts the whole thing north of 500M rows. Way too
big to serve; the product has to be built on a derived, aggregated table.

## What's actually in the hostnames

The interesting part isn't the IPs, it's the subdomain labels. Top prefixes in a
single bucket:

```sql
SELECT split_part(hostname,'.',1) AS label, count(*) c
FROM read_parquet('.../ip_bucket=18/data_0.parquet')
GROUP BY 1 ORDER BY 2 DESC LIMIT 40;
```

```
 621968  www
 177482  webmail
 167407  mail
 161602  cpanel
 153901  webdisk
 149743  cpcalendars
 149674  cpcontacts
 134447  whm
  63728  autodiscover
  34824  ftp
  20123  api
  12135  admin
  12123  git
  11201  dev
  10858  gitlab
   6560  staging
   3352  vpn
   ...
```

These map cleanly onto attack-surface categories a security vendor sells against:
mail infra, cPanel/WHM shared hosting, remote access, exposed dev/CI, admin
panels. That observation is the whole product — see `docs/scoring.md`.

## Rolling hostnames up to companies

Grouping by "last two labels" is wrong the moment a ccTLD has a second level:

```
za.co        <- reversed co.za, 910k hostnames   (South Africa, not a company)
ke.co        <- reversed co.ke
ng.com       <- reversed com.ng
```

So the rollup has to go through the Public Suffix List. `tldextract` does this
correctly and works offline against a pinned snapshot:

```
autodiscover.tmmfeka.co.za     -> tmmfeka.co.za
cpcontacts.babs.com.ng         -> babs.com.ng
www.naturesecretsafaris.co.ke  -> naturesecretsafaris.co.ke
```

## The noise problem

First naive ranking by hostname count was almost entirely junk:

```
myvolumio.org     14443 hosts   1 ip        <- audio device cloud
quickconnect.to  422907 hosts   470677 ips  <- Synology
dahuaddns.com      2760 hosts   2935 ips    <- Dahua cameras
duckdns.org        ...                       <- dynamic DNS
sslip.io / nip.io  ...                       <- wildcard DNS
stratoserver.net 1507657 hosts  123 nets    <- hosting provider
```

None of these are prospects — they're shared infrastructure with thousands of
unrelated parties under one registrable domain. Two structural tells separate
them from real companies: they sprawl across far more /24 networks than any one
company would run, or the hostname count is platform-scale. That plus a denylist
of the low-footprint free-subdomain registries (the `*.uk.com` / `*.co.za` /
CentralNic style) is what the infra filter in `build.py` keys on.

After filtering, the top of the ranking is real: `ucla.edu`, `bt.com`, `bce.lu`
(Luxembourg central bank), `idaho.gov`, a pile of universities and ISPs.

## Sampling

Buckets are a hash partition, so any contiguous set is a uniform random sample of
the whole address space. The shipped demo uses the buckets that sit at the front
of the archive (18, 28, …) purely so extraction only has to stream a fraction of
the 26 GB. Scaling up is one Make variable.
