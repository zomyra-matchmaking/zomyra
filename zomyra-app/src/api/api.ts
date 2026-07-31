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
     * API-38 `GET /locations/cities` (FE v1.42 / BE v1.4 — MIGRATION §12.2).
     * The endpoint itself is Module 3's to add; the tag is here because this
     * list is the one part of the API slice that has to be central.
     *
     * **Two data-layer decisions come with it, and both default wrong:**
     *
     * 1. **`keepUnusedDataFor` must be set explicitly.** The spec says the full
     *    table is fetched *once at cold start and cached for the session*. RTK
     *    Query's default evicts a cache entry **60 seconds** after its last
     *    subscriber unmounts — so leaving the default means re-fetching the
     *    entire cities table every time the user returns to a city field. It
     *    would look fine in testing and cost real bytes on an Indian mobile
     *    network in the field.
     * 2. **Do not add this to redux-persist's whitelist.** Refetching once per
     *    cold start is the specified behaviour, and `api` is excluded from
     *    persistence precisely so a full reference table cannot accumulate on
     *    disk (NFR-11, FE TDD §4.4). The store's whitelist comment is the
     *    reference.
     *
     * FE §6.14 also requires it to run *parallel* to the auth check, not behind
     * the version gate, and never to block the root navigator — so it wants a
     * retry budget (NFR-7 expects a retry state in the city field), not the
     * boot-gate treatment `getMe` gets.
     */
    "Locations",
  ],
  /**
   * RTK Query's cache is in-memory by design. Anything that must survive a
   * cold start is a redux-persist'd slice instead (FE TDD §4.2), which is why
   * the onboarding draft is client state rather than a cached response.
   */
  endpoints: () => ({}),
});
