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
 * **Module 5 closed the two-endpoint gap** an earlier revision of this note
 * described: API-38 (`GET /locations/cities?state=`), API-39
 * (`GET /onboarding/options`) and API-7 (`POST /onboarding/submit`) are all
 * defined below. See the note in `api.ts` beside the `Locations` tag for the
 * cache decisions the first two carry.
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

/**
 * API-3 request. The `idToken` comes from the Google Sign-In SDK
 * (`src/auth/google.ts`) and is the *only* field — no `serverAuthCode`, no
 * access token, no profile.
 */
export type GoogleAuthBody = { idToken: string };

export type AuthTokens = { accessToken: string; refreshToken: string };

/**
 * API-2 / API-3 response.
 *
 * ⚠️ **These two fields are not enough to route on, and that is the point.**
 * FR-1a reads as "existing account → Discover, new account → Onboarding", but
 * §9.1's table needs `verificationStatus` and `discoveryMode` as well, and
 * neither is here. An existing account can be mid-verification or yet to pick a
 * Discovery Mode, so branching on `profileComplete` at the auth screen would
 * send a returning user to Discover that the tabs guard then bounces. Both auth
 * screens therefore route to `/`, and `resolveRootDestination` answers from
 * `GET /me`. See `src/lib/root-route.ts`.
 *
 * ⚠️ **`isNewAccount` is currently consumed by nothing, and that is deliberate —
 * do not wire it up.** It is the obvious trigger for FR-2a's one-time consent
 * screen, and it is the wrong one: FR-2a lets the user *decline*, which returns
 * them to Welcome with the account already created. Sign in again and the flag
 * reads `false`, so a client keyed on it would skip the notice and start
 * collecting religion and income from someone who had explicitly refused. Since
 * FE v1.46 the gate keys on **`GET /me`'s `consents` array** (API-40) instead,
 * which cannot be defeated that way — a declined consent was never recorded, so
 * the array stays empty however many times the account is signed into.
 *
 * It stays on this type because **this file describes what the server sends**,
 * not what the client happens to read — API-2 and API-3 both return it (FE §9.1,
 * BE §14.1), and once O-11's schema is served and `yarn api:generate` replaces
 * these hand-written types, it comes back regardless. Deleting it would only
 * make the client's model of the response wrong.
 *
 * Anything that legitimately wants it — a `signup_started` vs `otp_verified`
 * analytics split (BE §17) is the plausible one — should take it from here.
 */
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
  /** API-40, added FE v1.46 / BE v1.7 — see `Consent` below. */
  consents: Consent[];
};

export type ConsentType = "sensitive_data" | "biometric";

/**
 * API-40's request body, as it goes on the wire.
 *
 * `platform` is not part of what a caller supplies — `src/api/endpoints/consent.ts`
 * adds it — but it *is* part of the contract, so it is typed here with the rest
 * of the wire shapes rather than beside the hook.
 *
 * ⚠️ **The backend must accept this field as optional for one deploy before
 * requiring it.** Making it required in the same release that adds it 400s every
 * client already installed, including the dev clients on both test devices.
 */
export type ConsentWireBody = {
  consentType: ConsentType;
  version: number;
  /** Matches `X-Client-Info`'s `p=` field; see `src/config/device.ts`. */
  platform: "ios" | "android";
};

/**
 * FE §9.1 / API-40 (FE v1.46, BE v1.7 §14.2b — MIGRATION §12.5).
 *
 * **The server is the source of truth for what has been accepted** — the client
 * reads this off `GET /me` rather than keeping its own local record, so a
 * reinstall or a resumed onboarding doesn't re-show a screen already accepted.
 *
 * One entry per `consentType`, carrying its **max** version. The underlying
 * table is append-only (BE §6.1 `user_consents`): every acceptance inserts a
 * row and nothing is ever updated in place, so this is a projection, not the
 * whole history.
 *
 * **The two types have different re-ask rules** — this is the part that is easy
 * to get wrong:
 * - `sensitive_data` (FR-2a) — recorded **once, never re-asked**. There is no
 *   repeat entry point into that screen.
 * - `biometric` (FR-11a) — re-asked and re-recorded **every time Verification
 *   is entered from a fresh Onboarding-stack-mount**, but **not** on an FR-12
 *   in-flow mismatch retry within the same continuous attempt, which stays
 *   covered by the acceptance just given.
 *
 * `version` is *the version of the consent text the client actually displayed*
 * — so the client cannot invent it. `SENSITIVE_DATA_CONSENT_VERSION` in
 * `src/lib/consent.ts` is that number for FR-2a, defined beside the copy it
 * describes. **O-20** is what is still open: who owns and approves that copy.
 */
