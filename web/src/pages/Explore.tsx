import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { exportUrl, listCompanies } from "../api/client";
import { CompanyTable } from "../components/CompanyTable";
import { FilterPanel } from "../components/FilterPanel";
import { Button } from "../components/Button";
import { Dropdown } from "../components/Dropdown";
import { Pagination } from "../components/Pagination";
import { commas } from "../lib/format";
import { useFilters } from "../lib/useFilters";
import { useSignals } from "../lib/signals";

const SORTS = [
  { value: "priority", label: "Priority" },
  { value: "surface", label: "Surface score" },
  { value: "hosts", label: "Hostname count" },
  { value: "domain", label: "Domain (A–Z)" },
];

export function Explore() {
  const [filters, update] = useFilters();
  const { byKey } = useSignals();
  const { data, isFetching } = useQuery({
    queryKey: ["companies", filters],
    queryFn: () => listCompanies(filters),
    placeholderData: keepPreviousData,
  });

  const [copied, setCopied] = useState(false);
  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const facets = data?.facets ?? { country: [], signal: [] };

  return (
    <div className="flex gap-6">
      <FilterPanel filters={filters} update={update} facets={facets} byKey={byKey} />

      <div className="min-w-0 flex-1 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="text-sm font-medium text-slate-500 flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight text-slate-900">{commas(data?.total ?? 0)}</span>
            <span>companies in this segment</span>
            {isFetching && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 animate-pulse">updating…</span>}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mr-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sort</label>
              <Dropdown
                value={filters.sort}
                onChange={(e) => update({ sort: e.target.value })}
                options={SORTS}
              />
            </div>
            <Button
              onClick={copyLink}
              variant="secondary"
              title="This URL captures the whole segment — send it to a teammate"
            >
              {copied ? "Copied!" : "Copy segment"}
            </Button>
            <Button
              as="a"
              href={exportUrl(filters)}
              variant="primary"
            >
              Export CSV
            </Button>
          </div>
        </div>

        <CompanyTable items={data?.items ?? []} byKey={byKey} />

        {data && data.total > 0 && (
          <Pagination
            page={filters.page}
            limit={filters.limit}
            total={data.total}
            onPage={(p) => update({ page: p })}
          />
        )}
      </div>
    </div>
  );
}
