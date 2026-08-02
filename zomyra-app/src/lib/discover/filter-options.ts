/**
 * The values each Discover filter offers.
 *
 * Static reference data, moved out of the filter store in Module 2 — it is not
 * state, it never changes at runtime, and a slice is the wrong home for it.
 *
 * Module 7 replaces this with API-13 (`GET /filters/options`), which returns
 * `{ filterKey, label, premiumOnly, values }` per filter and lets the backend
 * own which filters are premium-gated instead of the client deciding.
 *
 * ⚠️ **Not the same endpoint as onboarding's catalogue, and deliberately so.**
 * FR-3b routes every onboarding choice list through API-39
 * (`GET /onboarding/options`); six of those categories — religion, diet,
 * drinking, smoking, familyType, incomeRange — *also* appear here in API-13.
 * BE v1.5 §14.2a keeps the two structurally separate on product direction, so
 * do not collapse this into API-39 when Module 7 lands.
 *
 * **But they are not free to diverge:** FR-3 requires religion's ten options to
 * be **identical** between onboarding and filters. That is a cross-endpoint
 * invariant with no single owner and nothing enforcing it — worth an explicit
 * check in Module 7 rather than an assumption.
 */
import type { MultiFilterKey } from "@/src/store/slices/discover-filters-slice";

export const FILTER_OPTIONS: Record<MultiFilterKey, string[]> = {
  religion: ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Parsi", "Other"],
  diet: ["Vegetarian", "Eggetarian", "Non-Vegetarian", "Vegan", "Jain"],
  location: [
    "Bangalore",
    "Mumbai",
    "Delhi NCR",
    "Pune",
    "Hyderabad",
    "Chennai",
    "Kolkata",
    "Ahmedabad",
  ],
  smoking: ["Non-smoker", "Occasional", "Regular", "Doesn't matter"],
  build: ["Slim", "Average", "Athletic", "Curvy", "Plus Size"],
  education: ["High School", "Diploma", "Bachelor's", "Master's", "MBA", "PhD"],
  profession: [
    "Engineer",
    "Doctor",
    "Designer",
    "Founder",
    "Educator",
    "Consultant",
    "Finance",
    "Creative",
    "Other",
  ],
  income: ["Below ₹5 LPA", "₹5–10 LPA", "₹10–20 LPA", "₹20–35 LPA", "₹35–50 LPA", "₹50L+"],
  family: ["Nuclear", "Joint", "Flexible"],
  children: ["Wants children", "Does not want", "Open / undecided"],
  language: [
    "English",
    "Hindi",
    "Tamil",
    "Telugu",
    "Kannada",
    "Marathi",
    "Bengali",
    "Punjabi",
    "Gujarati",
    "Malayalam",
  ],
  drinking: ["Non-Drinker", "Social Drinker", "Occasional", "Regular"],
};
