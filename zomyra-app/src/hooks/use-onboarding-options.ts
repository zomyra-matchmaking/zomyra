/**
 * API-39's catalogue, indexed by category — FR-3b's read side.
 *
 * ## Why the indexing happens in `selectFromResult` and not in the screen
 *
 * API-39 returns `{ categories: [{ key, values }] }` — an array, because that
 * is what the wire format is. Every consumer wants `options("religion")`, so
 * *somebody* has to turn one into the other. Doing it here means it happens
 * once per response rather than once per render of every question screen, and
 * `selectFromResult` is what makes that true: RTK Query memoises the projection
 * against the cache entry, so the `Record` is rebuilt only when the response
 * itself changes, and a component subscribing through this hook re-renders only
 * when its own slice of the result does.
 *
 * ## An unknown category is empty, not a crash
 *
 * `options()` returns `[]` for a category the backend did not send. That is a
 * deliberate soft failure: the alternative — throwing — would turn a backend
 * that shipped one category short into a white screen mid-onboarding, on a
 * flow the user cannot get out of. The empty grid is visible, reportable, and
 * leaves every other question working. `missingCategories` names them so a
 * screen can say so out loud rather than rendering nothing and looking broken.
 *
 * ## `label()` falls back to the key
 *
 * A stored key with no catalogue entry is what a *resumed draft* looks like
 * after the backend retires a value (NFR-1 keeps drafts across app versions, so
 * this is reachable in normal use, not just in theory). Showing the raw key is
 * ugly and correct; showing nothing hides that the user's answer no longer
 * exists, and dropping the field silently would submit a different profile than
 * the one they filled in.
 */
import { useCallback, useMemo } from "react";

import { useGetOnboardingOptionsQuery } from "@/src/api";
import type { CatalogueOption, OptionCategoryKey } from "@/src/api";

/** Categories a screen may render. Everything API-39 serves except the FR-15a lens list. */
export type CatalogueIndex = Partial<Record<OptionCategoryKey, CatalogueOption[]>>;

const EMPTY: CatalogueOption[] = [];

export function useOnboardingOptions() {
  // `refetch` survives `selectFromResult`: the projection replaces the *result*
  // object, and `useQuery` merges the subscription's action creators over it.
  const { index, isLoading, isError, refetch } = useGetOnboardingOptionsQuery(undefined, {
    selectFromResult: (result) => ({
      isLoading: result.isLoading,
      isError: result.isError,
      index: buildIndex(result.data?.categories),
    }),
  });

  const options = useCallback(
    (category: OptionCategoryKey): CatalogueOption[] => index[category] ?? EMPTY,
    [index],
  );

  /** Resolve one stored key to its display label. Falls back to the key itself. */
  const label = useCallback(
    (category: OptionCategoryKey, key: string): string =>
      options(category).find((o) => o.key === key)?.label ?? key,
    [options],
  );

  const missingCategories = useMemo(
    () => REQUIRED_CATEGORIES.filter((c) => !index[c]?.length),
    [index],
  );

  return { options, label, isLoading, isError, refetch, missingCategories };
}

/**
 * The categories onboarding cannot render a question without.
 *
 * `discoveryMode` is excluded — FR-15a's picker is a different screen and its
 * *keys* are a fixed contract regardless of this catalogue (see
 * `DiscoveryMode`). `state` is included even though it is never submitted:
 * without it there is no way to reach API-38, so the city question is dead too.
 */
const REQUIRED_CATEGORIES: OptionCategoryKey[] = [
  "gender",
  "state",
  "build",
  "education",
  "profession",
  "incomeRange",
  "religion",
  "languages",
  "diet",
  "drinking",
  "smoking",
  "familyType",
  "matchLocationPreference",
  "childrenPreference",
  "interfaithStance",
  "smokingPartnerComfort",
  "householdPreference",
  "relocationWillingness",
];

function buildIndex(
  categories: { key: OptionCategoryKey; values: CatalogueOption[] }[] | undefined,
): CatalogueIndex {
  if (!categories) return {};
  const out: CatalogueIndex = {};
  for (const category of categories) out[category.key] = category.values;
  return out;
}
