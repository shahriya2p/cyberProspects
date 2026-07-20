import { scoreTone } from "../lib/format";

export function ScoreBadge({ score, label }: { score: number; label?: string }) {
  const tone = scoreTone(score);
  return (
    <span
      className={`inline-flex items-baseline gap-1 rounded-md px-2 py-0.5 text-sm font-semibold ${tone.bg} ${tone.text}`}
      title={label}
    >
      {score}
    </span>
  );
}

export function ScoreBar({ score }: { score: number }) {
  const tone = scoreTone(score);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full ${tone.bar}`} style={{ width: `${Math.min(100, score)}%` }} />
    </div>
  );
}
