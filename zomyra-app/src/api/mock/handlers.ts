/**
 * Mock responses, keyed by `METHOD /path` exactly as FE TDD §9 names them.
 *
 * These sit **behind** the base query, not in place of it — every request still
 * goes through auth, refresh, error normalisation and retry before reaching
 * here (see `src/api/base-query.ts`). What they replace is the host, and only
 * the host, which is why O-8's real base URL is a `.env` change.
 *
 * They return the *envelope* shapes from the TDD, including the error envelope
 * `{ error: { code, message, details? } }`, so nothing above this layer can
 * accidentally depend on a shape the real backend does not produce.
 */
import { MOCK_GOOGLE_ID_TOKEN } from "@/src/auth/google";
import { MOCK_PROFILES } from "@/src/lib/discover/mock";

import type { DiscoverFeedResponse } from "../contract";
import {
  accountByUserId,
  googleIdentity,
  meResponse,
  phoneIdentity,
  resolveAccount,
} from "./accounts";
import { issueSession, isAccessTokenValid, currentUserId, rotateSession } from "./session";

export type MockRequest = {
  method: string;
  /** Path with `/v1` and the query string already stripped. */
  path: string;
  query: URLSearchParams;
  body: unknown;
  /** Bearer token presented, if any. */
  token?: string;
};

export type MockResponse =
  | { ok: true; data: unknown }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      details?: unknown;
      /**
       * Emitted **beside** `code` in the envelope rather than inside `details`.
       * Handlers deliberately use both spellings — see the note in `index.ts`.
       */
      retryAfterSeconds?: number;
    };

const fail = (
  status: number,
  code: string,
  message: string,
  details?: unknown,
): MockResponse => ({ ok: false, status, code, message, details });

/** `rate_limited` / `too_many_attempts`, with the retry hint as a sibling of `code`. */
const failRateLimited = (
  status: number,
  code: string,
  message: string,
  retryAfterSeconds: number,
): MockResponse => ({ ok: false, status, code, message, retryAfterSeconds });

const UNAUTHORIZED = fail(401, "unauthorized", "Your session has expired.");

/** Endpoints reachable without a bearer token (FE TDD §9.1). */
const PUBLIC_PATHS = new Set([
  "/auth/otp/request",
  "/auth/otp/verify",
  "/auth/google",
  "/auth/refresh",
  "/app/version-check",
]);

type Handler = (req: MockRequest) => MockResponse;

