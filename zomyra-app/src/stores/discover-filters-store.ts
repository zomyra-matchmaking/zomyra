/**
 * Discover filter state — supports age (range), multi-select for chip
 * filters, and premium filters (only persisted when the user has Premium
 * unlocked, but stored centrally so toggling Premium reveals them).
 */
import { create } from "zustand";

export type MultiFilterKey =
  | "religion"
  | "diet"
  | "location"
  | "smoking"
  | "build"
  | "education"
  | "profession"
  | "income"
  | "family"
  | "children"
  | "language"
  | "drinking";

export type FilterKey = "age" | "height" | MultiFilterKey;

export type AgeRange = [number, number];
export type HeightRange = [number, number];

type FilterState = {
  age: AgeRange;
  height: HeightRange;
  religion: string[];
  diet: string[];
  location: string[];
  smoking: string[];
  build: string[];
  education: string[];
  profession: string[];
  income: string[];
  family: string[];
  children: string[];
  language: string[];
  drinking: string[];
  setAge: (range: AgeRange) => void;
  setHeight: (range: HeightRange) => void;
  toggle: (key: MultiFilterKey, value: string) => void;
  clear: (key: FilterKey) => void;
  reset: () => void;
};

export const DEFAULT_AGE: AgeRange = [22, 40];
export const DEFAULT_HEIGHT: HeightRange = [150, 195];

const EMPTY_STATE = {
  age: DEFAULT_AGE,
  height: DEFAULT_HEIGHT,
  religion: [] as string[],
  diet: [] as string[],
  location: [] as string[],
  smoking: [] as string[],
  build: [] as string[],
  education: [] as string[],
  profession: [] as string[],
  income: [] as string[],
  family: [] as string[],
  children: [] as string[],
  language: [] as string[],
  drinking: [] as string[],
};

export const useDiscoverFilters = create<FilterState>((set) => ({
  ...EMPTY_STATE,
  setAge: (range) => set({ age: range }),
  setHeight: (range) => set({ height: range }),
  toggle: (key, value) =>
    set((s) => {
      const cur = s[key] as string[];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      return { [key]: next } as Partial<FilterState>;
    }),
  clear: (key) =>
    set(() => {
      if (key === "age") return { age: DEFAULT_AGE };
      if (key === "height") return { height: DEFAULT_HEIGHT };
      return { [key]: [] } as Partial<FilterState>;
    }),
  reset: () => set({ ...EMPTY_STATE }),
}));

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
