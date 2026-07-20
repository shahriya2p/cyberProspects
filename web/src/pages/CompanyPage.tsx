import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { getCompany } from "../api/client";
import type { SignalHit } from "../api/types";
import { ScoreBadge } from "../components/ScoreBadge";
import { commas, scoreTone } from "../lib/format";
import { signalColor } from "../lib/signals";

export function CompanyPage() {
  const { domain = "" } = useParams();
  const { data: c, isError } = useQuery({
    queryKey: ["company", domain],
    queryFn: () => getCompany(domain),
  });

  if (isError) return <NotFound domain={domain} />;
  if (!c) return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
        <span className="text-sm font-medium text-slate-400">Loading {domain}…</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-10">
      <div className="pt-2">
        <Link to="/explore" className="group flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors w-fit">
          <svg className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Explore
        </Link>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{c.domain}</h1>
            <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-500">
              <span className="flex items-center gap-1">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {c.country}
              </span>
              <span className="text-slate-300">•</span>
              <span>public suffix .{c.tld}</span>
            </div>
          </div>
          <div className="flex gap-8 text-right bg-slate-50 rounded-xl px-5 py-3 border border-slate-100">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Surface score</div>
              <div className={`mt-0.5 text-3xl font-bold tracking-tight ${scoreTone(c.surface_score).text}`}>
                {c.surface_score}
              </div>
            </div>
            <div className="w-px bg-slate-200"></div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Priority score</div>
              <div className={`mt-0.5 text-3xl font-bold tracking-tight ${scoreTone(c.priority_score).text}`}>
                {c.priority_score}
              </div>
            </div>
          </div>
        </div>
        <p className="mt-6 max-w-4xl text-[15px] font-medium leading-relaxed text-slate-600 bg-indigo-50/50 p-4 rounded-lg border border-indigo-100/50">
          {c.summary}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Hostnames" value={commas(c.hostname_count)} />
        <Stat label="Distinct IPs" value={commas(c.ip_count)} />
        <Stat label="/24 networks" value={commas(c.net24_count)} />
        <Stat label="Signals" value={`${c.signal_count} / 7`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Why they're a fit — talking points">
            <div className="space-y-4">
              {c.signal_hits.map((h) => (
                <SignalCard key={h.key} hit={h} />
              ))}
            </div>
          </Panel>

          <Panel title={`Infrastructure map — ${commas(c.hostname_count)} hostnames, showing top ${c.hosts.length}`}>
            <div className="overflow-x-auto scroll-thin rounded-lg border border-slate-100 bg-slate-50/50">
              <table className="min-w-full text-sm">
                <thead className="bg-white">
                  <tr className="text-left text-[11px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200">
                    <th className="py-2.5 px-4">Hostname</th>
                    <th className="py-2.5 px-4">IP</th>
                    <th className="py-2.5 px-4">Network</th>
                    <th className="py-2.5 px-4">Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {c.hosts.map((h, i) => (
                    <tr key={i} className="hover:bg-white transition-colors">
                      <td className="py-2 px-4 font-mono text-xs font-medium text-slate-700">{h.hostname}</td>
                      <td className="py-2 px-4 font-mono text-xs text-slate-500">{h.ip}</td>
                      <td className="py-2 px-4 font-mono text-xs text-slate-400">{h.net24}</td>
                      <td className="py-2 px-4">
                        {h.signal && (
                          <span className={`h-2.5 w-2.5 rounded-full ${signalColor(h.signal).dot} inline-block shadow-sm`} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Score breakdown">
            <div className="space-y-4">
              {c.score_breakdown.map((f) => (
                <div key={f.label} className="group">
                  <div className="flex items-center justify-between text-sm font-bold text-slate-800">
                    <span>{f.label}</span>
                    <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-xs">
                      +{f.contribution}
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-medium text-slate-500">{f.detail}</div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-indigo-500 transition-all group-hover:bg-indigo-400"
                      style={{ width: `${Math.min(100, (f.contribution / 55) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="mt-6 border-t border-slate-200/80 pt-4 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Priority rank score </span>
                <ScoreBadge score={c.priority_score} />
              </div>
            </div>
          </Panel>

          <Panel title="Exposed signals">
            <div className="flex flex-wrap gap-2">
              {c.signal_hits.map((h) => (
                <span
                  key={h.key}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold shadow-sm border ${signalColor(h.key).chip}`}
                >
                  {h.label}
                  <span className="opacity-60 font-medium">×{commas(h.evidence_count)}</span>
                </span>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function SignalCard({ hit }: { hit: SignalHit }) {
  const color = signalColor(hit.key);
  return (
    <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 shadow-sm transition-all hover:bg-white hover:border-slate-300 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg shadow-sm border border-slate-200/50 bg-white`}>
            <span className={`h-2.5 w-2.5 rounded-full ${color.dot}`} />
          </span>
          <span className="font-bold text-slate-900">{hit.label}</span>
          <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-slate-500 uppercase ml-1">{hit.category}</span>
        </div>
        <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-md shadow-sm">
          {commas(hit.evidence_count)} host{hit.evidence_count === 1 ? "" : "s"}
        </span>
      </div>
      <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">{hit.talking_point}</p>
      {hit.example_hostname && (
        <div className="mt-2.5 flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">e.g.</span>
          <span className="font-mono text-xs font-medium text-slate-500 bg-white border border-slate-100 px-1.5 py-0.5 rounded">{hit.example_hostname}</span>
        </div>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <h2 className="mb-5 text-sm font-bold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-indigo-200 group">
      <div className="absolute top-0 right-0 -mr-6 -mt-6 h-16 w-16 rounded-full bg-indigo-50 opacity-0 transition-opacity group-hover:opacity-100 blur-xl"></div>
      <div className="relative">
        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
        <div className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function NotFound({ domain }: { domain: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="rounded-full bg-slate-100 p-4 mb-4">
        <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <h2 className="text-lg font-bold text-slate-900 mb-1">Company Not Found</h2>
      <p className="text-sm font-medium text-slate-500 max-w-sm mb-6">
        We couldn't find <span className="font-mono text-slate-700 bg-slate-100 px-1 py-0.5 rounded">{domain}</span> in our current prospect database. It may not have enough visible infrastructure.
      </p>
      <Link to="/explore" className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 transition-colors">
        Back to Explore
      </Link>
    </div>
  );
}
