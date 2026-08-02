/**
 * Discover filter selections — client state, persisted.
 *
 * A straight port of `src/stores/discover-filters-store.ts`. The option lists
 * themselves stay in `src/lib/discover/filter-options.ts`: they are static
 * reference data today and become API-13 (`GET /filters/options`) in Module 7,
 * at which point they belong in the RTK Query cache, not in a slice.
 */
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

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

export const DEFAULT_AGE: AgeRange = [22, 40];
export const DEFAULT_HEIGHT: HeightRange = [150, 195];

export type DiscoverFiltersState = { age: AgeRange; height: HeightRange } & Record<
  MultiFilterKey,
  string[]
>;

const initialState: DiscoverFiltersState = {
  age: DEFAULT_AGE,
  height: DEFAULT_HEIGHT,
  religion: [],
  diet: [],
  location: [],
  smoking: [],
  build: [],
  education: [],
  profession: [],
  income: [],
  family: [],
  children: [],
  language: [],
  drinking: [],
};

const discoverFiltersSlice = createSlice({
  name: "discoverFilters",
  initialState,
  reducers: {
    setAgeRange(state, action: PayloadAction<AgeRange>) {
      state.age = action.payload;
    },
    setHeightRange(state, action: PayloadAction<HeightRange>) {
      state.height = action.payload;
    },
    toggleFilter(state, action: PayloadAction<{ key: MultiFilterKey; value: string }>) {
      const { key, value } = action.payload;
      const current = state[key];
      state[key] = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
    },
    clearFilter(state, action: PayloadAction<FilterKey>) {
      const key = action.payload;
      if (key === "age") state.age = DEFAULT_AGE;
      else if (key === "height") state.height = DEFAULT_HEIGHT;
      else state[key] = [];
    },
    resetFilters() {
      return initialState;
    },
  },
});

export const { setAgeRange, setHeightRange, toggleFilter, clearFilter, resetFilters } =
  discoverFiltersSlice.actions;

export const discoverFiltersReducer = discoverFiltersSlice.reducer;
