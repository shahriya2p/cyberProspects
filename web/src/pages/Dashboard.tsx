import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { Link } from "react-router-dom";

import { getStats } from "../api/client";
import { BarList } from "../components/BarList";
import { ScoreBadge } from "../components/ScoreBadge";
import { SignalChips } from "../components/SignalChips";
import { StatCard } from "../components/StatCard";
import { commas } from "../lib/format";
import { signalColor, useSignals } from "../lib/signals";

const HIST_COLORS = ["#94a3b8", "#cbd5e1", "#818cf8", "#6366f1", "#4f46e5", "#4338ca", "#3730a3", "#8b5cf6", "#7c3aed", "#6d28d9"];

export function Dashboard() {
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: getStats });
  const { byKey } = useSignals();

  if (!stats) return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
        <span className="text-sm font-medium text-slate-400">Loading prospects…</span>
      </div>
    </div>
  );

  const signalBars = stats.by_signal.map((s) => ({
    label: s.label,
    value: s.companies,
    to: `/explore?signal=${s.key}`,
    dot: signalColor(s.key).dot,
  }));
  const countryBars = stats.by_country
    .filter((c) => c.country !== "Global")
    .slice(0, 12)
    .map((c) => ({
      label: c.country,
      value: c.companies,
      to: `/explore?country=${encodeURIComponent(c.country)}`,
    }));
  const hist = stats.score_hist.map((b) => ({ name: `${b.lo}`, count: b.count, lo: b.lo }));

  return (
    <div className="space-y-4 pb-10">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Prospects" value={commas(stats.prospects)} sub="Companies with real footprint" />
        <StatCard label="Countries" value={commas(stats.countries)} sub="Global territories covered" />
        <StatCard label="Domains Scanned" value={commas(stats.domains_seen)} sub="Registrable domains seen" />
        <StatCard label="Noise Filtered" value={commas(stats.infrastructure_filtered)} sub="DDNS / hosting excluded" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <h2 className="mb-5 text-sm font-bold text-slate-800">Companies by Exposed Signal</h2>
          <BarList items={signalBars} format={commas} />
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <h2 className="mb-1 text-sm font-bold text-slate-800">Surface Score Distribution</h2>
          <p className="mb-5 text-[13px] font-medium text-slate-500">A higher score indicates a broader, riskier exposure surface.</p>
          <div className="pt-2">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={hist} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }} tickLine={false} axisLine={false} dy={10} />
                <Tooltip
                  cursor={{ fill: "#f8fafc" }}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(v: number) => [<span className="font-semibold text-slate-900">{commas(v)}</span>, <span className="text-slate-500">companies</span>]}
                  labelFormatter={(l) => <span className="text-xs font-bold text-slate-500 uppercase">Score {l}–{Number(l) + 10}</span>}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {hist.map((b) => (
                    <Cell key={b.lo} fill={HIST_COLORS[Math.min(9, Math.floor(b.lo / 10))]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <h2 className="mb-5 text-sm font-bold text-slate-800">Top Territories</h2>
          <BarList items={countryBars} format={commas} />
        </div>

        <div className="flex flex-col rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Most Exposed Organizations</h2>
            <Link to="/explore" className="group flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
              Open Explore
              <svg className="h-3 w-3 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="flex-1 space-y-2.5">
            {stats.top_prospects.map((c) => (
              <Link
                key={c.domain}
                to={`/company/${encodeURIComponent(c.domain)}`}
                className="block rounded-lg border border-transparent px-3 py-3 transition-all hover:border-indigo-100 hover:bg-indigo-50/50 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <ScoreBadge score={c.surface_score} />
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">
                    {c.domain}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-slate-500">
                    {c.country} <span className="mx-1 text-slate-300">·</span> {commas(c.hostname_count)} hosts
                  </span>
                </div>
                <div className="mt-2.5 pl-11">
                  <SignalChips keys={c.signals} byKey={byKey} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <AboutData meta={stats.meta} />
    </div>
  );
}

function AboutData({ meta }: { meta: Record<string, string> }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-6 text-sm text-slate-600 shadow-inner">
      <div className="flex items-center gap-2 mb-3">
        <svg className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="text-sm font-bold text-slate-800">About the Data</h2>
      </div>
      <div className="space-y-3 font-medium">
        <p className="leading-relaxed">
          Cyber Prospect analyzes global internet traffic to discover the technology infrastructure belonging to different organizations. We automatically group hostnames to their main company domains, while carefully filtering out shared hosting providers and internet noise (like <span className="rounded bg-slate-200 px-1 py-0.5 text-xs text-slate-700">{meta.infra_examples}</span>) to ensure you only see real companies.
        </p>
        <p className="text-[13px] text-slate-500">
          <span className="font-semibold text-slate-700">Note:</span> The signals shown indicate <em>potential exposure</em> (the attack surface), rather than confirmed security vulnerabilities. Similarly, the size of a company's internet footprint is used as a rough estimate for their actual size. Use these scores to prioritize your research, rather than as absolute facts.
        </p>
      </div>
    </div>
  );
}
