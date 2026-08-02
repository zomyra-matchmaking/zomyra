/**
 * When the dismissible "Update available" prompt was last shown, and for which
 * version (FR-30).
 *
 * **Persisted**, and it is one of very few things in this app that has to be.
 * The whole point is that dismissing the prompt survives a kill — a cooldown
 * held in memory would reset on the next cold start, which is precisely the
 * launch the prompt fires on, so it would suppress nothing at all. See the
 * whitelist note in `src/store/index.ts`.
 *
 * Deliberately tiny and deliberately not part of `session`: `session` is server
 * state the client re-derives every launch and is excluded from persistence for
 * that reason. This is the opposite — purely local UI history that no server
 * knows or cares about.
 */
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type AppUpdateState = {
  /** `latestVersion` the prompt was last shown for. */
  lastPromptedVersion: string | null;
  /** `Date.now()` at that moment. */
  lastPromptedAt: number | null;
};

const initialState: AppUpdateState = {
  lastPromptedVersion: null,
  lastPromptedAt: null,
};

const appUpdateSlice = createSlice({
  name: "appUpdate",
  initialState,
  reducers: {
    /**
     * Recorded when the prompt is **dismissed or acted on**, not when it is
     * rendered — a prompt the user never got to answer (an app killed mid-launch)
     * should not burn the week's allowance.
     */
    updatePromptAcknowledged(state, action: PayloadAction<{ version: string }>) {
      state.lastPromptedVersion = action.payload.version;
      state.lastPromptedAt = Date.now();
    },
  },
});

export const { updatePromptAcknowledged } = appUpdateSlice.actions;
export const appUpdateReducer = appUpdateSlice.reducer;
