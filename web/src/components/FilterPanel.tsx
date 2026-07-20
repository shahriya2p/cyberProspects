import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { listCompanies } from "../api/client";
import type { FacetBucket, SignalInfo } from "../api/types";
import { DEFAULT_FILTERS, type Filters } from "../lib/filters";
import { commas } from "../lib/format";
import { signalColor } from "../lib/signals";
import { Button } from "./Button";

interface Props {
  filters: Filters;
  update: (patch: Partial<Filters>) => void;
  facets: { country: FacetBucket[]; signal: FacetBucket[] };
  byKey: Record<string, SignalInfo>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-100/80 px-5 py-4 first:border-t-0">
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">{title}</h3>
      {children}
    </div>
  );
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function FilterPanel({ filters, update, facets, byKey }: Props) {
  const [q, setQ] = useState(filters.q);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => setQ(filters.q), [filters.q]);
  useEffect(() => {
    const id = setTimeout(() => {
      if (q !== filters.q) update({ q });
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const suggestionsQuery = useQuery({
    queryKey: ["suggestions", q],
    queryFn: () => listCompanies({ ...DEFAULT_FILTERS, q, limit: 10 }),
    enabled: !!q && q.length > 1 && showSuggestions,
  });

  const countryList = facets.country.filter((c) => c.value !== "Global");

  return (
    <aside className="w-64 shrink-0">
      <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-slate-200/60 bg-white/95 shadow-xl shadow-slate-200/40 backdrop-blur-sm scroll-thin">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm font-bold text-slate-800">Filters</span>
          <Button
            onClick={() => update({ q: "", countries: [], signals: [], minScore: null, minHosts: null })}
            variant="ghost"
            size="sm"
          >
            Reset
          </Button>
        </div>

        <Section title="Domain">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              placeholder="contains…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-400/20"
            />
            {showSuggestions && suggestionsQuery.data?.items && suggestionsQuery.data.items.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg shadow-slate-200/50">
                {suggestionsQuery.data.items.map((item) => (
                  <li
                    key={item.domain}
                    className="cursor-pointer px-3 py-1.5 text-sm text-slate-700 hover:bg-indigo-50 truncate"
                    onClick={() => {
                      setQ(item.domain);
                      update({ q: item.domain });
                      setShowSuggestions(false);
                    }}
                  >
                    {item.domain}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>

        <Section title="Exposed signals">
          <div className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1 text-[11px] font-semibold tracking-wide">
            {(["any", "all"] as const).map((mode) => (
              <Button
                key={mode}
                onClick={() => update({ signalMode: mode })}
                variant={filters.signalMode === mode ? "toggle-active" : "toggle-inactive"}
                size="sm"
                className="flex-1"
              >
                MATCH {mode}
              </Button>
            ))}
          </div>
          <div className="space-y-1.5">
            {facets.signal.map((s) => (
              <label key={s.value} className="group flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={filters.signals.includes(s.value)}
                  onChange={() => update({ signals: toggle(filters.signals, s.value) })}
                  className="rounded border-slate-300 text-indigo-600 transition-colors focus:ring-indigo-500"
                />
                <span className={`h-2 w-2 rounded-full ${signalColor(s.value).dot}`} />
                <span className="flex-1 truncate text-slate-700 transition-colors group-hover:text-slate-900">{byKey[s.value]?.label ?? s.label}</span>
                <span className="tabular-nums text-xs text-slate-400">{commas(s.count)}</span>
              </label>
            ))}
          </div>
        </Section>

        <Section title="Territory">
          <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1 scroll-thin">
            {countryList.map((c) => (
              <label key={c.value} className="group flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={filters.countries.includes(c.value)}
                  onChange={() => update({ countries: toggle(filters.countries, c.value) })}
                  className="rounded border-slate-300 text-indigo-600 transition-colors focus:ring-indigo-500"
                />
                <span className="flex-1 truncate text-slate-700 transition-colors group-hover:text-slate-900">{c.label}</span>
                <span className="tabular-nums text-xs text-slate-400">{commas(c.count)}</span>
              </label>
            ))}
          </div>
        </Section>

        <Section title={`Min surface score: ${filters.minScore ?? 0}`}>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={filters.minScore ?? 0}
            onChange={(e) => update({ minScore: Number(e.target.value) || null })}
            className="w-full accent-indigo-600"
          />
        </Section>

        <Section title="Min hostnames">
          <div className="flex flex-wrap gap-1">
            {[null, 5, 10, 25, 100].map((n) => (
              <Button
                key={String(n)}
                onClick={() => update({ minHosts: n })}
                variant={filters.minHosts === n ? "toggle-active" : "toggle-inactive"}
                size="sm"
              >
                {n === null ? "any" : `${n}+`}
              </Button>
            ))}
          </div>
        </Section>
      </div>
    </aside>
  );
}
