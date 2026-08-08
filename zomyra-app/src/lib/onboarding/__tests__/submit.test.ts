/**
 * M5-070 — the API-7 submit body is a function of the **backend's** quiz set.
 *
 * Pins the O-22 contract now that `PersonalityQuiz` renders from API-33 rather
 * than a hardcoded list: `buildSubmitBody` must echo the server `questionId`
 * UUIDs and `quizVersion` (never a client slug/constant), join answers to the
 * *served* questions by `dimensionKey`, and drop both unanswered served
 * questions and draft answers the served set no longer asks. Also pins O-23/O-24
 * required Plot fields on the `missingFields` guard.
 */
import type { CompatibilityQuizResponse } from "@/src/api";

import { buildSubmitBody, isSubmittable, missingFields } from "../submit";
import { defaultOnboardingState, type OnboardingState } from "../types";

function fullDraft(overrides: Partial<OnboardingState> = {}): OnboardingState {
  return {
    ...defaultOnboardingState,
    firstName: "Ada",
    lastName: "Lovelace",
    dob: "1990-01-01",
    gender: "female",
    state: "mh",
    cityId: "c1",
    heightCm: 168,
    build: "athletic",
    education: "masters",
    profession: "swe",
    incomeRange: "r1",
    religion: "hindu",
    languages: ["en"],
    languagesOther: "",
    diet: "veg",
    drinking: "no",
    smoking: "no",
    fitness: "often",
    familyType: "nuclear",
    relationshipStatus: "never_married",
    openToRelocation: "yes",
    matchLocationPreference: "same_city",
    childrenPreference: "yes",
    interfaithStance: "no",
    smokingPartnerComfort: "no",
    householdPreference: "flexible",
    // Answered: two served dimensions + one the served set will NOT contain.
    scales: { household_vision: 3, decision_making: 4, retired_dimension: 5 },
    ...overrides,
  };
}

/** Served out of order and by UUID, exactly like API-33. */
const quiz: CompatibilityQuizResponse = {
  version: 7,
  questions: [
    { questionId: "uuid-household", dimensionKey: "household_vision", order: 2 },
    { questionId: "uuid-decision", dimensionKey: "decision_making", order: 1 },
    { questionId: "uuid-finances", dimensionKey: "finances", order: 3 },
  ],
};

describe("buildSubmitBody — backend-driven quiz (M5-070, O-22)", () => {
  it("echoes the server quizVersion, not a client constant", () => {
    expect(buildSubmitBody(fullDraft(), quiz).love.quizVersion).toBe(7);
  });

  it("submits served questionId UUIDs joined by dimensionKey — never a slug", () => {
    const answers = buildSubmitBody(fullDraft(), quiz).love.quizAnswers;
    expect(answers).toContainEqual({ questionId: "uuid-household", sliderValue: 3 });
    expect(answers).toContainEqual({ questionId: "uuid-decision", sliderValue: 4 });
    // No answer carries a dimensionKey/slug in the questionId slot.
    for (const a of answers) expect(a.questionId.startsWith("uuid-")).toBe(true);
  });

  it("omits served questions the user has not answered", () => {
    const answers = buildSubmitBody(fullDraft(), quiz).love.quizAnswers;
    expect(answers.some((a) => a.questionId === "uuid-finances")).toBe(false);
  });

  it("never submits a draft answer the served set no longer asks (version skew)", () => {
    const answers = buildSubmitBody(fullDraft(), quiz).love.quizAnswers;
    // `retired_dimension` is in the draft but not in `quiz.questions`.
    expect(answers).toHaveLength(2);
    expect(answers.some((a) => a.questionId === "retired_dimension")).toBe(false);
  });

  it("carries the O-23/O-24 Plot self-facts", () => {
    const plot = buildSubmitBody(fullDraft(), quiz).plot;
    expect(plot.openToRelocation).toBe("yes");
    expect(plot.relationshipStatus).toBe("never_married");
  });
});

describe("missingFields / isSubmittable guards", () => {
  it("accepts a fully-answered draft", () => {
    expect(isSubmittable(fullDraft())).toBe(true);
  });

  it("blocks submit when the quiz was skipped entirely, not per-answer", () => {
    expect(missingFields(fullDraft({ scales: {} }))).toContain("Compatibility quiz");
    // One answer is enough to clear the "skipped entirely" guard — the served
    // set's completeness is enforced by the quiz screen, not this count.
    expect(missingFields(fullDraft({ scales: { household_vision: 3 } }))).not.toContain(
      "Compatibility quiz",
    );
  });

  it("requires the O-24 relationshipStatus field", () => {
    expect(missingFields(fullDraft({ relationshipStatus: "" }))).toContain("Relationship status");
  });
});
