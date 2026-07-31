/**
 * The onboarding draft — NFR-1's "never lose a partly-filled form".
 *
 * Ported from `src/stores/onboarding-store.ts`, which hand-rolled a debounced
 * `AsyncStorage.setItem` because `zustand/middleware`'s `persist` referenced
 * `import.meta` and crashed the **web** bundle. Web is out of scope (O-12), so
 * that constraint no longer exists and persistence is now redux-persist's job
 * — declared in `src/store/index.ts` rather than implemented here.
 *
 * NFR-12: the draft is deleted from persisted storage once `POST
 * /onboarding/submit` succeeds. `draftSubmitted` is that action; Module 5
 * dispatches it from the submit's fulfilled handler.
 */
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { defaultOnboardingState, type OnboardingState } from "@/src/lib/onboarding/types";

export type OnboardingSliceState = {
  draft: OnboardingState;
  /** Index of the screen the user is on, so a relaunch resumes in place. */
  stepIdx: number;
  completed: boolean;
};

const initialState: OnboardingSliceState = {
  draft: defaultOnboardingState,
  stepIdx: 0,
  completed: false,
};

/** Keeps `setField` honest: the value must match the key's declared type. */
export type FieldPayload = {
  [K in keyof OnboardingState]: { key: K; value: OnboardingState[K] };
}[keyof OnboardingState];

const onboardingSlice = createSlice({
  name: "onboarding",
  initialState,
  reducers: {
    setField(state, action: PayloadAction<FieldPayload>) {
      // Immer handles the copy; the cast is only to satisfy the mapped-union
      // payload, which TypeScript cannot narrow across the assignment.
      (state.draft as Record<string, unknown>)[action.payload.key] = action.payload.value;
    },
    setStepIdx(state, action: PayloadAction<number>) {
      state.stepIdx = action.payload;
    },
    markCompleted(state) {
      state.completed = true;
    },
    /** NFR-12 — the draft has reached the backend and is no longer needed. */
    draftSubmitted() {
      return { ...initialState, completed: true };
    },
    resetOnboarding() {
      return initialState;
    },
  },
});

export const { setField, setStepIdx, markCompleted, draftSubmitted, resetOnboarding } =
  onboardingSlice.actions;

export const onboardingReducer = onboardingSlice.reducer;
