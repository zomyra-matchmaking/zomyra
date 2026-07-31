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
  ],
  /**
   * RTK Query's cache is in-memory by design. Anything that must survive a
   * cold start is a redux-persist'd slice instead (FE TDD §4.2), which is why
   * the onboarding draft is client state rather than a cached response.
   */
  endpoints: () => ({}),
});
