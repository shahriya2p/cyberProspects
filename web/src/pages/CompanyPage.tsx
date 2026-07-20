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
  if (!c) return <div className="py-20 text-center text-slate-400">Loading…</div>;

  return (
    <div className="space-y-5">
      <Link to="/explore" className="text-sm text-indigo-600 hover:underline">
        Back to Explore
      </Link>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{c.domain}</h1>
            <div className="mt-1 text-sm text-slate-500">
              {c.country} · public suffix .{c.tld}
            </div>
          </div>
          <div className="flex gap-8 text-right">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Surface score</div>
              <div className={`text-3xl font-bold ${scoreTone(c.surface_score).text}`}>
                {c.surface_score}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Priority score</div>
              <div className={`text-3xl font-bold ${scoreTone(c.priority_score).text}`}>
                {c.priority_score}
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-slate-700">{c.summary}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Hostnames" value={commas(c.hostname_count)} />
        <Stat label="Distinct IPs" value={commas(c.ip_count)} />
        <Stat label="/24 networks" value={commas(c.net24_count)} />
        <Stat label="Signals" value={`${c.signal_count} / 7`} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title="Why they're a fit — talking points">
            <div className="space-y-3">
              {c.signal_hits.map((h) => (
                <SignalCard key={h.key} hit={h} />
              ))}
            </div>
          </Panel>

          <Panel title={`Infrastructure map — ${commas(c.hostname_count)} hostnames, showing top ${c.hosts.length}`}>
            <div className="overflow-x-auto scroll-thin">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-1 pr-4">Hostname</th>
                    <th className="py-1 pr-4">IP</th>
                    <th className="py-1 pr-4">Network</th>
                    <th className="py-1">Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {c.hosts.map((h) => (
                    <tr key={h.hostname}>
                      <td className="py-1.5 pr-4 font-mono text-xs text-slate-700">{h.hostname}</td>
                      <td className="py-1.5 pr-4 font-mono text-xs text-slate-500">{h.ip}</td>
                      <td className="py-1.5 pr-4 font-mono text-xs text-slate-400">{h.net24}</td>
                      <td className="py-1.5">
                        {h.signal && (
                          <span className={`h-2 w-2 rounded-full ${signalColor(h.signal).dot} inline-block`} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Score breakdown">
            <div className="space-y-3">
              {c.score_breakdown.map((f) => (
                <div key={f.label}>
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                    <span>{f.label}</span>
                    <span className="font-bold text-slate-900">
                      +{f.contribution}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">{f.detail}</div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-indigo-500"
                      style={{ width: `${Math.min(100, (f.contribution / 55) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="border-t border-slate-100 pt-2 text-sm">
                <span className="text-slate-500">Priority rank score </span>
                <ScoreBadge score={c.priority_score} />
              </div>
            </div>
          </Panel>

          <Panel title="Exposed signals">
            <div className="flex flex-wrap gap-1.5">
              {c.signal_hits.map((h) => (
                <span
                  key={h.key}
                  className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${signalColor(h.key).chip}`}
                >
                  {h.label}
                  <span className="opacity-60">×{commas(h.evidence_count)}</span>
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
    <div className="rounded-md border border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${color.dot}`} />
          <span className="font-medium text-slate-800">{hit.label}</span>
          <span className="text-xs text-slate-400">{hit.pitch}</span>
        </div>
        <span className="text-xs text-slate-400">
          {commas(hit.evidence_count)} host{hit.evidence_count === 1 ? "" : "s"}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-slate-600">{hit.talking_point}</p>
      {hit.example_hostname && (
        <div className="mt-1.5 font-mono text-xs text-slate-400">e.g. {hit.example_hostname}</div>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-0.5 text-xl font-semibold tabular-nums text-slate-900">{value}</div>
    </div>
  );
}

function NotFound({ domain }: { domain: string }) {
  return (
    <div className="py-20 text-center">
      <p className="text-slate-500">
        <span className="font-mono">{domain}</span> isn't in the prospect set.
      </p>
      <Link to="/explore" className="mt-2 inline-block text-sm text-indigo-600 hover:underline">
        Back to Explore
      </Link>
    </div>
  );
}
