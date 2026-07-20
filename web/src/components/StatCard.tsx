export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-indigo-200 group">
      <div className="absolute top-0 right-0 -mr-8 -mt-8 h-24 w-24 rounded-full bg-indigo-50 opacity-0 transition-opacity group-hover:opacity-100 blur-2xl"></div>
      <div className="relative">
        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
        <div className="mt-1.5 text-3xl font-bold tracking-tight tabular-nums text-slate-900">{value}</div>
        {sub && <div className="mt-1 text-xs font-medium text-slate-500">{sub}</div>}
      </div>
    </div>
  );
}
