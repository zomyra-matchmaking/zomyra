export type Gender = "Female" | "Male" | "Non-binary" | "Prefer not to say";
export type BodyType = "Slim" | "Average" | "Athletic" | "Curvy" | "Plus Size" | "Prefer Not To Say";
export type Education =
  | "High School"
  | "Diploma"
  | "Bachelor's Degree"
  | "Master's Degree"
  | "MBA"
  | "PhD"
  | "Other";
export type IncomeRange =
  | "Under ₹5 LPA"
  | "₹5–10 LPA"
  | "₹10–20 LPA"
  | "₹20–35 LPA"
  | "₹35–50 LPA"
  | "₹50 LPA+"
  | "Prefer Not To Say";
export type Diet = "Vegetarian" | "Eggetarian" | "Non-Vegetarian" | "Vegan";
export type Drinking = "Never" | "Socially" | "Occasionally" | "Frequently";
export type Smoking = "Never" | "Occasionally" | "Frequently";
export type Fitness = "Not Important" | "Moderately Active" | "Active" | "Fitness Enthusiast";
export type FamilyStructure = "Nuclear Family" | "Joint Family" | "Flexible";
export type Relocation = "Open to Relocation" | "Depends on Opportunity" | "Prefer Not To Relocate";
export type Religion =
  | "Hindu"
  | "Muslim"
  | "Christian"
  | "Sikh"
  | "Jain"
  | "Buddhist"
  | "Spiritual but not Religious"
  | "Agnostic"
  | "Atheist"
  | "Prefer Not To Say";

export type OnboardingState = {
  firstName: string;
  lastName: string;
  dob: string;
  gender: Gender | "";
  city: string;
  heightCm: number | null;
  bodyType: BodyType | "";
  education: Education | "";
  profession: string;
  income: IncomeRange | "";
  diet: Diet | "";
  drinking: Drinking | "";
  smoking: Smoking | "";
  fitness: Fitness | "";
  languages: string[];
  familyStructure: FamilyStructure | "";
  religion: Religion | "";
  relocation: Relocation | "";
  prefGender: Gender | "";
  prefAge: [number, number];
  prefHeightCm: [number, number];
  prefLocation: "Same City" | "Same State" | "Anywhere in India" | "Open to International Matches" | "";
  prefDiet: "No Preference" | Diet | "";
  prefDrinking: "No Preference" | "Non-Drinker" | "Social Drinker" | "Any" | "";
  prefSmoking: "No Preference" | "Non-Smoker" | "Occasional Smoker" | "Any" | "";
  prefReligion:
    | "No Preference"
    | "Hindu"
    | "Muslim"
    | "Christian"
    | "Sikh"
    | "Jain"
    | "Buddhist"
    | "Spiritual but not Religious"
    | "Agnostic"
    | "Atheist"
    | "";
  prefFamily: "Nuclear Family" | "Joint Family" | "No Preference" | "";
  prefInterfaith: "Yes" | "No" | "Depends" | "";
  prefIntent:
    | "Looking to Marry Within 1 Year"
    | "Looking to Marry Within 2 Years"
    | "Serious Relationship Leading to Marriage"
    | "Open to Exploring"
    | "";
  nnChildren: "Yes" | "No" | "Undecided" | "";
  nnInterfaith: "Yes" | "No" | "Depends on the Person" | "";
  nnSmoker: "Yes" | "No" | "Occasional Smoking Only" | "";
  nnHousehold: "Vegetarian Household Only" | "Flexible Household" | "No Preference" | "";
  nnRelocation: "Yes" | "No" | "Depends on Circumstances" | "";
  scales: Record<string, number>;
  /** Optional self-written About Me. If empty, ProfileView falls back to the auto-generated summary. */
  bio: string;
  /** User-uploaded photos as base64 data URIs (first one acts as the primary/hero photo). */
  photos: string[];
};

export const defaultOnboardingState: OnboardingState = {
  firstName: "",
  lastName: "",
  dob: "",
  gender: "",
  city: "",
  heightCm: 168,
  bodyType: "",
  education: "",
  profession: "",
  income: "",
  diet: "",
  drinking: "",
  smoking: "",
  fitness: "",
  languages: [],
  familyStructure: "",
  religion: "",
  relocation: "",
  prefGender: "",
  prefAge: [25, 32],
  prefHeightCm: [152, 183],
  prefLocation: "",
  prefDiet: "",
  prefDrinking: "",
  prefSmoking: "",
  prefReligion: "",
  prefFamily: "",
  prefInterfaith: "",
  prefIntent: "",
  nnChildren: "",
  nnInterfaith: "",
  nnSmoker: "",
  nnHousehold: "",
  nnRelocation: "",
  scales: {},
  bio: "",
  photos: [],
};

export const STORAGE_KEY = "zomyra.onboarding.v1";
export const STORAGE_STEP_KEY = "zomyra.onboarding.step.v1";
