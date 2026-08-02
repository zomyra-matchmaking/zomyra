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

/*
 * `VerificationStatus` and `AccountStatus` used to be re-declared here. They
 * were deleted in Module 3 rather than corrected: they were an unimported
 * second copy of `src/api/contract.ts`'s, they still carried O-4's "the FE
 * routing table has no destination" comment after v1.45 closed it, and
 * `AccountStatus` was missing `deleted` — so anyone who did import them would
 * have got a union that rejects a value `GET /me` really returns. The contract
 * types are the single source; import them from `@/src/api`.
 */

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
  /**
   * The account is not `active` (FE v1.45 §8.1, BE v1.6 §9.9) — suspended,
   * banned, or soft-deleted inside FR-28's grace window.
   *
   * **Deliberately a boolean, not the status.** The blocker is one static
   * screen with no distinction between the three causes, so storing which one
   * it was would be storing something nothing is allowed to read. The backend
   * keeps the three codes apart for support diagnostics; the client does not.
   *
   * Set from two places, and both matter: the root gate, when `GET /me` reports
   * a non-active `accountStatus` at cold start; and the base query, when any
   * authenticated call comes back `403 account_*` mid-session — enforcement is
   * request-level, so it does not only happen at launch.
   *
   * **Not persisted, like everything else in this slice.** It is server state,
   * and a stale `true` on disk would lock a reinstated account out of its own
   * app with no way back — the blocker has no retry by design.
   */
  blocked: boolean;
};

const initialState: SessionState = {
  status: "unknown",
  userId: null,
  expired: false,
  blocked: false,
};

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
      state.blocked = false;
    },
    signedOut() {
      return { status: "anonymous", userId: null, expired: false, blocked: false };
    },
    /**
     * The forced half of NFR-15 — dispatched by the base query when a refresh
     * is rejected, not by a screen.
     */
    sessionExpired() {
      return { status: "anonymous", userId: null, expired: true, blocked: false };
    },
    expiryAcknowledged(state) {
      state.expired = false;
    },
    /**
     * A non-active account was observed. Dispatched by the base query on a
     * `403 account_*` and by the root gate on `GET /me`.
     *
     * ⚠️ **`status` deliberately stays `authenticated`.** BE §9.9 does not
     * revoke the session: the tokens remain valid and refresh keeps working,
     * which is what lets `GET /me` — one of the two exempt endpoints — still
     * answer. Downgrading to `anonymous` here would send the user to Login,
     * where signing back in would succeed and land them straight back on the
     * blocker. This is a usage gate, not a logout.
     */
    accountBlocked(state) {
      state.blocked = true;
    },
  },
});

export const {
  sessionResolved,
  signedIn,
  signedOut,
  sessionExpired,
  expiryAcknowledged,
  accountBlocked,
} = sessionSlice.actions;

export const sessionReducer = sessionSlice.reducer;
