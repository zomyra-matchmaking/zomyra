/**
 * ⚠️ **Provisional types, and the thing O-11 exists to replace.**
 *
 * Every type here was transcribed by hand from FE TDD §9 and BE TDD §14 — two
 * documents that describe their own field names as *"illustrative, not
 * finalized"*. Both sides of this project are being built from them in
 * parallel, so divergence is expected rather than hypothetical: O-16 (the
 * backend having no `state` field, which will 400 Module 5's onboarding
 * submit) was found by diffing Word documents, and there is no reason to
 * believe it is the last one.
 *
 * **The fix is codegen, not vigilance.** Once the backend serves its OpenAPI
 * schema (O-8), `yarn api:generate` replaces this file's types with generated
 * ones and drift becomes a compile error instead of a runtime 400. See
 * `openapi-config.ts` and MIGRATION §4 (O-11).
 *
 * Until then, treat a mismatch between this file and the running backend as
 * this file being wrong.
 *
 * Note on `state` (O-16): it is **absent** from `OnboardingSubmitRequest` and
 * `ProfileResponse` below, matching Backend TDD v1.2 as it stands. That is
 * correct and deliberate. FE TDD v1.40 adds it, Module 5 owns it (§12.1), and
 * hand-patching it in here would produce types that compile against a backend
 * that rejects them.
 */
import type { DiscoverProfile } from "@/src/lib/discover/mock";

// ---------------------------------------------------------------------------
// Auth & session — FE TDD §9.1 / BE TDD §14.1
// ---------------------------------------------------------------------------

/** API-1 request. `countryCode` carries the `+`, e.g. `"+91"`. */
export type OtpRequestBody = { phoneNumber: string; countryCode: string };
export type OtpRequestResponse = { otpSent: boolean; resendCooldownSeconds: number };

/** API-2 request. */
export type OtpVerifyBody = { phoneNumber: string; countryCode: string; otp: string };

export type AuthTokens = { accessToken: string; refreshToken: string };

/** API-2 / API-3 response. */
export type AuthSessionResponse = AuthTokens & {
  isNewAccount: boolean;
  profileComplete: boolean;
};

/** API-4 response — both tokens rotate (BE TDD §9.2). */
export type RefreshResponse = AuthTokens;

/** API-5 response. Fails open on network error; never blocks a launch. */
export type VersionCheckResponse = {
  minSupportedVersion: string;
  latestVersion: string;
  forceUpdate: boolean;
  updateUrl: string;
};

export type VerificationStatus = "unverified" | "pending" | "mismatch" | "verified";
export type AccountStatus = "active" | "suspended" | "banned";

/**
 * API-6 response — the routing table in FE TDD §9.1 is computed from these
 * fields, which is why the root gate (Module 3) needs nothing else.
 *
 * `accountStatus` is O-4: the backend returns `suspended` and `banned`, and the
 * frontend routing table defines no destination for either.
 */
export type MeResponse = {
  userId: string;
  profileComplete: boolean;
  verificationStatus: VerificationStatus;
  isPremium: boolean;
  discoveryMode: DiscoveryMode | null;
  firstName: string;
  accountStatus: AccountStatus;
};

/**
 * FE TDD §9.5 / §9.9.
 *
 * ⚠️ Drift the prototype already carries: `src/lib/discover/mock.ts` declares
 * `CompatibilityDimension` as `all | lifestyle | personality | priorities`,
 * which is neither TDD's spelling. Modules 5 and 7 own reconciling the two —
 * flagged in `docs/CONTRACT-QUESTIONS.md`.
 */
export type DiscoveryMode = "all" | "compatibility" | "lifestyle" | "marriage_goals";

// ---------------------------------------------------------------------------
// Profile — FE TDD §9.9 / BE TDD §14.10
// ---------------------------------------------------------------------------

/** API-23 response — the full onboarding record, for Edit Profile to populate. */
export type ProfileResponse = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  city: string;
  heightCm: number;
  build: string;
  education: string;
  profession: string;
  incomeRange: string;
  religion: string;
  languages: string[];
  diet: string;
  drinking: string;
  smoking: string;
  familyType: string;
  bio: string;
  photos: ProfilePhoto[];
  discoveryMode: DiscoveryMode | null;
  compatibilityQuizAnswers: QuizAnswer[];
};

/** `photoId` is the stable `cacheKey` for expo-image (NFR-14), not the URL. */
export type ProfilePhoto = { photoId: string; url: string; promptSlot: string };

export type QuizAnswer = { questionId: string; sliderValue: number };

// ---------------------------------------------------------------------------
// Discover — FE TDD §9.5
// ---------------------------------------------------------------------------

/**
 * API-12 response.
 *
 * ⚠️ **Known shape drift, deliberately left visible.** FE TDD §9.5 defines a
 * card as `{ id, name, age, city, heroPhotoUrl, excellentMatch, matchReasons }`
 * — considerably thinner than the prototype's `DiscoverProfile`, which the
 * Discover screen renders today (gallery, facts, per-dimension scores). Typing
 * this as the thin shape now would break a working screen for no benefit,
 * since Module 7 rewrites Discover against the real contract anyway.
 *
 * The pagination envelope, however, is the real one — `nextCursor` / `hasMore`
 * cursor pagination, which the prototype had none of.
 */
export type DiscoverFeedResponse = {
  profiles: DiscoverProfile[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type DiscoverFeedQuery = {
  mode?: DiscoveryMode;
  cursor?: string | null;
  limit?: number;
};

// ---------------------------------------------------------------------------
// Verification — FE TDD §9.4
// ---------------------------------------------------------------------------

/**
 * API-11 response. All three are **200s** — a rejection here is a business
 * outcome, not an HTTP error. See `verificationOutcome()` for why `pending`
 * must not be treated as a failure.
 */
export type VerificationSubmitResponse = { status: "verified" | "mismatch" | "pending" };

// ---------------------------------------------------------------------------
// App-shell counts — FE TDD §9.13
// ---------------------------------------------------------------------------

export type CountsResponse = { pendingRequestsCount: number; unreadMessagesCount: number };
