/**
 * Premium entitlement.
 *
 * Split out of the requests store in Module 2, where it sat as a stray boolean
 * next to a mock list. It is its own concern, and the split is what lets the
 * next rule be enforced:
 *
 * **Never persisted (FE TDD §4.3, NFR-13).** Entitlement is re-derived from
 * RevenueCat's SDK at launch and at every gated interaction, never trusted from
 * a stored value — a persisted `isPremium: true` is a paid feature that
 * survives an expired pass. It is deliberately absent from the persist
 * whitelist in `src/store/index.ts`, and this comment is the reason.
 *
 * Today the value is set by the dev chip on the Premium screen. Module 10
 * replaces `setPremium` with the RevenueCat derivation; the selector and every
 * call site reading it stay as they are.
 */
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type EntitlementState = {
  isPremium: boolean;
  /** ISO timestamp; fixed-term and non-renewing per FR-29c. */
  expiresAt: string | null;
};

const initialState: EntitlementState = { isPremium: false, expiresAt: null };

const entitlementSlice = createSlice({
  name: "entitlement",
  initialState,
  reducers: {
    setPremium(state, action: PayloadAction<boolean>) {
      state.isPremium = action.payload;
      if (!action.payload) state.expiresAt = null;
    },
    setEntitlement(_state, action: PayloadAction<EntitlementState>) {
      return action.payload;
    },
  },
});

export const { setPremium, setEntitlement } = entitlementSlice.actions;

export const entitlementReducer = entitlementSlice.reducer;
