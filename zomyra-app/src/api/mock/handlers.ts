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

import type { DiscoverFeedResponse, OnboardingSubmitBody } from "../contract";
import {
  accountByUserId,
  completeOnboarding,
  googleIdentity,
  meResponse,
  phoneIdentity,
  recordConsent,
  resolveAccount,
} from "./accounts";
import { CATALOGUE, CITIES_BY_STATE } from "./catalogue";
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

/**
 * The `plot` keys API-7 rejects a submit without.
 *
 * `bio` is absent deliberately — FE §9.2 lists it in the body but the screen
 * treats it as optional (`canNext: true` with an empty field), and a mock that
 * demanded it would make a legitimate submit fail. `languages` is checked
 * separately because an empty *array* is falsy-adjacent rather than falsy.
 */
const REQUIRED_PLOT_KEYS = [
  "firstName",
  "lastName",
  "dateOfBirth",
  "gender",
  "build",
  "education",
  "profession",
  "incomeRange",
  "religion",
  "diet",
  "drinking",
  "smoking",
  // Required by the owner's decision of 2026-08-05, ahead of the backend
  // carrying it — see `OnboardingPlot.fitness`.
  "fitness",
  "familyType",
  "cityId",
  "heightCm",
] as const satisfies readonly (keyof import("../contract").OnboardingPlot)[];

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

  // ---- API-40 · POST /consents ----------------------------------------------
  // Append-only server-side (BE §6.1 `user_consents`), and the mock models that
  // rather than flipping a flag: it pushes onto the account's array, so the
  // *next* `GET /me` reports the consent and `resolveRootDestination` stops
  // returning `/consent`. That round trip is the behaviour under test — a mock
  // that mutated nothing would let the screen navigate on a lie.
  "POST /consents": (req) => {
    const { consentType, version, platform } = (req.body ?? {}) as {
      consentType?: string;
      version?: number;
      platform?: string;
    };
    if (
      (consentType !== "sensitive_data" && consentType !== "biometric") ||
      typeof version !== "number"
    ) {
      return fail(400, "validation_error", "consentType and version are required.");
    }
    // Stricter than staging will be on day one (the backend accepts it as
    // optional for one deploy so existing installs keep working), and
    // deliberately so: this mock's job is to catch a client that stopped
    // sending the field, not to be lenient in the same places the server is.
    if (platform !== "ios" && platform !== "android") {
      return fail(400, "validation_error", "platform must be 'ios' or 'android'.");
    }
    const acceptedAt = new Date().toISOString();
    recordConsent(currentUserId() ?? "mock-user", { consentType, version, acceptedAt });
    return { ok: true, data: { recorded: true, acceptedAt } };
  },

  // ---- API-39 · GET /onboarding/options ------------------------------------
  // The catalogue is served whole, in the wire shape FE §9.2 specifies, so the
  // client's indexing (`use-onboarding-options.ts`) is exercised rather than
  // bypassed by a mock that returns the convenient shape.
  //
  // Copied on the way out for the reason `meResponse` documents at length: a
  // mock never hands a caller a live reference to its own storage, and Immer
  // freezes whatever lands in the RTK Query cache.
  "GET /onboarding/options": () => ({
    ok: true,
    data: { categories: CATALOGUE.map((c) => ({ key: c.key, values: [...c.values] })) },
  }),

  // ---- API-38 · GET /locations/cities --------------------------------------
  // `?state=` is **required**, and an unknown key is `400 invalid_state` rather
  // than an empty list — FE §9.2 specifies both, and they are different bugs on
  // the client side: an empty list is a state with no cities yet (O-15's
  // curation gap), a 400 is a client sending a key it invented.
  "GET /locations/cities": (req) => {
    const state = req.query.get("state");
    if (!state) {
      return fail(400, "invalid_state", "state is required.");
    }
    const cities = CITIES_BY_STATE[state];
    if (!cities) {
      return fail(400, "invalid_state", `Unrecognized state key: ${state}`);
    }
    return { ok: true, data: { cities: [...cities] } };
  },

  // ---- API-7 · POST /onboarding/submit -------------------------------------
  // Validates the two things the client can actually get wrong and that no
  // type catches, then **flips `profileComplete` on the account record** — the
  // round trip is the behaviour under test, exactly as with API-40. Without it
  // the `Me` invalidation would refetch an unchanged `/me` and §9.1 would send
  // the user straight back into onboarding, which is what a submit that
  // silently did nothing would look like.
  //
  //   · `409 already_submitted` — a stale draft resubmitted after finishing
  //     elsewhere. Reachable by submitting twice, which is the only way to walk
  //     the client's clear-draft-and-reroute path.
  //   · `400 validation_error` — the `languages` / `languagesOther` coupling,
  //     in **both** directions, and missing required keys. FE §9.2 spells the
  //     coupling out; it is the one invariant the client must enforce before
  //     sending, so the mock has to be able to catch it failing to.
  "POST /onboarding/submit": (req) => {
    const account = accountByUserId(currentUserId() ?? "mock-user");
    if (account.profileComplete) {
      return fail(409, "already_submitted", "Onboarding has already been completed.");
    }

    const body = (req.body ?? {}) as Partial<OnboardingSubmitBody>;
    const { plot, anchor, love } = body;
    if (!plot || !anchor || !love) {
      return fail(400, "validation_error", "plot, anchor and love are required.", {
        errors: (["plot", "anchor", "love"] as const)
          .filter((k) => !body[k])
          .map((field) => ({ field, message: "Required." })),
      });
    }

    const hasOtherLanguage = (plot.languages ?? []).includes("other");
    const hasOtherText = Boolean(plot.languagesOther?.trim());
    if (hasOtherLanguage !== hasOtherText) {
      return fail(400, "validation_error", "languages and languagesOther disagree.", {
        errors: [
          {
            field: "languagesOther",
            message: hasOtherLanguage
              ? '"other" was selected but no free text was sent.'
              : 'Free text was sent without the "other" key.',
          },
        ],
      });
    }

    const missing = REQUIRED_PLOT_KEYS.filter((k) => !plot[k]);
    if (missing.length > 0 || (plot.languages ?? []).length === 0) {
      return fail(400, "validation_error", "One or more fields are missing or invalid.", {
        errors: [
          ...missing.map((field) => ({ field, message: "Required." })),
          ...((plot.languages ?? []).length === 0
            ? [{ field: "languages", message: "Pick at least one." }]
            : []),
        ],
      });
    }

    /*
     * The age bounds staging enforces, mirrored here.
     *
     * This block exists because its absence let a real bug reach staging: the
     * client sent `anchor.partnerAgeRange: { min, max }` for the whole of
     * Module 5 and the mock never looked at `anchor`, so nothing failed until
     * the first live submit returned `400 anchor.property partnerAgeRange
     * should not exist`. Checking the *shape* is the point — the values were
     * never wrong.
     */
    const { partnerAgeMin, partnerAgeMax } = anchor;
    const ageErrors = (
      [
        ["partnerAgeMin", partnerAgeMin],
        ["partnerAgeMax", partnerAgeMax],
      ] as const
    )
      .filter(([, v]) => !Number.isInteger(v) || v < 21 || v > 100)
      .map(([field]) => ({ field, message: "Must be an integer between 21 and 100." }));
    if (ageErrors.length > 0) {
      return fail(400, "validation_error", "Partner age range is missing or invalid.", {
        errors: ageErrors,
      });
    }

    completeOnboarding(account.userId);
    return { ok: true, data: { profileComplete: true } };
  },

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
