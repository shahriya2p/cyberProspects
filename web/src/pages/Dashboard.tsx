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

const HIST_COLORS = ["#94a3b8", "#94a3b8", "#94a3b8", "#38bdf8", "#38bdf8", "#f59e0b", "#f59e0b", "#f43f5e", "#f43f5e", "#f43f5e"];

export function Dashboard() {
  const { data: stats } = useQuery({ queryKey: ["stats"], queryFn: getStats });
  const { byKey } = useSignals();

  if (!stats) return <div className="py-20 text-center text-slate-400">Loading…</div>;

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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Prospect universe</h1>
        <p className="mt-1 text-sm text-slate-500">
          Companies ranked by the attack surface visible in public DNS. Start here, then jump
          into a segment.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Prospects" value={commas(stats.prospects)} sub="companies with a signal or real footprint" />
        <StatCard label="Countries" value={commas(stats.countries)} sub="territories covered" />
        <StatCard label="Domains scanned" value={commas(stats.domains_seen)} sub="registrable domains seen" />
        <StatCard
          label="Noise filtered"
          value={commas(stats.infrastructure_filtered)}
          sub="DDNS / hosting excluded"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Companies by exposed signal</h2>
          <BarList items={signalBars} format={commas} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-1 text-sm font-semibold text-slate-800">Surface-score distribution</h2>
          <p className="mb-3 text-xs text-slate-500">Higher score = broader, riskier exposure.</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hist} margin={{ top: 6, right: 6, left: 6, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "#f1f5f9" }}
                formatter={(v: number) => [commas(v), "companies"]}
                labelFormatter={(l) => `score ${l}–${Number(l) + 10}`}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {hist.map((b) => (
                  <Cell key={b.lo} fill={HIST_COLORS[Math.min(9, Math.floor(b.lo / 10))]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-800">Top territories</h2>
          <BarList items={countryBars} format={commas} />
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Most Exposed Organizations</h2>
            <Link to="/explore" className="text-xs font-medium text-indigo-600 hover:underline">
              Open Explore
            </Link>
          </div>
          <div className="space-y-2">
            {stats.top_prospects.map((c) => (
              <Link
                key={c.domain}
                to={`/company/${encodeURIComponent(c.domain)}`}
                className="block rounded-md px-2 py-2 hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <ScoreBadge score={c.surface_score} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                    {c.domain}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {c.country} · {commas(c.hostname_count)} hosts
                  </span>
                </div>
                <div className="mt-1.5 pl-10">
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
    <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
      <h2 className="mb-2 text-sm font-semibold text-slate-800">About the data</h2>
      <p className="leading-relaxed">
        Cyber Prospect analyzes global internet traffic to discover the technology infrastructure belonging to different organizations. We automatically group hostnames to their main company domains, while carefully filtering out shared hosting providers and internet noise (like <span className="text-slate-500">{meta.infra_examples}</span>) to ensure you only see real companies.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Note: The signals shown indicate <em>potential exposure</em> (the attack surface), rather than confirmed security vulnerabilities. Similarly, the size of a company's internet footprint is used as a rough estimate for their actual size. Use these scores to prioritize your research, rather than as absolute facts.
      </p>
    </div>
  );
}
