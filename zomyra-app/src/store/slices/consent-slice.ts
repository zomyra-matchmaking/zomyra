/**
 * FR-2a's sensitive-data consent, recorded per account.
 *
 * ## Why a slice at all, rather than branching on `isNewAccount`
 *
 * FR-2a says the screen appears "immediately after a new account is created …
 * shown once per account, never again", which reads like `isNewAccount` from
 * API-2/API-3 is the whole answer. It is not, and the hole is the case the
 * screen exists for: **declining returns the user to Welcome**. Sign in again
 * and the account is no longer new, so a client keyed on `isNewAccount` would
 * skip consent and drop them straight into Onboarding — collecting religion and
 * income from someone who explicitly refused.
 *
 * So the client records *its own* acknowledgement, and FR-2a's "once per
 * account" is enforced against that rather than against a flag whose meaning
 * changes on the second attempt.
 *
 * ## Why it is persisted
 *
 * The alternative is re-asking on every cold start until onboarding completes,
 * which is the same annoyance FR-30's prompt cooldown exists to avoid — and
 * here it would look like the app forgot an answer the user had given.
 *
 * ⚠️ **This slice is expected to be deleted, not extended (owner, 2026-08-03).**
 * Consent is moving server-side and the spec change is going to the TDDs. The
 * reason is sharper than "a reinstall re-asks": the consent row is only
 * evaluated while `profileComplete` is `false`, so **once onboarding finishes
 * nothing reads this record again and no system anywhere holds proof that
 * consent was ever given.** Re-asking fails safe; holding no record at all does
 * not.
 *
 * When `GET /me` carries it, this slice, `useRootRouteContext` and `consent`'s
 * entry in `PERSIST_WHITELIST` all go, and `resolveRootDestination` reads a
 * field it already receives. The consent *screen* is unaffected. Shape being
 * settled in `docs/CONTRACT-QUESTIONS.md` item 4b — **including that it should
 * be built to hold FR-11a's biometric consent too**, rather than a second
 * one-off column being added in Module 6.
 *
 * Keyed by `userId` from `GET /me`, not by phone or Google id: those are
 * identities, and API-3's note makes them independent — one human may hold two
 * accounts, and each owes its own consent.
 */
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ConsentState = {
  /** `userId`s that have accepted FR-2a's sensitive-data notice. */
  sensitiveDataUserIds: string[];
};

const initialState: ConsentState = { sensitiveDataUserIds: [] };

const consentSlice = createSlice({
  name: "consent",
  initialState,
  reducers: {
    sensitiveDataConsentGiven(state, action: PayloadAction<{ userId: string }>) {
      if (!state.sensitiveDataUserIds.includes(action.payload.userId)) {
        state.sensitiveDataUserIds.push(action.payload.userId);
      }
    },
  },
});

export const { sensitiveDataConsentGiven } = consentSlice.actions;

export const consentReducer = consentSlice.reducer;
