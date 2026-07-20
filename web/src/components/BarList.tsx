import { Link } from "react-router-dom";

export interface BarItem {
  label: string;
  value: number;
  to?: string;
  dot?: string;
}

export function BarList({ items, format }: { items: BarItem[]; format: (n: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-1.5">
      {items.map((item) => {
        const row = (
          <div className="group flex items-center gap-3">
            <div className="flex w-44 shrink-0 items-center gap-2 truncate text-sm text-slate-700">
              {item.dot && <span className={`h-2 w-2 shrink-0 rounded-full ${item.dot}`} />}
              <span className="truncate group-hover:text-slate-900">{item.label}</span>
            </div>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-400 group-hover:bg-indigo-500"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
            <div className="w-16 shrink-0 text-right text-sm tabular-nums text-slate-500">
              {format(item.value)}
            </div>
          </div>
        );
        return item.to ? (
          <Link key={item.label} to={item.to} className="block">
            {row}
          </Link>
        ) : (
          <div key={item.label}>{row}</div>
        );
      })}
    </div>
  );
}
