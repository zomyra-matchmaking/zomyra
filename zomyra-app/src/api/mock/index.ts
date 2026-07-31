/**
 * A `BaseQueryFn` that answers from `handlers.ts` instead of a network host.
 *
 * It matches `fetchBaseQuery`'s signature and result shape exactly — including
 * `{ error: { status, data } }` for failures — so `base-query.ts` cannot tell
 * the two apart, and neither can anything above it. That equivalence is the
 * whole design: the transport is the only thing mocked, so the auth, refresh,
 * error and retry behaviour exercised in development is the same code that runs
 * against staging.
 */
import type { BaseQueryFn, FetchArgs } from "@reduxjs/toolkit/query/react";

import { loadTokens, peekAccessToken } from "@/src/auth/tokens";
import { API_VERSION_PREFIX } from "@/src/config/env";

import { handleMockRequest, type MockRequest } from "./handlers";

/** Enough to feel like a network without slowing development down. */
const MOCK_LATENCY_MS = 250;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function toRequest(args: string | FetchArgs, token?: string): MockRequest {
  const raw = typeof args === "string" ? { url: args } : args;
  const [rawPath, rawQuery = ""] = raw.url.split("?");
  const query = new URLSearchParams(rawQuery);

  if (typeof raw !== "string" && raw.params) {
    for (const [key, value] of Object.entries(raw.params)) {
      if (value !== undefined && value !== null) query.set(key, String(value));
    }
  }

  const path = rawPath.startsWith(API_VERSION_PREFIX)
    ? rawPath.slice(API_VERSION_PREFIX.length)
    : rawPath;

  return {
    method: (typeof raw === "string" ? "GET" : (raw.method ?? "GET")).toUpperCase(),
    path: path.replace(/\/+$/, "") || "/",
    query,
    body: typeof raw === "string" ? undefined : raw.body,
    token,
  };
}

export const mockBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  unknown,
  { skipAuth?: boolean }
> = async (args, _api, _extraOptions) => {
  // Read the token the same way the real `prepareHeaders` does, so a mocked
  // request is authenticated (or not) on identical grounds.
  await loadTokens();

  await delay(MOCK_LATENCY_MS);
  const result = handleMockRequest(toRequest(args, peekAccessToken()));

  if (result.ok) return { data: result.data };
  return {
    error: {
      status: result.status,
      data: {
        error: { code: result.code, message: result.message, details: result.details },
      },
    },
  };
};

export { expireAccessToken, clearSession } from "./session";
