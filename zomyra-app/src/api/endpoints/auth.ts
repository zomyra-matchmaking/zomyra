/**
 * Auth endpoints — API-1, API-2 and API-3 (FE TDD §9.1).
 *
 * API-4 (`POST /auth/refresh`) is deliberately **not** an endpoint here: it is
 * called from inside the base query, behind the shared in-flight promise, and
 * exposing it as a hook would invite a screen to call it directly and break the
 * single-refresh guarantee (MIGRATION §5).
 *
 * Module 4 owns the auth *screens*; this file owns the calls they make.
 */
import { setTokens } from "@/src/auth/tokens";
import { signedIn } from "@/src/store/slices/session-slice";

import { api } from "../api";
import type {
  AuthSessionResponse,
  GoogleAuthBody,
  OtpRequestBody,
  OtpRequestResponse,
  OtpVerifyBody,
} from "../contract";

/**
 * The shared tail of every sign-in: tokens to the keychain, session to the
 * store. Written once so that **no screen ever holds a token in component
 * state**, and so a fourth sign-in path could not land them differently from
 * the first three.
 *
 * It hangs off `onQueryStarted` so that **no sign-in path can forget to do it**
 * — a fourth screen calling `verifyOtp` gets the tokens landed whether or not
 * it remembers to ask.
 *
 * ⚠️ **`onQueryStarted` does not finish before the caller's `await` does, and
 * assuming it did was M55-007.** RTK Query *starts* this hook before the
 * trigger promise resolves; it never *awaits* its continuation. So
 * `await queryFulfilled` → `await setTokens(...)` → `dispatch(signedIn({}))`
 * was routinely still in flight when the screen did `router.replace("/")`, the
 * root gate read `session.status !== "authenticated"`, and a correct sign-in
 * landed back on Welcome. It reproduced 4/4 under Maestro and never once by
 * hand, because a human takes longer to move their thumb than the keychain
 * takes to answer.
 *
 * The sequencing therefore cannot be implicit. {@link sessionAdopted} exposes
 * this work as something a caller can await, and **every screen must await it
 * before navigating** — see `app/otp.tsx` and `app/login.tsx`.
 *
 * ## A deferred optimisation, and this is where it would go
 *
 * Both auth screens `replace("/")`, so the gate then fetches `GET /me` — one
 * extra round trip per sign-in. (Only one: API-5 is already cached from the
 * launch that reached Welcome, and the wait is covered by the shared loading
 * state, so nothing flashes.)
 *
 * It could be **zero**. If API-2/API-3 ever return the same object `GET /me`
 * returns, this function seeds the cache instead of leaving the gate to ask:
 *
 *     dispatch(api.util.upsertQueryData("getMe", undefined, data));
 *
 * ⚠️ **The shape of the ask matters more than the ask.** Request `GET /me`'s
 * *whole object*, not two or three loose extra fields — otherwise there are two
 * overlapping shapes describing one user and they can disagree, which is
 * precisely the drift O-11 exists to prevent while no schema is served.
 *
 * Deliberately not requested yet (owner, 2026-08-03): it optimises something
 * that is not hurting, on endpoints that are still `404`, and wants measuring
 * against real staging on real Indian mobile networks first. See MIGRATION §6's
 * Module 4 entry.
 */
type QueryLifecycle = {
  dispatch: (action: unknown) => unknown;
  queryFulfilled: Promise<{ data: AuthSessionResponse }>;
};

/**
 * The adoption started by the most recent sign-in mutation.
 *
 * Module-level rather than per-hook because the two things that need to meet
 * are in different places: the work starts in middleware, and the wait happens
 * in a screen that holds no reference to it. Seeded resolved so
 * {@link sessionAdopted} is safe to call before any sign-in has ever run.
 */
let adoption: Promise<void> = Promise.resolve();

function adoptSession({ dispatch, queryFulfilled }: QueryLifecycle): Promise<void> {
  /*
   * Assigned **synchronously**, which is the load-bearing detail. RTK Query
   * invokes `onQueryStarted` while handling the mutation's `pending` action —
   * dispatched before the trigger returns its promise — so by the time any
   * caller can `await` the mutation, `adoption` already refers to this run and
   * not to the previous one.
   */
  adoption = (async () => {
    const { data } = await queryFulfilled;
    await setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    dispatch(signedIn({}));
  })();

  // The rejection is reported to the caller through `sessionAdopted()` (and,
  // for a plain request failure, through the mutation's own `error`). Returning
  // it un-caught here would additionally surface it as an unhandled rejection.
  return adoption.catch(() => {});
}

/**
 * Resolves once the in-flight sign-in has put its tokens on the keychain and
 * marked the session authenticated — `true` if it got there, `false` if it did
 * not.
 *
 * **Call this after a sign-in mutation resolves and before navigating.** The
 * mutation resolving means the *server* answered; it does not mean the client
 * has adopted the answer, and the root gate routes on the latter (M55-007).
 *
 * `false` is a genuinely different failure from a rejected mutation: the
 * credentials were accepted and the keychain write is what failed, so there is
 * nothing to correct in the form and the only useful advice is to try again.
 *
 * Meaningful only immediately after a sign-in mutation settles. Called out of
 * that context it reports on whatever sign-in happened last, or `true` if none
 * has.
 */
export async function sessionAdopted(): Promise<boolean> {
  try {
    await adoption;
    return true;
  } catch {
    return false;
  }
}

export const authApi = api.injectEndpoints({
  endpoints: (build) => ({
    /** API-1. Errors: `invalid_phone_number`, `rate_limited`, `sms_delivery_failed`. */
    requestOtp: build.mutation<OtpRequestResponse, OtpRequestBody>({
      query: (body) => ({ url: "/auth/otp/request", method: "POST", body }),
      extraOptions: { skipAuth: true },
    }),

    /** API-2. Errors: `invalid_otp`, `otp_expired`, `too_many_attempts`. */
    verifyOtp: build.mutation<AuthSessionResponse, OtpVerifyBody>({
      query: (body) => ({ url: "/auth/otp/verify", method: "POST", body }),
      extraOptions: { skipAuth: true },
      onQueryStarted: (_arg, lifecycle) => adoptSession(lifecycle),
    }),

    /**
     * API-3. The `idToken` comes from the Google Sign-In SDK
     * (`src/auth/google.ts`). Error: `401 invalid_google_token`.
     *
     * **Phone and Google are fully independent identities — no account
     * linking** (API-3's own note, BE §9 `users.phone_number` / `users.google_id`
     * both nullable). Someone who signed up by phone and later uses Google gets
     * a second account. Accepted MVP behaviour, not a defect to work around
     * here; BE §12 lists linking as post-MVP.
     */
    googleSignIn: build.mutation<AuthSessionResponse, GoogleAuthBody>({
      query: (body) => ({ url: "/auth/google", method: "POST", body }),
      extraOptions: { skipAuth: true },
      onQueryStarted: (_arg, lifecycle) => adoptSession(lifecycle),
    }),
  }),
});

export const { useRequestOtpMutation, useVerifyOtpMutation, useGoogleSignInMutation } = authApi;
