/**
 * The Google Sign-In SDK, behind one function.
 *
 * This is the *only* place `@react-native-google-signin/google-signin` is
 * imported. What comes out is an `idToken` (or a cancellation), which
 * `POST /auth/google` (API-3) exchanges for the token pair — so the SDK's
 * surface stops here and the rest of the app deals in the same
 * `AuthSessionResponse` that phone auth produces.
 *
 * ## Why the import is lazy
 *
 * The package's `errorCodes` module calls `NativeModule.getConstants()` **at
 * import time**, so a static import throws on any binary without the native
 * module linked — and it throws at *launch*, taking the whole app down rather
 * than the one button that needs it.
 *
 * That first mattered because the dev client on the simulator predated this
 * dependency, which is a transitional reason and not a good enough one on its
 * own — the answer to a stale dev client is to rebuild it, which Module 4 did.
 * **The durable reason is that stale dev clients are structural here.** C-2
 * makes every on-device run a dev-client build, and every native addition
 * invalidates every copy of it; `lottie-react-native` (Module 7) and
 * `expo-notifications` (Module 11) are already scheduled to do it twice more.
 * Each time, anyone who pulls before rebuilding gets either a crash on launch
 * with a stack trace pointing at Google's error codes, or a Google button that
 * says it is unavailable. The second is much easier to diagnose.
 *
 * It costs one `await` on a path that is already asynchronous, and it keeps the
 * mock path from touching native code at all. If that trade ever stops looking
 * worth it, making this a static import is a two-line change.
 *
 * ## The mock path
 *
 * With `USE_API_MOCKS` on, this returns a fixed fake `idToken` without going
 * near the SDK, so the rest of the flow — API-3, the token pair reaching the
 * keychain, FR-2a's consent screen, FR-1a's routing — is walkable before any
 * OAuth client exists (O-19). `USE_API_MOCKS` is reused rather than a second
 * flag on purpose: `env.ts` already guarantees it can never be true in a
 * `production` build, so this branch inherits that guarantee instead of
 * introducing a new way to reach it.
 */
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID, IS_GOOGLE_CONFIGURED } from "@/src/config/google";
import { USE_API_MOCKS } from "@/src/config/env";
import { isAndroid } from "@/src/utils/platform";

export type GoogleIdTokenResult =
  | { status: "success"; idToken: string }
  /**
   * §6.12's one unique branch: the user dismissed Google's consent sheet.
   * **No request was ever sent**, so there is nothing to retry and nothing to
   * report — the caller returns to Welcome silently.
   */
  | { status: "cancelled" }
  /** This build cannot do Google sign-in, or the device cannot. Tell the user. */
  | { status: "unavailable"; message: string };

/**
 * Not a credential — it is the string the mock API-3 handler recognises. The
 * real backend rejects it with `401 invalid_google_token`, which is the correct
 * outcome if this ever escaped into a build talking to a real host.
 */
export const MOCK_GOOGLE_ID_TOKEN = "mock-google-id-token";

const NOT_CONFIGURED_MESSAGE =
  "Google sign-in isn't set up in this build yet. Use your phone number instead.";

let configured = false;

export async function signInWithGoogle(): Promise<GoogleIdTokenResult> {
  if (USE_API_MOCKS) return { status: "success", idToken: MOCK_GOOGLE_ID_TOKEN };
  if (!IS_GOOGLE_CONFIGURED) return { status: "unavailable", message: NOT_CONFIGURED_MESSAGE };

  const { GoogleSignin, statusCodes, isErrorWithCode, isSuccessResponse } = await import(
    "@react-native-google-signin/google-signin"
  );

  if (!configured) {
    GoogleSignin.configure({
      // The audience the backend checks. Required on Android too — without it
      // the SDK returns a null `idToken` and the failure looks like a backend
      // problem rather than a configuration one.
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
      // `offlineAccess` would additionally return a `serverAuthCode` for the
      // backend to exchange for a Google refresh token. API-3 takes an
      // `idToken` and nothing else, so asking for it would request a broader
      // grant than the contract uses.
      offlineAccess: false,
    });
    configured = true;
  }

  try {
    // Android only; a no-op resolve on iOS. Without it a device with outdated
    // or absent Play Services fails inside `signIn()` with a less specific
    // error, which is exactly the class of device this app's market has.
    if (isAndroid) await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return { status: "cancelled" };

    const idToken = response.data.idToken;
    if (!idToken) {
      // Reachable with a mis-registered client: sign-in "succeeds" and returns
      // a user with no token to send anywhere. Named explicitly because the
      // generic message would send someone looking at the backend.
      return {
        status: "unavailable",
        message: "Google didn't return a sign-in token. Please try again or use your phone number.",
      };
    }
    return { status: "success", idToken };
  } catch (error) {
    if (isErrorWithCode(error)) {
      // iOS surfaces a dismissed sheet as a thrown code rather than the
      // `cancelled` response shape, so both spellings land on §6.12's silent
      // return. `IN_PROGRESS` means a sheet is already open — a double tap, not
      // a failure, and equally nothing to report.
      if (error.code === statusCodes.SIGN_IN_CANCELLED || error.code === statusCodes.IN_PROGRESS) {
        return { status: "cancelled" };
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return {
          status: "unavailable",
          message: "Google Play services isn't available on this device. Use your phone number instead.",
        };
      }
    }
    return {
      status: "unavailable",
      message: "Couldn't sign in with Google. Please try again or use your phone number.",
    };
  }
}

/**
 * Clears the SDK's own cached Google account so the next sign-in shows the
 * account picker again.
 *
 * Called from {@link import("./sign-out").signOut}, because the app's tokens and
 * Google's cached account are two separate pieces of state: without this, "Log
 * out" then "Continue with Google" silently re-signs in as the same person with
 * no picker — which on a shared device is the failure FE TDD §9.12 raises.
 * Deliberately best-effort: never let it block a sign-out.
 */
export async function forgetGoogleAccount(): Promise<void> {
  if (USE_API_MOCKS || !IS_GOOGLE_CONFIGURED) return;
  try {
    const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
    if (GoogleSignin.hasPreviousSignIn()) await GoogleSignin.signOut();
  } catch {
    // A failure here means the local Google session outlives ours. That is
    // worth neither an error to the user nor blocking their sign-out.
  }
}
