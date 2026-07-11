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
  { id: "parenting", title: "Parenting",
    prompt: "How should parenting be shared?",
    left: "Traditional", right: "Fully equal" },
  { id: "conflict_resolution", title: "Conflict Resolution",
    prompt: "What do you need most during disagreements?",
    left: "Space to cool off", right: "Talk it out now" },
  { id: "emotional_support", title: "Emotional Support",
    prompt: "How do you naturally support a partner?",
    left: "Practical & steady", right: "Deeply expressive" },
  { id: "weekend_lifestyle", title: "Weekend Lifestyle",
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
