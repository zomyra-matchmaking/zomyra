/**
 * Onboarding's three endpoints — API-39, API-38 and API-7 (FE TDD §9.2).
 *
 * ## None of these are deployed
 *
 * Re-probed on 2026-08-05, as MIGRATION §12.8 instructed Module 5 to do:
 * `GET /v1/onboarding/options` and `GET /v1/locations/cities?state=` both
 * return **404 `not_found`**, i.e. not routed rather than merely unauthorised
 * (`GET /v1/me` returns 401 on the same host, which is what makes the
 * distinction evidence). `POST /v1/onboarding/submit` is routed and enforcing
 * auth (401), per §6's Module 2 endpoint map.
 *
 * That changes nothing structurally — the mock sits *behind* the base query, so
 * these definitions are the ones that will run against staging unaltered — but
 * it does mean every behaviour below is verified against `src/api/mock/` only.
 * Whoever finds API-38/39 live should re-walk M5-001…M5-004 before believing
 * the catalogue shapes.
 *
 * ## Why both reference-data queries set `keepUnusedDataFor` explicitly
 *
 * RTK Query evicts a cache entry **60 seconds** after its last subscriber
 * unmounts. Onboarding unmounts subscribers constantly — every question screen
 * is a fresh render of one component with different props, and a user reading
 * carefully spends well over a minute on Plot alone. At the default the
 * catalogue would refetch partway through the flow, which looks fine on a desk
 * and costs real bytes on the Indian mobile networks NFR-4 targets.
 *
 * FE §4.2 asks for these to be held **for the session**, so the value is
 * `Infinity`: an explicit "never evict while the app lives" rather than a large
 * number that invites someone to wonder what it was measured against. A cold
 * start clears it either way — this is RTK Query's in-memory cache, deliberately
 * *not* redux-persist (see the `Locations` note in `api.ts`).
 */
import { api } from "../api";
import type {
  CitiesResponse,
  OnboardingOptionsResponse,
  OnboardingSubmitBody,
  OnboardingSubmitResponse,
} from "../contract";

/** FE §4.2's "held for the session". See the file note above. */
const SESSION_LIFETIME = Infinity;

export const onboardingApi = api.injectEndpoints({
  endpoints: (build) => ({
    /**
     * API-39 — every backend-driven choice list in Plot and Anchor (FR-3b).
     *
     * One cache entry for the whole catalogue, shared by the Onboarding stack
     * and by Edit Profile, which FE §9.2 says explicitly reuse the same hook.
     */
    getOnboardingOptions: build.query<OnboardingOptionsResponse, void>({
      query: () => ({ url: "/onboarding/options" }),
      providesTags: ["OnboardingOptions"],
      keepUnusedDataFor: SESSION_LIFETIME,
    }),

    /**
     * API-38 — the cities of one state (FR-3a).
     *
     * **The `state` argument is the cache key**, which is the entire reason
     * this is a query-per-state rather than one call: RTK Query keys a cache
     * entry by the serialised argument, so re-selecting a state already fetched
     * is answered from memory and never hits the network. That is the
     * behaviour §12.3 describes as "cached per state key", and it comes free
     * from the argument shape rather than from any code here.
     */
    getCities: build.query<CitiesResponse, string>({
      query: (state) => ({ url: "/locations/cities", params: { state } }),
      providesTags: (_result, _error, state) => [{ type: "Locations", id: state }],
      keepUnusedDataFor: SESSION_LIFETIME,
    }),

    /**
     * API-7 — the single end-of-flow submit.
     *
     * **`invalidatesTags: ["Me"]` is what routes the user onward.** The
     * mutation's own response is `{ profileComplete: true }`, but the client
     * does not branch on it: `resolveRootDestination` reads `GET /me`, so the
     * refetch this triggers is what makes §9.1 return the photos step. Reading
     * the mutation result instead would be a second copy of a routing decision
     * that already exists in one place — the same reasoning that kept FR-1a out
     * of the auth screens (see `src/lib/root-route.ts`).
     *
     * **`Profile` is invalidated too** — Edit Profile's `GET /profile/me` is a
     * projection of exactly what was just submitted, so a cached miss from
     * before onboarding would otherwise survive it.
     *
     * There is no optimistic update. FE §9.2 notes there is no
     * partial-submission risk *because* this is one call at the end, and a
     * failure loses nothing: the draft stays in the persisted slice and the
     * client retries the identical payload.
     */
    submitOnboarding: build.mutation<OnboardingSubmitResponse, OnboardingSubmitBody>({
      query: (body) => ({ url: "/onboarding/submit", method: "POST", body }),
      invalidatesTags: ["Me", "Profile"],
    }),
  }),
});

export const {
  useGetOnboardingOptionsQuery,
  useGetCitiesQuery,
  useSubmitOnboardingMutation,
} = onboardingApi;
