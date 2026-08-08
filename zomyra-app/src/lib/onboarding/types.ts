/**
 * The onboarding draft's shape — NFR-1's "never lose a partly-filled form".
 *
 * ## Module 5 replaced every union in this file with `string`, and that is the point
 *
 * Until FR-3b this file carried a hand-written union per field (`Gender`,
 * `Religion`, `Diet`, …) whose members were **display labels** — `"Vegetarian"`,
 * `"Bachelor's Degree"`. API-39 makes every one of those lists the backend's,
 * served as `{ key, label }` pairs, and the client submits **keys**. A union of
 * labels is therefore wrong twice over: wrong values, and a closed set where the
 * contract has an open one.
 *
 * Replacing them with `string` looks like a loss of type safety and partly is —
 * so it is worth being precise about what actually protected these fields
 * before, which is: nothing the compiler could check. The unions were only ever
 * as correct as somebody's transcription of a Word document, and a value the
 * backend didn't recognise compiled just as cleanly as one it did. What replaces
 * them is a runtime check the old design could not have: every stored key is
 * looked up in the live catalogue for display (`useOnboardingOptions`), so a key
 * that has gone stale is *visible* rather than silently valid.
 *
 * The fields that are genuinely the client's — `heightCm`, `partnerAgeRange`,
 * `scales`, the free text — keep their real types. Only catalogue-backed fields
 * went to `string`.
 *
 * ## What is not here, and why
 *
 * **`state` is stored but never submitted** (O-16, closed). It scopes API-38's
 * city fetch and nothing else; `cityId` already implies it via the backend's
 * `cities` table.
 *
 * **Ten prototype fields were deleted rather than carried**: `relocation`,
 * `prefGender`, `prefHeightCm`, `prefDiet`, `prefDrinking`, `prefSmoking`,
 * `prefReligion`, `prefFamily`, `prefInterfaith`, `prefIntent`. None appears in
 * API-7's body, none has an API-39 category, and — the part that makes them
 * safe to drop — **none had a screen**: they were declared here and rendered
 * nowhere, so no user was ever asked for them. `relocation` in particular is a
 * *different* field from `openToRelocation` ("Are you open to relocating after
 * marriage?", renamed from `relocationWillingness` in O-23), which is very much
 * alive; the prototype carried both and wired only the latter.
 *
 * **`fitness` was briefly in that list and should not have been.** It had a
 * real screen and is a required Plot question (owner's decision, 2026-08-05).
 * It is back, sourced from an API-39 `fitness` category the backend does not
 * serve yet — CONTRACT-QUESTIONS §9.
 *
 * **`photos` stays** even though API-7 does not carry it: FR-9's upload is
 * API-8, a separate call in the Photos step, and Edit Profile reads this field
 * today. It is client-side draft state that never reaches API-7 — see
 * `buildSubmitBody`, which does not read it.
 */

/**
 * A catalogue key from API-39 — `"swe"`, not `"Software Engineer"`.
 *
 * An alias for `string`, and deliberately not a branded type: the compiler
 * cannot tell a key from a label at any boundary that matters (both arrive as
 * `string`, from the wire and from the store), so a brand would only add casts
 * at the points where a mistake is actually possible. The alias exists to make
 * the *intent* readable at a glance in the record below — and in every one of
 * these fields the empty string means "not yet answered".
 */
export type OptionKey = string;

export type OnboardingState = {
  // ---- Plot (FR-3 / FR-3a / FR-3b) ---------------------------------------
  firstName: string;
  lastName: string;
  /** ISO `YYYY-MM-DD`. Submitted as `dateOfBirth`; FR-4 locks it after submit. */
  dob: string;
  gender: OptionKey;
  /** API-39's `state` category. Scopes API-38 only — **never submitted**. */
  state: OptionKey;
  /** An `id` from API-38's per-state city list. The only location value sent. */
  cityId: string;
  heightCm: number | null;
  build: OptionKey;
  education: OptionKey;
  profession: OptionKey;
  incomeRange: OptionKey;
  religion: OptionKey;
  /** Catalogue keys. Contains `"other"` iff `languagesOther` is non-empty. */
  languages: OptionKey[];
  /** FR-3b's one free-text escape hatch. Coupled to `languages` — see API-7. */
  languagesOther: string;
  diet: OptionKey;
  drinking: OptionKey;
  smoking: OptionKey;
  /** "How often do you exercise…". Required; see `OnboardingPlot.fitness`. */
  fitness: OptionKey;
  familyType: OptionKey;
  /**
   * FR-18 / FR-4 — the user's marital history. A Plot self-fact captured once
   * and locked afterwards (O-24). See `OnboardingPlot.relationshipStatus`.
   */
  relationshipStatus: OptionKey;
  /**
   * FR-3c — the user's own relocation stance (public + filterable). Renamed from
   * `relocationWillingness` and moved Anchor → Plot in O-23; see OnboardingPlot.
   */
  openToRelocation: OptionKey;
  /** Optional. If empty, ProfileView falls back to the auto-generated summary. */
  bio: string;

  // ---- Anchor -------------------------------------------------------------
  /** Submitted as two flat fields, `partnerAgeMin` / `partnerAgeMax` (21–100). */
  partnerAgeRange: [number, number];
  matchLocationPreference: OptionKey;
  childrenPreference: OptionKey;
  interfaithStance: OptionKey;
  smokingPartnerComfort: OptionKey;
  householdPreference: OptionKey;

  // ---- Love ---------------------------------------------------------------
  /** FR-14's slider answers, keyed by `SCALE_QUESTIONS[].id`. */
  scales: Record<string, number>;

  // ---- Client-side only ----------------------------------------------------
  /** Draft photos as data URIs. Uploaded by API-8 in the Photos step, not API-7. */
  photos: string[];
};

export const defaultOnboardingState: OnboardingState = {
  firstName: "",
  lastName: "",
  dob: "",
  gender: "",
  state: "",
  cityId: "",
  heightCm: 168,
  build: "",
  education: "",
  profession: "",
  incomeRange: "",
  religion: "",
  languages: [],
  languagesOther: "",
  diet: "",
  drinking: "",
  smoking: "",
  fitness: "",
  familyType: "",
  relationshipStatus: "",
  openToRelocation: "",
  bio: "",
  partnerAgeRange: [25, 32],
  matchLocationPreference: "",
  childrenPreference: "",
  interfaithStance: "",
  smokingPartnerComfort: "",
  householdPreference: "",
  scales: {},
  photos: [],
};
