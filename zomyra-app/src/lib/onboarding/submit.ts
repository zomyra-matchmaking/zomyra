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
import type { OnboardingSubmitBody } from "@/src/api";

import { SCALE_QUESTIONS } from "./scales";
import type { OnboardingState } from "./types";

/**
 * ⚠️ **A stopgap for a value the client does not own.**
 *
 * `quizVersion` describes *which FR-14 question set the user was shown*, so that
 * an answer can never be scored against a set it wasn't given — the same
 * discipline as `SENSITIVE_DATA_CONSENT_VERSION` (O-20). An answer scored
 * against the wrong question set is worse than a missing one, because nothing
 * looks wrong.
 *
 * **Owner's decision, 2026-08-05: the backend owns this number** (see
 * `docs/CONTRACT-QUESTIONS.md` §8). API-33 serves the quiz *and* its version
 * (BE §14.2), and the client's only job is to echo back whatever it received.
 * This constant exists solely because API-33 is not built yet and
 * `SCALE_QUESTIONS` is still a client-side list in `./scales.ts` — there is
 * nothing to echo.
 *
 * **So `1` is not a version the client chose well; it is a number this client
 * invented, and it is very likely wrong.** Every submit until API-33 lands
 * carries a version the backend never issued. Two things follow:
 *
 * - **Do not bump this on a question change.** Bumping would be maintaining a
 *   second numbering scheme for something with one owner, which is the exact
 *   drift §8 exists to prevent. Ask the backend for the real number instead.
 * - **When API-33 is wired up, delete this constant** rather than assigning to
 *   it. The questions and the version arrive together in one response, and
 *   `buildSubmitBody` should read the version off that response — a client-side
 *   copy could only ever disagree with it.
 *
 * The owner has also asked the backend whether this field is needed at all,
 * given that the questions are backend-driven and an API version could signal a
 * question change (§8a). If that lands, this key leaves the body entirely — one
 * more reason to delete rather than maintain the constant.
 */
export const QUIZ_VERSION = 1;

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
    ["matchLocationPreference", "Match location"],
    ["childrenPreference", "Children"],
    ["interfaithStance", "Interfaith"],
    ["smokingPartnerComfort", "Partner smoking"],
    ["householdPreference", "Household"],
    ["relocationWillingness", "Relocation"],
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
  // a guard against reaching submit having skipped it entirely, not per-answer
  // validation.
  if (Object.keys(draft.scales).length < SCALE_QUESTIONS.length) missing.push("Compatibility quiz");

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

export function buildSubmitBody(draft: OnboardingState): OnboardingSubmitBody {
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
      relocationWillingness: draft.relocationWillingness,
    },
    love: {
      quizVersion: QUIZ_VERSION,
      /*
       * Driven by `SCALE_QUESTIONS`, not by `Object.entries(draft.scales)`:
       * iterating the draft would submit answers to questions this client
       * version no longer asks, which a resumed draft (NFR-1) makes reachable.
       * The question set defines the answer set.
       */
      quizAnswers: SCALE_QUESTIONS.filter((q) => draft.scales[q.id] != null).map((q) => ({
        questionId: q.id,
        sliderValue: draft.scales[q.id],
      })),
    },
  };
}
