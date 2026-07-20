import { useSearchParams } from "react-router-dom";

import type { Filters } from "./filters";
import { fromSearchParams, toParams } from "./filters";

// The URL is the single source of truth for the filter, so a segment is just a
// shareable link and the browser back button works as expected.
export function useFilters(): [Filters, (patch: Partial<Filters>) => void] {
  const [sp, setSp] = useSearchParams();
  const filters = fromSearchParams(sp);

  const update = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    // any change to the query itself sends the rep back to the first page
    if (!("page" in patch)) next.page = 1;
    setSp(toParams(next), { replace: !("page" in patch) ? false : true });
  };

  return [filters, update];
}
