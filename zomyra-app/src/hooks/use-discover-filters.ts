/**
 * Discover filters, as a controller hook (FE TDD §4.1).
 *
 * Returns the selections alongside dispatch-bound actions so the Filters screen
 * reads `filters.toggle(key, value)` rather than threading `dispatch` through
 * every row. Module 7 extends this with the query-parameter serialisation
 * API-12 expects — one place, rather than at each call site.
 */
import { useMemo } from "react";

import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  clearFilter,
  resetFilters,
  setAgeRange,
  setHeightRange,
  toggleFilter,
  type AgeRange,
  type FilterKey,
  type HeightRange,
  type MultiFilterKey,
} from "@/src/store/slices/discover-filters-slice";

export function useDiscoverFilters() {
  const dispatch = useAppDispatch();
  const selections = useAppSelector((s) => s.discoverFilters);

  const actions = useMemo(
    () => ({
      setAge: (range: AgeRange) => dispatch(setAgeRange(range)),
      setHeight: (range: HeightRange) => dispatch(setHeightRange(range)),
      toggle: (key: MultiFilterKey, value: string) => dispatch(toggleFilter({ key, value })),
      clear: (key: FilterKey) => dispatch(clearFilter(key)),
      reset: () => dispatch(resetFilters()),
    }),
    [dispatch],
  );

  return { ...selections, ...actions };
}
