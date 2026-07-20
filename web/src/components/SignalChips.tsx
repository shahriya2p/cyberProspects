import type { SignalInfo } from "../api/types";
import { labelFor, signalColor } from "../lib/signals";

export function SignalChip({ keyName, label }: { keyName: string; label: string }) {
  const c = signalColor(keyName);
  return (
    <span className={`inline-flex items-center gap-1 rounded whitespace-pre px-1.5 py-0.5 text-xs font-medium ${c.chip}`}>
      <span className={`h-1.5 min-w-1.5 w-1.5 rounded-full ${c.dot}`} />
      {label}
    </span>
  );
}

export function SignalChips({
  keys,
  byKey,
  limit,
}: {
  keys: string[];
  byKey: Record<string, SignalInfo>;
  limit?: number;
}) {
  const shown = limit ? keys.slice(0, limit) : keys;
  const extra = keys.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((k) => (
        <SignalChip key={k} keyName={k} label={labelFor(byKey, k)} />
      ))}
      {extra > 0 && <span className="text-xs text-slate-400">+{extra}</span>}
    </div>
  );
}
