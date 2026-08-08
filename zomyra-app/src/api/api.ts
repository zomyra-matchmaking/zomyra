/**
 * The RTK Query API slice — the single cache for all server state (FE TDD §4).
 *
 * Endpoints are **injected** from `src/api/endpoints/*` rather than declared
 * here, so each module adds its own surface without editing a shared file that
 * every module would then conflict on. The list of `tagTypes` is the one thing
 * that has to be central, because invalidation crosses module boundaries —
 * accepting a request (Module 8) has to invalidate the counts badge (Module 3).
 */
import { createApi } from "@reduxjs/toolkit/query/react";

import { baseQuery } from "./base-query";

export const api = createApi({
  reducerPath: "api",
  baseQuery,
  /**
   * Declared up front for the whole app, including endpoints later modules
   * add. An unused tag costs nothing; a missing one means a screen silently
   * showing stale data after a mutation elsewhere.
   */
  tagTypes: [
    "Me",
    "Profile",
    "Photos",
    "Verification",
    "Discover",
    "FilterOptions",
    "Requests",
    "Chats",
    "Messages",
    "Premium",
    "Quiz",
    "Counts",
    /**
     * Backend-driven reference data — API-38 `GET /locations/cities?state=<key>`
     * and API-39 `GET /onboarding/options` (FE v1.44 / BE v1.5 — MIGRATION
     * §12.3). **Both belong to Module 5**, which fetches *and* consumes them.
     *
     * The tags are declared here because this list has to be central; the
     * endpoints are not, because nothing before Module 5 can use them.
     *
     * **`keepUnusedDataFor` must be set explicitly on both.** RTK Query evicts
     * a cache entry **60 seconds** after its last subscriber unmounts. FE §4.2
     * requires these held for the session instead — otherwise walking Plot →
     * Anchor → Love, or between Edit Profile's cards, silently refetches the
     * catalogue every time. It looks fine in testing and costs real bytes on an
     * Indian mobile network in the field.
     *
     * **Neither goes in redux-persist's whitelist.** FE §4.2 now names these
     * catalogues as deliberate exclusions: in-memory for the session, refetched
     * on a cold start. `api` is already excluded wholesale — see the whitelist
     * comment in `src/store/index.ts` — so this needs no action, only no
     * exception.
     *
     * **Cache `Locations` per state key**, not globally: API-38 is scoped to one
     * state per call, and a user may switch state in Edit Profile.
     *
     * Corrected from the v1.42 reading, which had these as cold-start fetches
     * running parallel to the auth check. They are not: both require auth and
     * are fetched when the Onboarding stack mounts, and again when Edit Profile
     * opens. They never touch the root navigator or the version gate.
     */
    "Locations",
    "OnboardingOptions",
    "CompatibilityQuiz",
  ],
  /**
   * RTK Query's cache is in-memory by design. Anything that must survive a
   * cold start is a redux-persist'd slice instead (FE TDD §4.2), which is why
   * the onboarding draft is client state rather than a cached response.
   */
  endpoints: () => ({}),
});
