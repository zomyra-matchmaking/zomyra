/**
 * Session identity and the launch version gate — API-6 and API-5.
 */
import { api } from "../api";
import type { MeResponse, VersionCheckResponse } from "../contract";

export const sessionApi = api.injectEndpoints({
  endpoints: (build) => ({
    /**
     * API-6 · `GET /me` — the routing table in FE TDD §9.1.
     *
     * Also the self-correcting path for a missed verification push: reopening
     * the app re-reads `verificationStatus` here, so no polling endpoint is
     * needed. Module 3's root gate is its first real consumer.
     */
    getMe: build.query<MeResponse, void>({
      query: () => ({ url: "/me" }),
      providesTags: ["Me"],
      // Worth a retry: a failure here strands the user on the splash with no
      // route to send them to, which is worse than a slightly slower launch.
      extraOptions: { maxRetries: 2 },
    }),

    /**
     * API-5 · `GET /app/version-check` (FR-30).
     *
     * **Fails open by contract** — a network failure skips the check for this
     * launch rather than blocking it, so callers must treat an error as "no
     * update required", never as a reason to hold the user. No retry: retrying
     * an optional check just delays the app.
     */
    checkAppVersion: build.query<VersionCheckResponse, { platform: "ios" | "android" }>({
      query: ({ platform }) => ({ url: "/app/version-check", params: { platform } }),
      extraOptions: { skipAuth: true },
    }),
  }),
});

export const { useGetMeQuery, useLazyGetMeQuery, useCheckAppVersionQuery } = sessionApi;
