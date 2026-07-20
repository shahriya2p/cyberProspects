import { useQuery } from "@tanstack/react-query";

import { getSignals } from "../api/client";
import type { SignalInfo } from "../api/types";

// Each signal gets a stable colour so a rep learns to read the badges at a
// glance. Keyed by signal key; falls back to slate for anything unmapped.
const COLORS: Record<string, { chip: string; dot: string }> = {
  email: { chip: "bg-sky-100 text-sky-800", dot: "bg-sky-500" },
  hosting_panel: { chip: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  remote_access: { chip: "bg-rose-100 text-rose-800", dot: "bg-rose-500" },
  devops: { chip: "bg-violet-100 text-violet-800", dot: "bg-violet-500" },
  nonprod: { chip: "bg-teal-100 text-teal-800", dot: "bg-teal-500" },
  admin: { chip: "bg-orange-100 text-orange-800", dot: "bg-orange-500" },
  storage: { chip: "bg-indigo-100 text-indigo-800", dot: "bg-indigo-500" },
};

export const signalColor = (key: string) =>
  COLORS[key] ?? { chip: "bg-slate-100 text-slate-700", dot: "bg-slate-400" };

export function useSignals() {
  const { data } = useQuery({
    queryKey: ["signals"],
    queryFn: getSignals,
    staleTime: Infinity,
  });
  const byKey: Record<string, SignalInfo> = {};
  (data ?? []).forEach((s) => (byKey[s.key] = s));
  return { signals: data ?? [], byKey };
}

export const labelFor = (byKey: Record<string, SignalInfo>, key: string) =>
  byKey[key]?.label ?? key;
