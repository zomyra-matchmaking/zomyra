/**
 * ⚠️ **Provisional types, and the thing O-11 exists to replace.**
 *
 * Every type here was transcribed by hand from FE TDD §9 and BE TDD §14 — two
 * documents that describe their own field names as *"illustrative, not
 * finalized"*. Both sides of this project are being built from them in
 * parallel, so divergence is expected rather than hypothetical: O-16 was found
 * by diffing Word documents, and there is no reason to believe it is the last
 * one.
 *
 * **The fix is codegen, not vigilance.** Once the backend serves its OpenAPI
 * schema (O-8), `yarn api:generate` replaces this file's types with generated
 * ones and drift becomes a compile error instead of a runtime 400. See
 * `openapi-config.ts` and MIGRATION §4 (O-11).
 *
 * Until then, treat a mismatch between this file and the running backend as
 * this file being wrong.
 *
 * **Location (O-16, now closed — MIGRATION §12.2).** An earlier revision of this
 * file said `state` was deliberately absent pending a backend change. That is
 * no longer the situation, and the resolution went the other way: there is **no
 * `state` column on the profile and `state` is never submitted.** The backend's
 * pre-existing `cities` table is exposed via **API-38 `GET /locations/cities`**,
 * onboarding submits a **`cityId`**, and `/profile/me` returns
 * `cityId, cityName, state` with the last two denormalized via join for display
 * only. `state` filters the cached city list client-side and nothing more.
 *
 * This file is **two endpoints short of the contract** — API-38
 * (`GET /locations/cities?state=`) and API-39 (`GET /onboarding/options`) have
 * no definitions here. Both belong to **Module 5**, which fetches and consumes
 * them; see the note in `api.ts` beside the `Locations` tag for the cache
 * decisions they carry.
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
/**
 * `deleted` is reachable, and omitting it was a real gap (FE v1.45 §8.1,
 * BE v1.6 §9.9): FR-28's soft-delete sets the status immediately but does not
 * revoke tokens until the hard-delete purge after the grace window, so a
 * soft-deleted account still authenticates during it.
 */
export type AccountStatus = "active" | "suspended" | "banned" | "deleted";

/**
 * API-6 response — the routing table in FE TDD §9.1 is computed from these
 * fields, which is why the root gate (Module 3) needs nothing else.
 *
 * **O-4 is closed (FE v1.45 / BE v1.6 — MIGRATION §12.4).** `accountStatus` is
 * checked **first**, before `profileComplete` / `verificationStatus` /
 * `discoveryMode` are looked at at all. Any non-`active` value routes to one
 * static, non-dismissible blocker — no retry, no appeal link, and deliberately
 * **no distinction between the three causes**. The backend returns distinct
 * codes (`account_suspended` / `account_banned` / `account_deleted`) for
 * support diagnostics only; nothing in the client branches on which.
 *
 * **The matching runtime concern is Module 3's**: BE §9.9 now rejects
 * non-active accounts with `403` on *every* authenticated endpoint except this
 * one and `POST /auth/refresh` — both exempt precisely so the client can still
 * discover why it is blocked. So a 403 with an `account_*` code can surface on
 * any call, not just at the gate, and needs handling in `base-query.ts` once
 * there is a blocker route to send it to.
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
 *
 * ⚠️ **Keep this a union — do not widen it to `string` with the others.**
 * FR-3b makes every other choice list backend-driven, and FR-15 does say these
 * four labels come from the same API-39 catalogue, which reads like an
 * instruction to loosen the type. It is not: FR-15 states outright that this is
 * *"cosmetic consistency, not admin flexibility — the four modes are
 * structurally wired into the matching engine's sub-scores, so adding a fifth
 * would need new backend scoring logic regardless of this catalogue."* The
 * catalogue supplies the **labels**; the **keys** are a fixed contract.
 */
export type DiscoveryMode = "all" | "compatibility" | "lifestyle" | "marriage_goals";

// ---------------------------------------------------------------------------
// Profile — FE TDD §9.9 / BE TDD §14.10
// ---------------------------------------------------------------------------

/**
 * API-23 response — the full onboarding record, for Edit Profile to populate.
 *
 * ⚠️ **A semantic change with no type change (FR-3b, BE v1.5 §14.10).** `gender`,
 * `build`, `education`, `profession`, `incomeRange`, `religion`, `languages`,
 * `diet`, `drinking`, `smoking` and `familyType` are now **catalogue keys**
 * (`"swe"`), not display labels (`"Software Engineer"`). They were already
 * `string`, so nothing here fails to compile — which is exactly why it is worth
 * writing down. Edit Profile must resolve each key to a label through API-39's
 * catalogue rather than rendering the raw value.
 */
export type ProfileResponse = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  /** FK → the backend's `cities` table. The only location value ever *sent*. */
  cityId: string;
  /** Denormalized via join for display / pre-fill. Not independently editable. */
  cityName: string;
  /** Denormalized likewise. Filters the cached city list; never submitted. */
  state: string;
  heightCm: number;
  build: string;
  education: string;
  profession: string;
  incomeRange: string;
  religion: string;
  languages: string[];
  /**
   * Free text captured when `languages` contains the `other` key (FR-3b;
   * FE v1.45 API-7/API-23, BE v1.6 stores it as `user_languages.other_text`).
   *
   * The one place a free-text value survives the catalogue-driven set. Absent
   * or empty unless `other` was actually selected.
   */
  languagesOther?: string;
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
