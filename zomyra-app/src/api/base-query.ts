/**
 * The single point every request in the app passes through.
 *
 * Four responsibilities, layered outward:
 *
 *   1. **Transport** — `fetchBaseQuery` against `API_BASE_URL` (which already
 *      carries `/v1`), or the in-process mock transport when no host is
 *      configured. Both implement the same `BaseQueryFn` signature, so the
 *      three layers above are identical either way and pointing the app at a
 *      real backend is a `.env` change, nothing more (O-8).
 *   2. **Auth + silent refresh** — bearer token in, one shared refresh promise
 *      on 401, force-logout when the refresh itself fails.
 *   3. **Error normalisation** — everything above this line sees `ApiError`,
 *      with `X-Request-Id` already attached.
 *   4. **Retry** — opt-in per endpoint, and only for failures where retrying
 *      can actually help.
 */
import {
  fetchBaseQuery,
  retry,
  type BaseQueryFn,
  type FetchArgs,
} from "@reduxjs/toolkit/query/react";

import {
  APP_VERSION,
  BUNDLE_UPDATE_ID,
  HEADER_APP_VERSION,
  HEADER_BUNDLE_UPDATE_ID,
  HEADER_REQUEST_ID,
} from "@/src/config/app-headers";
import { API_BASE_URL, API_TIMEOUT_MS, USE_API_MOCKS } from "@/src/config/env";
import { clearTokens, getRefreshToken, loadTokens, peekAccessToken, setTokens } from "@/src/auth/tokens";
import { accountBlocked, sessionExpired } from "@/src/store/slices/session-slice";

import { isRetryable, normalizeError, type ApiError, type ApiErrorCode } from "./errors";
import { mockBaseQuery } from "./mock";

/** Per-endpoint knobs, passed as RTK Query's `extraOptions`. */
export type ZomyraExtraOptions = {
  /**
   * Retry attempts for transient failures. Defaults to none — FE TDD §9 gives
   * different endpoints deliberately different behaviour (Discover retries 3×
   * behind the logo animation, §6.5; Chat shows a Retry button instead, §9.8),
   * so retrying everywhere by default would quietly override the spec.
   */
  maxRetries?: number;
  /** Endpoints with no `Authorization` header and no 401-refresh path. */
  skipAuth?: boolean;
};

export type ZomyraBaseQuery = BaseQueryFn<
  string | FetchArgs,
  unknown,
  ApiError,
  ZomyraExtraOptions
>;

const httpBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  prepareHeaders: async (headers) => {
    headers.set(HEADER_APP_VERSION, APP_VERSION);
    headers.set(HEADER_BUNDLE_UPDATE_ID, BUNDLE_UPDATE_ID);
    // Do not set Content-Type here: multipart uploads (API-8, API-11) pass a
    // FormData body, and fetch must be left to generate its own boundary.
    await loadTokens();
    const token = peekAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  },
});

const transport: BaseQueryFn<string | FetchArgs, unknown, unknown, ZomyraExtraOptions> =
  USE_API_MOCKS ? mockBaseQuery : httpBaseQuery;

/**
 * The single in-flight refresh promise.
 *
 * The refresh token is single-use and rotating (BE TDD §9.2): every successful
 * `POST /auth/refresh` revokes the token that was presented. So if two requests
 * 401 at the same moment and each fires its own refresh, the second arrives
 * with a token the first already rotated away and comes back
 * `refresh_token_invalid` — which forces a logout on a session that was
 * perfectly healthy. Worse, the backend treats a replayed refresh token as
 * possible theft (§9.2 phase D), so the spurious call looks like an attack.
 *
 * Every 401 therefore awaits *this* promise rather than starting its own. It is
 * module-scoped rather than per-request state on purpose — there is exactly one
 * session per app instance.
 */
let refreshInFlight: Promise<boolean> | null = null;

type RefreshResponse = { accessToken: string; refreshToken: string };

