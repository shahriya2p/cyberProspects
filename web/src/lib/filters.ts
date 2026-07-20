// The filter state. It lives entirely in the URL, which is what makes a saved
// segment just a link you can paste to a teammate.

export interface Filters {
  q: string;
  countries: string[];
  signals: string[];
  signalMode: "any" | "all";
  minScore: number | null;
  minHosts: number | null;
  sort: string;
  order: "asc" | "desc";
  page: number;
  limit: number;
}

export const DEFAULT_FILTERS: Filters = {
  q: "",
  countries: [],
  signals: [],
  signalMode: "any",
  minScore: null,
  minHosts: null,
  sort: "priority",
  order: "desc",
  page: 1,
  limit: 25,
};

export function fromSearchParams(sp: URLSearchParams): Filters {
  const num = (key: string) => {
    const v = sp.get(key);
    return v === null || v === "" ? null : Number(v);
  };
  return {
    q: sp.get("q") ?? "",
    countries: sp.getAll("country"),
    signals: sp.getAll("signal"),
    signalMode: (sp.get("signal_mode") as Filters["signalMode"]) ?? "any",
    minScore: num("min_score"),
    minHosts: num("min_hosts"),
    sort: sp.get("sort") ?? "priority",
    order: (sp.get("order") as Filters["order"]) ?? "desc",
    page: num("page") ?? 1,
    limit: num("limit") ?? 25,
  };
}

// Build the query string shared by the browser URL and the API request. We drop
// anything at its default so shared links stay tidy.
export function toParams(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  f.countries.forEach((c) => p.append("country", c));
  f.signals.forEach((s) => p.append("signal", s));
  if (f.signals.length && f.signalMode !== "any") p.set("signal_mode", f.signalMode);
  if (f.minScore != null) p.set("min_score", String(f.minScore));
  if (f.minHosts != null) p.set("min_hosts", String(f.minHosts));
  if (f.sort !== "priority") p.set("sort", f.sort);
  if (f.order !== "desc") p.set("order", f.order);
  if (f.page !== 1) p.set("page", String(f.page));
  if (f.limit !== 25) p.set("limit", String(f.limit));
  return p;
}