export type Consent = {
  consentType: ConsentType;
  version: number;
  /** ISO 8601 timestamp. */
  acceptedAt: string;
};

/**
 * FE TDD §9.5 / §9.9.
 *
 * ✅ **The prototype's drift is closed (Module 5, 2026-08-05).**
 * `src/lib/discover/mock.ts` declared `CompatibilityDimension` independently as
 * `all | lifestyle | personality | priorities` — neither TDD's spelling, and
 * already propagated into the store, the FR-15a picker and Discover's labels.
 * It is now an **alias of this type**, so there is one declaration; the score
 * keys in the mock profiles were renamed to match. See the note there.
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
// Onboarding reference data — FE TDD §9.2 (API-38 / API-39), FR-3a / FR-3b
// ---------------------------------------------------------------------------

/**
 * One selectable value in API-39's catalogue, and the shape FR-3b is built on:
 * the client **stores and submits `key`** and **renders `label`**.
 *
 * The distinction is the whole requirement, and it is invisible at runtime
 * until something goes wrong — a client that submits the label gets
 * `400 validation_error` from API-7 with a message about an unknown enum, not
 * about having sent the wrong half of a pair.
 */
export type CatalogueOption = { key: string; label: string };

/**
 * API-39's category keys, as a closed union.
 *
 * ⚠️ **Closed on purpose, and it is the one place FR-3b's "the client hardcodes
 * nothing" is deliberately not followed.** The *values* inside each category are
 * fully backend-driven — that is FR-3b, and no value list appears anywhere in
 * this client. The *category names* are different in kind: each one is wired to
 * a specific question screen and a specific API-7 field, so a category the
 * client has never heard of has no screen to appear on and a missing one is a
 * question that cannot be rendered. Typing them means the second case is a
 * compile error rather than a silently empty option grid.
 *
 * `state` is here but is **never submitted** (O-16) — it scopes API-38 only.
 * `discoveryMode` is here because API-39 serves it, but it belongs to FR-15a's
 * picker, not to onboarding; see `DiscoveryMode`, whose *keys* stay a fixed
 * contract even though its labels come from this catalogue.
 */
export type OptionCategoryKey =
  // Plot (FR-3/FR-3b)
  | "gender"
  | "state"
  | "build"
  | "education"
  | "profession"
  | "incomeRange"
  | "religion"
  | "languages"
  | "diet"
  | "drinking"
  | "smoking"
  | "fitness"
  | "familyType"
  | "openToRelocation"
  // Anchor
  | "matchLocationPreference"
  | "childrenPreference"
  | "interfaithStance"
  | "smokingPartnerComfort"
  | "householdPreference"
  // FR-15 / FR-15a — labels only; the keys are fixed (see `DiscoveryMode`)
  | "discoveryMode";

/**
 * API-39 response — `{ categories: [{ key, values }] }`.
 *
 * Deliberately kept as the wire shape rather than normalised to a record here.
 * `selectFromResult` in `useOnboardingOptions` does the indexing, so the cache
 * holds exactly what the server sent and the transform is not baked into the
 * type — which matters when O-11's codegen eventually replaces this.
 */
export type OnboardingOptionsResponse = {
  categories: { key: OptionCategoryKey; values: CatalogueOption[] }[];
};

/**
 * API-38 response. `id` is the FK submitted as `cityId`; `name` is display
 * only. **Unpaginated for MVP** — the call is already scoped to one state.
 */
export type City = { id: string; name: string };
export type CitiesResponse = { cities: City[] };

// ---------------------------------------------------------------------------
// Onboarding submit — FE TDD §9.2 (API-7)
// ---------------------------------------------------------------------------

/**
 * API-7's `plot` object.
 *
 * **Every field typed `string` here is a catalogue key**, not a label —
 * `profession: "swe"`, never `"Software Engineer"` (FR-3b). They are `string`
 * rather than unions because the values are the backend's to define; that is
 * exactly the property FR-3b is buying, and narrowing them here would put the
 * lists back in the client through the type system.
 *
 * **`state` is absent and that is the contract** (O-16, closed): `cityId`
 * already implies the state via the backend's `cities` table, so the client
 * uses `state` only to scope API-38 and never sends it.
 */
