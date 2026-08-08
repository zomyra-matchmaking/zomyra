/**
 * The draft → API-7 translation, as one pure function.
 *
 * Kept out of the screen for the same reason `resolveRootDestination` is: the
 * interesting part is a handful of rules that are invisible once interleaved
 * with rendering, and each of them is a `400` if it is got wrong.
 *
 * 1. **The draft is flat; API-7 is nested.** `{ plot, anchor, love }` is the
 *    wire shape and a flat record is the ergonomic one for 20-odd single-field
 *    screens, so something has to reshape. Doing it here means the store never
 *    holds a half-wire-shaped object.
 * 2. **`state` is dropped** (O-16). It is in the draft because API-38 needs it
 *    and in no submitted object because `cityId` implies it.
 * 3. **`languagesOther` is omitted, not empty-stringed, when unused.** API-7
 *    rejects the field arriving without `"other"` in `languages` *and* rejects
 *    `"other"` arriving without the field — a coupling in both directions, so
 *    sending `languagesOther: ""` alongside an ordinary language selection is a
 *    `400`, not a harmless no-op. `undefined` keys vanish in JSON
 *    serialisation; `""` does not.
 * 4. **`heightCm` is coerced past `null`.** The draft types it nullable because
 *    the slider screen can be reached before it is touched; the contract does
 *    not. `isSubmittable` is what guarantees the fallback is never the value
 *    actually sent.
 * 5. **`photos` never appears.** Those go to API-8 in the Photos step (FR-9).
 */
import type { CompatibilityQuizResponse, OnboardingSubmitBody } from "@/src/api";

import type { OnboardingState } from "./types";

/**
 * Whether the draft can be submitted at all.
 *
 * A second copy of the mock's validation, and deliberately so — this one exists
 * to keep the Finish button honest, the mock's exists to prove the client is not
 * relying on being asked nicely. They are allowed to disagree in one direction
 * only: anything this accepts, API-7 must accept.
 *
 * `bio` is excluded — FE §9.2 lists it but the screen offers no way to be
 * blocked on it, and it is genuinely optional.
 */
export function isSubmittable(draft: OnboardingState): boolean {
  return missingFields(draft).length === 0;
}

/** Which required answers are still blank. Drives the "finish" screen's copy. */
export function missingFields(draft: OnboardingState): string[] {
  const missing: string[] = [];

  const required: [keyof OnboardingState, string][] = [
    ["firstName", "First name"],
    ["lastName", "Last name"],
    ["dob", "Date of birth"],
    ["gender", "Gender"],
    ["cityId", "City"],
    ["build", "Build"],
    ["education", "Education"],
    ["profession", "Profession"],
    ["incomeRange", "Income range"],
    ["religion", "Religion"],
    ["diet", "Diet"],
    ["drinking", "Drinking"],
    ["smoking", "Smoking"],
    ["fitness", "Fitness"],
    ["familyType", "Family type"],
    ["relationshipStatus", "Relationship status"],
    ["openToRelocation", "Open to relocation"],
    ["matchLocationPreference", "Match location"],
    ["childrenPreference", "Children"],
    ["interfaithStance", "Interfaith"],
    ["smokingPartnerComfort", "Partner smoking"],
    ["householdPreference", "Household"],
  ];
  for (const [key, label] of required) {
    if (!draft[key]) missing.push(label);
  }

  if (draft.heightCm == null) missing.push("Height");
  if (draft.languages.length === 0) missing.push("Languages");
  // The coupling API-7 enforces, checked before it can become a 400.
  if (draft.languages.includes(OTHER_LANGUAGE_KEY) && !draft.languagesOther.trim()) {
    missing.push("Other language");
  }
  // FR-14 is answered on one screen that cannot be left partly done, so this is
  // a guard against reaching submit having skipped it **entirely**, not
  // per-answer validation — and deliberately not a fixed count. The quiz set is
  // the backend's (API-33, O-22), so its length is not the client's to assert;
  // `buildSubmitBody` sends exactly the served questions the user answered, and
  // `PersonalityQuiz` cannot advance past the served set without an answer.
  if (Object.keys(draft.scales).length === 0) missing.push("Compatibility quiz");

  return missing;
}

/**
 * The `languages` value that reveals the free-text field (FE §9.2).
 *
 * ⚠️ **The one catalogue key this client hardcodes**, and the exception FR-3b
 * has to make for itself: `"other"` is not a language, it is a *control* — the
 * client must recognise it to know when to render an extra input and when to
 * send `languagesOther`. Every other key in the catalogue passes through
 * untouched. If the backend spells this differently, the free-text field simply
 * never appears; nothing crashes and nothing is silently mis-submitted, because
 * the coupling check keys on the same constant.
 */
export const OTHER_LANGUAGE_KEY = "other";

export function buildSubmitBody(
  draft: OnboardingState,
  quiz: CompatibilityQuizResponse,
): OnboardingSubmitBody {
  const usesOther = draft.languages.includes(OTHER_LANGUAGE_KEY);
  const otherText = draft.languagesOther.trim();

  return {
    plot: {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      dateOfBirth: draft.dob,
      gender: draft.gender,
      build: draft.build,
      education: draft.education,
      profession: draft.profession,
      incomeRange: draft.incomeRange,
      religion: draft.religion,
      languages: draft.languages,
      // Rule 3 above: present only when it is genuinely in play.
      ...(usesOther && otherText ? { languagesOther: otherText } : {}),
      diet: draft.diet,
      drinking: draft.drinking,
      smoking: draft.smoking,
      fitness: draft.fitness,
      familyType: draft.familyType,
      // FR-18 / FR-4 — marital history, captured once then locked (O-24). A plain
      // Plot member on submit; the immutability lock is Module 6's to enforce.
      relationshipStatus: draft.relationshipStatus,
      // FR-3c — the user's own relocation stance, a public Plot fact. Renamed
      // from `relocationWillingness` (O-23); see OnboardingPlot.openToRelocation.
      openToRelocation: draft.openToRelocation,
      cityId: draft.cityId,
      heightCm: draft.heightCm ?? 0,
      bio: draft.bio.trim(),
    },
    anchor: {
      partnerAgeMin: draft.partnerAgeRange[0],
      partnerAgeMax: draft.partnerAgeRange[1],
      matchLocationPreference: draft.matchLocationPreference,
      childrenPreference: draft.childrenPreference,
      interfaithStance: draft.interfaithStance,
      smokingPartnerComfort: draft.smokingPartnerComfort,
      householdPreference: draft.householdPreference,
    },
    love: {
      /*
       * Both the version and the `questionId`s are the backend's, echoed off
       * API-33's response (O-22) — the client owns neither. `quizVersion`
       * travels so an answer can never be scored against a set it wasn't given.
       */
      quizVersion: quiz.version,
      /*
       * Driven by `quiz.questions` (the backend's set), not by
       * `Object.entries(draft.scales)`: iterating the draft would submit answers
       * to dimensions the served set no longer asks, which a resumed draft
       * (NFR-1) makes reachable. Each answer is joined to its slider value by
       * `dimensionKey` — the stable key shared with the local prompt copy — and
       * carries the server `questionId` UUID verbatim.
       */
      quizAnswers: quiz.questions
        .filter((q) => draft.scales[q.dimensionKey] != null)
        .map((q) => ({
          questionId: q.questionId,
          sliderValue: draft.scales[q.dimensionKey],
        })),
    },
  };
}
