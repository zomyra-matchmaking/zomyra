/**
 * FR-14's compatibility quiz — **display copy only**.
 *
 * ⚠️ **The backend owns the question *set*, its *order*, and its *version* via
 * API-33** (`GET /compatibility-quiz/questions`, see `CompatibilityQuizQuestion`).
 * This list is not that set: it is the local prompt / pole text the client joins
 * to each served question by `dimensionKey` (which equals the `id` here). A
 * dimension the backend serves without a matching entry falls back to a generic
 * card (`scaleCopyFor`) rather than crashing — the same soft-failure stance
 * `useOnboardingOptions.label()` takes for a retired catalogue key. Nothing here
 * decides *whether* a question is asked; only how it reads.
 */
export type ScaleQuestion = {
  id: string;
  title: string;
  prompt: string;
  left: string;
  right: string;
};

export const SCALE_QUESTIONS: ScaleQuestion[] = [
  { id: "household_vision", title: "Household Vision",
    prompt: "When you picture married life, what does your household feel like?",
    left: "Calm & private", right: "Lively & social" },
  { id: "decision_making", title: "Decision Making",
    prompt: "A major life decision comes up — who decides?",
    left: "One of us decides", right: "Always together" },
  { id: "finances", title: "Finances",
    prompt: "How do you want to manage money with your spouse?",
    left: "Separate", right: "Fully shared" },
  { id: "career_priorities", title: "Career Priorities",
    prompt: "How should careers be balanced after marriage?",
    left: "Family first", right: "Both ambitious" },
  { id: "parenting_share", title: "Parenting",
    prompt: "How should parenting be shared?",
    left: "Traditional", right: "Fully equal" },
  { id: "conflict_resolution", title: "Conflict Resolution",
    prompt: "What do you need most during disagreements?",
    left: "Space to cool off", right: "Talk it out now" },
  { id: "emotional_support", title: "Emotional Support",
    prompt: "How do you naturally support a partner?",
    left: "Practical & steady", right: "Deeply expressive" },
  { id: "ideal_weekend", title: "Weekend Lifestyle",
    prompt: "Your ideal weekend looks like…",
    left: "Home & restful", right: "Out & adventurous" },
  { id: "friendships", title: "Friendships",
    prompt: "How should friendships evolve after marriage?",
    left: "Intimate inner circle", right: "Keep them all close" },
  { id: "personal_growth", title: "Personal Growth",
    prompt: "How important is reinvention and self-growth?",
    left: "Steady is good", right: "Always evolving" },
  { id: "traditions", title: "Traditions",
    prompt: "How present should cultural traditions be in daily life?",
    left: "Light touch", right: "Central to life" },
  { id: "social_expectations", title: "Social Expectations",
    prompt: "How much does society's opinion matter?",
    left: "Not much", right: "Quite a bit" },
];

const SCALE_COPY: Record<string, ScaleQuestion> = Object.fromEntries(
  SCALE_QUESTIONS.map((q) => [q.id, q]),
);

/**
 * The display copy for one API-33 `dimensionKey`, or a generic fallback.
 *
 * Falls back rather than throwing so a backend that adds a dimension ahead of
 * the client shipping its copy renders a plain-but-usable card instead of a
 * white screen mid-quiz — the question still counts and still submits its
 * server `questionId`; only the wording is generic until copy catches up.
 */
export function scaleCopyFor(dimensionKey: string): ScaleQuestion {
  return (
    SCALE_COPY[dimensionKey] ?? {
      id: dimensionKey,
      title: "Compatibility",
      prompt: "Where do you land on this?",
      left: "One side",
      right: "The other",
    }
  );
}
