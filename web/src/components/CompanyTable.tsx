import { Link, useNavigate } from "react-router-dom";

import type { CompanySummary, SignalInfo } from "../api/types";
import { commas } from "../lib/format";
import { ScoreBar } from "./ScoreBadge";
import { SignalChips } from "./SignalChips";

function Header({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-5 py-3 text-left whitespace-nowrap text-[11px] font-bold uppercase tracking-wider text-slate-400 ${className}`}>
      {children}
    </th>
  );
}

export function CompanyTable({
  items,
  byKey,
}: {
  items: CompanySummary[];
  byKey: Record<string, SignalInfo>;
}) {
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center text-sm font-medium text-slate-500">
        No companies match this segment. Loosen a filter.
      </div>
    );
  }
  return (
    <div className="overflow-auto rounded-xl border border-slate-200/80 bg-white shadow-sm scroll-thin">
      <table className="min-w-full divide-y divide-slate-100">
        <thead className="sticky top-0 z-10 bg-slate-50/90 backdrop-blur-sm shadow-sm">
          <tr>
            <Header>Company</Header>
            <Header>Territory</Header>
            <Header className="text-right">Hosts</Header>
            <Header className="text-right">Nets</Header>
            <Header>Exposed signals</Header>
            <Header className="w-32">Surface score</Header>
            <Header className="w-32">Priority score</Header>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((c) => (
            <tr
              key={c.domain}
              onClick={() => navigate(`/company/${encodeURIComponent(c.domain)}`)}
              className="group transition-colors hover:bg-slate-50/80 cursor-pointer"
            >
              <td className="px-5 py-4">
                <Link
                  to={`/company/${encodeURIComponent(c.domain)}`}
                  className="font-medium text-indigo-700 hover:underline"
                >
                  {c.domain}
                </Link>
                {c.sample_hostnames[0] && (
                  <div className="truncate font-mono text-xs text-slate-400">
                    {c.sample_hostnames[0]}
                  </div>
                )}
              </td>
              <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">{c.country}</td>
              <td className="px-5 py-4 text-right text-sm tabular-nums text-slate-700">
                {commas(c.hostname_count)}
              </td>
              <td className="px-5 py-4 text-right text-sm tabular-nums text-slate-500">
                {commas(c.net24_count)}
              </td>
              <td className="px-5 py-4">
                <SignalChips keys={c.signals} byKey={byKey} />
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="w-8 text-sm font-semibold tabular-nums text-slate-700">
                    {c.surface_score}
                  </span>
                  <div className="flex-1">
                    <ScoreBar score={c.surface_score} />
                  </div>
                </div>
              </td>
              <td className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="w-8 text-sm font-semibold tabular-nums text-slate-700">
                    {c.priority_score}
                  </span>
                  <div className="flex-1">
                    <ScoreBar score={c.priority_score} />
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