export type OnboardingPlot = {
  firstName: string;
  lastName: string;
  /** ISO `YYYY-MM-DD`. FR-4 locks this after submit — API-24 rejects changes. */
  dateOfBirth: string;
  gender: string;
  build: string;
  education: string;
  profession: string;
  incomeRange: string;
  religion: string;
  /** Catalogue keys. May include the `other` key — see `languagesOther`. */
  languages: string[];
  /**
   * The one free-text value that survives FR-3b's catalogue-driven set.
   *
   * ⚠️ **Its presence is coupled to `languages` in both directions.** API-7
   * returns `400 validation_error` if `other` is in `languages` without this
   * field **or if this field is sent without `other`**. Clearing the array
   * without clearing the text is therefore a real 400, not a harmless leftover
   * — `buildSubmitBody` is where that invariant is enforced.
   */
  languagesOther?: string;
  diet: string;
  drinking: string;
  smoking: string;
  /**
   * ⚠️ **Not yet in the backend's API-7 body** — CONTRACT-QUESTIONS §9.
   *
   * "How often do you exercise or stay physically active?" is a **required**
   * Plot question (owner's decision, 2026-08-05), so the client asks it, blocks
   * submit on it, and sends it. Until the backend adds the column this key is
   * either ignored or a `400` depending on how strict its validator is; the mock
   * accepts it. Nothing else in the client is conditional on it.
   */
  fitness: string;
  familyType: string;
  /**
   * FR-3c — **the user's own answer, a public and filterable Plot fact.** "Are
   * you open to relocating after marriage?", one of `yes | no | depends`.
   *
   * ⚠️ **Renamed from `relocationWillingness` (FE v1.50–1.51 / BE v1.12, O-23).**
   * That earlier field was an *Anchor partner-preference* — a stance about the
   * partner — which the spec deleted outright; this is a near-homonym but a
   * different question (the user's *own* stance), which is exactly why FR-3c
   * exists to keep the two apart. It was already a `plot` field on the wire
   * (API-7 rejected the old name under `anchor`, verified live 2026-08-07), so
   * this change is name + screen only, not a wire relocation. Drives the new
   * premium Discover filter (FR-24 / API-13).
   */
  openToRelocation: string;
  /** FK → the backend's `cities` table. The only location value ever sent. */
  cityId: string;
  heightCm: number;
  bio: string;
};

/** API-7's `anchor` object — all five choice fields are API-39 keys. */
export type OnboardingAnchor = {
  /**
   * Two flat integers, **not** a nested `{ min, max }`.
   *
   * The client sent `partnerAgeRange: { min, max }` until 2026-08-06, when the
   * first live submit against staging returned `400`:
   * `anchor.property partnerAgeRange should not exist`, alongside
   * `partnerAgeMin/Max must be an integer number`. API-7's validator is
   * whitelist-based, so the nested object was rejected outright rather than
   * being read and ignored — see `docs/spec-deltas/BE-TDD-v1.11-delta.md`.
   *
   * The bounds below are read off the same error response (`must not be less
   * than 21`, `must not be greater than 100`). `RangeDualSlider` already clamps
   * to them, so they are documented here rather than re-validated on submit.
   */
  partnerAgeMin: number;
  partnerAgeMax: number;
  matchLocationPreference: string;
  childrenPreference: string;
  interfaithStance: string;
  smokingPartnerComfort: string;
  householdPreference: string;
};

/**
 * API-7's `love` object — the FR-14 compatibility quiz.
 *
 * `quizVersion` travels with the answers so a later scoring change can tell
 * which question set a given answer belongs to (BE §14.2). The client sends the
 * version of the question set it actually displayed, for the same reason
 * API-40's consent `version` is the version of the copy displayed.
 */
export type OnboardingLove = {
  quizVersion: number;
  quizAnswers: QuizAnswer[];
};

export type OnboardingSubmitBody = {
  plot: OnboardingPlot;
  anchor: OnboardingAnchor;
  love: OnboardingLove;
};

/**
 * API-7 happy path. Always `true` on a 200 — the client proceeds to Photos.
 *
 * `409 already_submitted` is the response worth planning for rather than the
 * 400: it means a stale local draft was resubmitted after onboarding finished
 * elsewhere, and the right client behaviour is to clear the draft and re-route,
 * not to show an error. See `app/onboarding.tsx`.
 */
export type OnboardingSubmitResponse = { profileComplete: true };

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

/**
 * API-33 — `GET /compatibility-quiz/questions` (FR-14, BE §14.2).
 *
 * The backend owns the question set *and* its version. Each question carries the
 * server `questionId` (a UUID) that API-7's {@link QuizAnswer.questionId} must
 * echo verbatim, plus a stable `dimensionKey` the client joins to its own local
 * copy of the prompt/pole text (`src/lib/onboarding/scales.ts`) — so the wire
 * identity is the backend's while the display copy stays client-side. `order` is
 * the sequence the client presents them in.
 */
export type CompatibilityQuizQuestion = {
  questionId: string;
  dimensionKey: string;
  order: number;
};

export type CompatibilityQuizResponse = {
  /**
   * The server's version of the question set (BE returns it as `version`). It is
   * echoed back to API-7 as `love.quizVersion` — the client owns neither the set
   * nor its number (O-22).
   */
  version: number;
  questions: CompatibilityQuizQuestion[];
};

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