async function performRefresh(
  api: Parameters<ZomyraBaseQuery>[1],
  extraOptions: ZomyraExtraOptions,
): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;

  const result = await transport(
    { url: "/auth/refresh", method: "POST", body: { refreshToken } },
    api,
    { ...extraOptions, skipAuth: true },
  );

  const data = result.data as RefreshResponse | undefined;
  if (!data?.accessToken || !data?.refreshToken) return false;

  await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return true;
}

function refreshOnce(
  api: Parameters<ZomyraBaseQuery>[1],
  extraOptions: ZomyraExtraOptions,
): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh(api, extraOptions).finally(() => {
      // Cleared so the *next* 401 starts a fresh attempt. Callers already hold
      // the promise, so clearing the slot cannot strand anyone mid-await.
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function requestIdOf(meta: unknown): string | undefined {
  const response = (meta as { response?: Response } | undefined)?.response;
  return response?.headers?.get(HEADER_REQUEST_ID) ?? undefined;
}

/**
 * The three codes BE v1.6 §9.9 returns for a non-active account.
 *
 * They are listed together and never distinguished: FE §8.1 specifies one
 * undifferentiated blocker, so the only thing this layer reads off them is
 * *that* the account is blocked.
 */
const ACCOUNT_BLOCKED_CODES: readonly ApiErrorCode[] = [
  "account_suspended",
  "account_banned",
  "account_deleted",
];

const baseQueryWithReauth: ZomyraBaseQuery = async (args, api, extraOptions) => {
  const options = extraOptions ?? {};
  let result = await transport(args, api, options);

  if (result.error && (result.error as { status?: unknown }).status === 401 && !options.skipAuth) {
    const refreshed = await refreshOnce(api, options);
    if (refreshed) {
      result = await transport(args, api, options);
    } else {
      // NFR-15's force-logout path. Clearing the keychain and telling the store
      // is all this layer does — where that sends the user is Module 3's root
      // gate, not a decision for the network layer.
      await clearTokens();
      api.dispatch(sessionExpired());
    }
  }

  if (result.error) {
    const error = normalizeError(result.error, requestIdOf(result.meta));

    /*
     * Account-status enforcement (BE v1.6 §9.9, FE v1.45 §8.1).
     *
     * This sits beside the 401 branch above rather than inside it, and the
     * distinction is the whole point: a 401 means the *credential* failed and
     * refreshing may fix it, whereas a 403 `account_*` means the credential is
     * perfectly good and the *account* is gated. Routing it into the refresh
     * path would burn a refresh token to be told the same thing again.
     *
     * It is handled here rather than at the gate because enforcement is
     * **request-level**: every authenticated endpoint except `GET /me` and
     * `POST /auth/refresh` returns it, so it can arrive on any call at any
     * point in a session — the user may be mid-chat when an admin suspends the
     * account. The two exemptions exist so a blocked client can still discover
     * why, which is exactly what the root gate uses.
     *
     * As with `sessionExpired` above, this layer only reports the fact. Where
     * it sends the user is `SessionRouter`'s decision, not the network's — the
     * base query cannot import a route without knowing about navigation.
     */
    if (error.status === 403 && ACCOUNT_BLOCKED_CODES.includes(error.code)) {
      api.dispatch(accountBlocked());
    }

    return { error };
  }
  return { data: result.data, meta: result.meta as Record<string, unknown> | undefined };
};

/**
 * `retry` re-invokes the wrapped query, so a retried request re-runs the auth
 * layer and picks up a token refreshed by an earlier attempt.
 *
 * `retryCondition` deliberately reuses {@link isRetryable}: a 4xx means the
 * request was rejected on its merits and will be rejected identically next
 * time, so retrying only delays the error state the user needs to see.
 */
export const baseQuery = retry(baseQueryWithReauth, {
  // `maxRetries` and `retryCondition` are mutually exclusive in RTK's own
  // types, and the condition wins: it reads the per-endpoint budget out of
  // `extraOptions`, defaulting to none.
  retryCondition: (error, _args, { attempt, extraOptions }) => {
    const max = (extraOptions as ZomyraExtraOptions | undefined)?.maxRetries ?? 0;
    if (attempt > max) return false;
    return isRetryable(error as ApiError);
  },
}) as ZomyraBaseQuery;
