/**
 * The values each Discover filter offers.
 *
 * Static reference data, moved out of the filter store in Module 2 — it is not
 * state, it never changes at runtime, and a slice is the wrong home for it.
 *
 * Module 7 replaces this with API-13 (`GET /filters/options`), which returns
 * `{ filterKey, label, premiumOnly, values }` per filter and lets the backend
 * own which filters are premium-gated instead of the client deciding.
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
