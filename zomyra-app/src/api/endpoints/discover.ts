/**
 * Discover feed — API-12 (FE TDD §9.5).
 *
 * Module 7 owns the screen and the full contract (filters, the last-3 prefetch,
 * hero prefetch, the empty state). What lands here in Module 2 is the call
 * itself, with the two things the prototype had no notion of: cursor
 * pagination, and the 3-retry behaviour §6.5 specifies.
 */
import { api } from "../api";
import type { DiscoverFeedQuery, DiscoverFeedResponse } from "../contract";

export const discoverApi = api.injectEndpoints({
  endpoints: (build) => ({
    getDiscoverFeed: build.query<DiscoverFeedResponse, DiscoverFeedQuery | void>({
      query: (arg) => ({
        url: "/discover",
        params: {
          mode: arg?.mode ?? "all",
          limit: arg?.limit ?? 10,
          ...(arg?.cursor ? { cursor: arg.cursor } : {}),
        },
      }),
      providesTags: ["Discover"],
      /** §6.5: three attempts behind the logo animation, then the error state. */
      extraOptions: { maxRetries: 3 },
    }),
  }),
});

export const { useGetDiscoverFeedQuery } = discoverApi;
