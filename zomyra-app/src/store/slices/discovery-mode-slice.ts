/**
 * The user's Discovery Mode (FR-15a) — the one-time "which lens do you want to
 * see matches through?" choice.
 *
 * Persisted, so the picker is skipped on later launches. The authoritative copy
 * lives server-side: `GET /me` returns `discoveryMode`, and API-25 (`PATCH
 * /profile/discovery-mode`) is what actually sets it. Module 3 reconciles the
 * two — this slice is the local answer that lets Discover render before `/me`
 * resolves, not a second source of truth.
 */
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { CompatibilityDimension } from "@/src/lib/discover/mock";

export type DiscoveryModeState = { mode: CompatibilityDimension | null };

const initialState: DiscoveryModeState = { mode: null };

const discoveryModeSlice = createSlice({
  name: "discoveryMode",
  initialState,
  reducers: {
    setDiscoveryMode(state, action: PayloadAction<CompatibilityDimension>) {
      state.mode = action.payload;
    },
    clearDiscoveryMode(state) {
      state.mode = null;
    },
  },
});

export const { setDiscoveryMode, clearDiscoveryMode } = discoveryModeSlice.actions;

export const discoveryModeReducer = discoveryModeSlice.reducer;
