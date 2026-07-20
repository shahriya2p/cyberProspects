import { commas } from "../lib/format";
import { Button } from "./Button";

export function Pagination({
  page,
  limit,
  total,
  onPage,
}: {
  page: number;
  limit: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <div className="flex items-center justify-between text-sm text-slate-600">
      <span>
        {commas(from)}–{commas(to)} of {commas(total)}
      </span>
      <div className="flex items-center gap-2">
        <Button
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          variant="secondary"
        >
          Prev
        </Button>
        <span className="tabular-nums text-slate-500">
          {page} / {pages}
        </span>
        <Button
          disabled={page >= pages}
          onClick={() => onPage(page + 1)}
          variant="secondary"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
