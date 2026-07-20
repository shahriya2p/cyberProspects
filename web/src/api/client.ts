import type { Filters } from "../lib/filters";
import { toParams } from "../lib/filters";
import type { CompanyDetail, CompanyList, SignalInfo, Stats } from "./types";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function listCompanies(f: Filters): Promise<CompanyList> {
  return get<CompanyList>(`/api/companies?${toParams(f)}`);
}

export function getCompany(domain: string): Promise<CompanyDetail> {
  return get<CompanyDetail>(`/api/companies/${encodeURIComponent(domain)}`);
}

export function getStats(): Promise<Stats> {
  return get<Stats>("/api/stats");
}

export function getSignals(): Promise<SignalInfo[]> {
  return get<SignalInfo[]>("/api/signals");
}

// The CSV export is a plain link the browser downloads; no fetch needed.
export function exportUrl(f: Filters): string {
  return `/api/export.csv?${toParams(f)}`;
}
