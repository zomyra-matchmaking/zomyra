/**
 * Who is signed in, as far as the client knows.
 *
 * Deliberately **not persisted**: the tokens in expo-secure-store are the
 * durable source of truth (NFR-2), and `GET /me` (API-6) is what turns a token
 * into a routing decision on every cold start. Persisting a "signed in" flag
 * alongside them would just create a second copy that can disagree.
 *
 * Module 3 reads `status` for the root gate; Module 4 owns the screens that
 * drive it here.
 */
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** BE TDD §14.1 `GET /v1/me`. */
export type VerificationStatus = "unverified" | "pending" | "mismatch" | "verified";
/** BE TDD §14.1. O-4: the FE routing table has no destination for the last two. */
export type AccountStatus = "active" | "suspended" | "banned";

export type SessionStatus =
  /** Cold start: tokens not yet read off the keychain. */
  | "unknown"
  /** No tokens, or the refresh token was rejected. */
  | "anonymous"
  /** Tokens present. Says nothing about whether onboarding is finished. */
  | "authenticated";

export type SessionState = {
  status: SessionStatus;
  userId: string | null;
  /**
   * True once a refresh has failed and the user must sign in again (NFR-15).
   * Separate from `status: "anonymous"`, which is also the state of someone
   * who simply hasn't signed in yet — only one of the two should show a
   * "your session expired" message.
   */
  expired: boolean;
};

const initialState: SessionState = { status: "unknown", userId: null, expired: false };

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    /** Cold-start resolution: tokens were found on the keychain, or were not. */
    sessionResolved(state, action: PayloadAction<{ authenticated: boolean }>) {
      state.status = action.payload.authenticated ? "authenticated" : "anonymous";
    },
    signedIn(state, action: PayloadAction<{ userId?: string }>) {
      state.status = "authenticated";
      state.userId = action.payload.userId ?? null;
      state.expired = false;
    },
    signedOut() {
      return { status: "anonymous", userId: null, expired: false };
    },
    /**
     * The forced half of NFR-15 — dispatched by the base query when a refresh
     * is rejected, not by a screen.
     */
    sessionExpired() {
      return { status: "anonymous", userId: null, expired: true };
    },
    expiryAcknowledged(state) {
      state.expired = false;
    },
  },
});

export const { sessionResolved, signedIn, signedOut, sessionExpired, expiryAcknowledged } =
  sessionSlice.actions;

export const sessionReducer = sessionSlice.reducer;