const handlers: Record<string, Handler> = {
  // ---- API-1 · POST /auth/otp/request -------------------------------------
  // Two reserved numbers make §9.1's other negative paths reachable, since the
  // real endpoint is `404` on staging (behind LLP/DLT registration — O-8):
  //   9111111111 → `429 rate_limited` with `retryAfterSeconds`
  //   9222222222 → `502 sms_delivery_failed`
  "POST /auth/otp/request": (req) => {
    const { phoneNumber } = (req.body ?? {}) as { phoneNumber?: string };
    if (!phoneNumber || phoneNumber.replace(/\D/g, "").length < 6) {
      return fail(400, "invalid_phone_number", "That number doesn't look right.");
    }
    if (phoneNumber === "9111111111") {
      return failRateLimited(429, "rate_limited", "Too many requests for this number.", 45);
    }
    if (phoneNumber === "9222222222") {
      return fail(502, "sms_delivery_failed", "We couldn't send the code. Please try again.");
    }
    return { ok: true, data: { otpSent: true, resendCooldownSeconds: 30 } };
  },

  // ---- API-2 · POST /auth/otp/verify --------------------------------------
  // The prototype accepted any 6 digits and this keeps that, so the OTP screen
  // behaves identically — but the rejection is now a real `400 invalid_otp`
  // travelling through the error envelope rather than a thrown Error.
  //
  // Two reserved codes make the other two negative paths reachable without a
  // backend, which is the whole reason Module 4 could write them at all
  // (API-2 is `404` on staging, behind LLP/DLT — MIGRATION §4, O-8):
  //   000000 → `400 otp_expired`
  //   111111 → `429 too_many_attempts` with the 15-minute `retryAfterSeconds`
  //            BE §14.1 specifies
  // Any other six digits succeed. `isNewAccount` comes from the account
  // directory, so FR-1a has both branches (see `accounts.ts`).
  "POST /auth/otp/verify": (req) => {
    const { otp, phoneNumber } = (req.body ?? {}) as { otp?: string; phoneNumber?: string };
    if (!otp || !/^\d{6}$/.test(otp)) {
      return fail(400, "invalid_otp", "That code isn't right. Check and try again.");
    }
    if (otp === "000000") {
      return fail(400, "otp_expired", "That code has expired. Request a new one.");
    }
    if (otp === "111111") {
      return fail(429, "too_many_attempts", "Too many attempts. Try again later.", {
        retryAfterSeconds: 900,
      });
    }
    const { account, isNewAccount } = resolveAccount(phoneIdentity(phoneNumber ?? "unknown"));
    const tokens = issueSession(account.userId);
    return {
      ok: true,
      data: { ...tokens, isNewAccount, profileComplete: account.profileComplete },
    };
  },

  // ---- API-3 · POST /auth/google -------------------------------------------
  // The real endpoint is **deployed and validating** as of 2026-08-03 — a bogus
  // token gets `401 invalid_google_token` where it got `503` a day earlier — so
  // unlike API-1/API-2 this mock has a live counterpart to be faithful to, and
  // it rejects anything that is not the token `src/auth/google.ts` mints in
  // mock mode with exactly that code.
  //
  // The Google identity is deliberately **not** derived from any phone number:
  // API-3's note makes phone and Google fully independent identities with no
  // linking, so signing in with Google after signing up by phone must produce a
  // second account here, exactly as it will in production.
  "POST /auth/google": (req) => {
    const { idToken } = (req.body ?? {}) as { idToken?: string };
    if (idToken !== MOCK_GOOGLE_ID_TOKEN) {
      return fail(401, "invalid_google_token", "Google sign-in failed. Please try again.");
    }
    const { account, isNewAccount } = resolveAccount(googleIdentity("mock-google-user"));
    const tokens = issueSession(account.userId);
    return {
      ok: true,
      data: { ...tokens, isNewAccount, profileComplete: account.profileComplete },
    };
  },

  // ---- API-4 · POST /auth/refresh -----------------------------------------
  "POST /auth/refresh": (req) => {
    const { refreshToken } = (req.body ?? {}) as { refreshToken?: string };
    const rotated = rotateSession(refreshToken ?? "");
    if (!rotated.ok) {
      return fail(401, "refresh_token_invalid", "Please sign in again.");
    }
    return {
      ok: true,
      data: { accessToken: rotated.accessToken, refreshToken: rotated.refreshToken },
    };
  },

  // ---- API-5 · GET /app/version-check --------------------------------------
  // Matches what staging really returns, checked on 2026-08-02: the store URL
  // is per-platform, and `invalid_platform` (400) is the response to a missing
  // or unrecognised `?platform=`. Module 3 replaced a hardcoded empty
  // `updateUrl` here, which made FR-30's store button untestable — the gate
  // hides the button rather than shipping one that goes nowhere.
  "GET /app/version-check": (req) => {
    const platform = req.query.get("platform");
    if (platform !== "ios" && platform !== "android") {
      return fail(400, "invalid_platform", "platform must be one of: ios, android");
    }
    return {
      ok: true,
      data: {
        minSupportedVersion: "1.0.0",
        latestVersion: "1.0.0",
        forceUpdate: false,
        updateUrl:
          platform === "ios"
            ? "https://apps.apple.com/app/id0000000000"
            : "https://play.google.com/store/apps/details?id=com.zomyra.app",
      },
    };
  },

  // ---- API-6 · GET /me ------------------------------------------------------
  // The routing table in FE TDD §9.1 reads off exactly these fields.
  //
  // Module 4 replaced the hardcoded incomplete account with a projection of the
  // signed-in record, so `/discover`, `/onboarding` and the verification rows
  // are all reachable by *signing in as someone*, rather than by editing this
  // file — which a `preview` build cannot do, since its bundle is baked at
  // build time. `accounts.ts` says which identity gets what.
  "GET /me": () => ({
    ok: true,
    data: meResponse(accountByUserId(currentUserId() ?? "mock-user")),
  }),

  // ---- API-34 · GET /counts -------------------------------------------------
  "GET /counts": () => ({
    ok: true,
    data: { pendingRequestsCount: 0, unreadMessagesCount: 0 },
  }),

  // ---- API-12 · GET /discover ----------------------------------------------
  // Cursor pagination is real here rather than returning everything at once:
  // §3 records the prototype loading all mocks in one go and cycling them
  // modulo, which is precisely the habit Module 7 has to unlearn.
  "GET /discover": (req) => {
    const limit = Number(req.query.get("limit") ?? 10) || 10;
    const start = Number(req.query.get("cursor") ?? 0) || 0;
    const page = MOCK_PROFILES.slice(start, start + limit);
    const end = start + page.length;
    const hasMore = end < MOCK_PROFILES.length;
    const response: DiscoverFeedResponse = {
      profiles: page,
      nextCursor: hasMore ? String(end) : null,
      hasMore,
    };
    return { ok: true, data: response };
  },

  // ---- API-11 · POST /verification/submit ----------------------------------
  // Returns `verified` so the happy path is walkable. The other two outcomes
  // (`mismatch`, and the `pending` case that must NOT offer manual retry) are
  // reachable by editing this one line — Module 6 owns exercising all three.
  "POST /verification/submit": () => ({ ok: true, data: { status: "verified" } }),
};

export function handleMockRequest(req: MockRequest): MockResponse {
  const handler = handlers[`${req.method} ${req.path}`];
  if (!handler) {
    return fail(
      404,
      "unknown_error",
      `No mock for ${req.method} ${req.path}. Add one in src/api/mock/handlers.ts.`,
    );
  }
  if (!PUBLIC_PATHS.has(req.path) && !isAccessTokenValid(req.token)) {
    return UNAUTHORIZED;
  }
  return handler(req);
}
