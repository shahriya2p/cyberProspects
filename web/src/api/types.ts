// Mirrors the Pydantic models the API returns. Kept by hand — the surface is
// small and it's one less build step than generating from the OpenAPI schema.

export interface SignalInfo {
  key: string;
  label: string;
  category: string;
  weight: number;
  pitch: string;
  talking_point: string;
}

export interface CompanySummary {
  domain: string;
  country: string;
  cc: string | null;
  hostname_count: number;
  ip_count: number;
  net24_count: number;
  signal_count: number;
  signals: string[];
  surface_score: number;
  priority_score: number;
  sample_hostnames: string[];
}

export interface SignalHit {
  key: string;
  label: string;
  category: string;
  pitch: string;
  evidence_count: number;
  example_hostname: string;
  talking_point: string;
}

export interface HostSample {
  hostname: string;
  ip: string | null;
  net24: string | null;
  signal: string | null;
}

export interface ScoreFactor {
  label: string;
  detail: string;
  contribution: number;
}

export interface CompanyDetail extends CompanySummary {
  tld: string;
  signal_hits: SignalHit[];
  hosts: HostSample[];
  score_breakdown: ScoreFactor[];
  summary: string;
  talking_points: string[];
}

export interface FacetBucket {
  value: string;
  label: string;
  count: number;
}

export interface CompanyList {
  items: CompanySummary[];
  total: number;
  page: number;
  limit: number;
  facets: { country: FacetBucket[]; signal: FacetBucket[] };
}

export interface CountryStat {
  cc: string | null;
  country: string;
  companies: number;
  avg_score: number;
}

export interface SignalStat {
  key: string;
  label: string;
  category: string;
  companies: number;
}

export interface ScoreBin {
  lo: number;
  hi: number;
  count: number;
}

export interface Stats {
  prospects: number;
  domains_seen: number;
  infrastructure_filtered: number;
  countries: number;
  by_country: CountryStat[];
  by_signal: SignalStat[];
  score_hist: ScoreBin[];
  top_prospects: CompanySummary[];
  meta: Record<string, string>;
}
