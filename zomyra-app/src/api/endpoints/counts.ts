/**
 * App-shell badge counts — API-34 (FE TDD §9.13).
 *
 * Low-stakes by contract: a failure means the badges simply don't update this
 * cycle, with no error UI and no retry. Module 3 wires it to the tab bar.
 */
import { api } from "../api";
import type { CountsResponse } from "../contract";

export const countsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCounts: build.query<CountsResponse, void>({
      query: () => ({ url: "/counts" }),
      providesTags: ["Counts"],
    }),
  }),
});

export const { useGetCountsQuery } = countsApi;
