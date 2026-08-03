/**
 * Google Sign-In client IDs (FR-1, §6.12, API-3).
 *
 * ## Three clients, three different jobs
 *
 * Google Cloud Console issues a **separate OAuth client per platform** and they
 * are not interchangeable. Getting this wrong is the single most common way
 * Google Sign-In fails, and it fails at the consent sheet rather than at build
 * time, so it is written down here:
 *
 * | Client | What it does | Where it lives |
 * |---|---|---|
 * | **Web application** | Its ID is the `aud` claim of the `idToken`. Both platforms send it as `webClientId`. **This is what the backend validates against.** | {@link GOOGLE_WEB_CLIENT_ID}, runtime |
 * | **iOS** | Bound to bundle id `com.zomyra.app`. Its *reversed* form is a URL scheme in `Info.plist`. | {@link GOOGLE_IOS_CLIENT_ID}, runtime **and** build time — see `app.config.js` |
 * | **Android** | Bound to package `com.zomyra.app` + the SHA-1 of the signing cert. **No ID goes in the app** — Android resolves it by package and signature. If it does not exist, sign-in fails with `DEVELOPER_ERROR` (code 10). | Google Cloud Console only |
 *
 * ⚠️ The Android SHA-1 must be the **EAS** keystore's, not the local debug
 * keystore's. An `internal`-distribution APK is signed by EAS, so a client
 * registered against `~/.android/debug.keystore` produces `DEVELOPER_ERROR` on
 * exactly the build being tested. See MIGRATION §4 (O-19).
 *
 * ## Why these are `EXPO_PUBLIC_*` and why that is safe
 *
 * MIGRATION §11 is explicit that `EXPO_PUBLIC_*` values are **inlined into the
 * shipped bundle** and are therefore never acceptable for a secret. An OAuth
 * *client ID* is not a secret — it is public by construction, present in every
 * shipped Android and iOS app that uses Google Sign-In, and useless without the
 * registered bundle id / package + signature. The client *secret*, which is a
 * secret, belongs to the backend's token exchange and never touches this app.
 */
import { isIOS } from "@/src/utils/platform";

/**
 * The audience the backend validates. Required on **both** platforms — Android
 * needs it to be issued an `idToken` at all, not just for offline access.
 */
export const GOOGLE_WEB_CLIENT_ID: string =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

/** iOS only. `app.config.js` derives the `Info.plist` URL scheme from this. */
export const GOOGLE_IOS_CLIENT_ID: string =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";

/**
 * Whether this build can actually reach Google's consent sheet.
 *
 * ⚠️ **Deliberately not a throw**, unlike `env.ts`'s missing-host guard. That
 * one refuses to boot because a `production` build with no host would ship
 * fabricated profiles to real people — silence there is dangerous. Missing
 * Google IDs are the opposite: phone auth still works, so the honest response
 * is one disabled button with a reason, not a dead app. `app.config.js` makes
 * the same call on the native side by omitting the plugin, so the two halves
 * cannot disagree about whether Google is available.
 */
export const IS_GOOGLE_CONFIGURED: boolean =
  GOOGLE_WEB_CLIENT_ID !== "" && (!isIOS || GOOGLE_IOS_CLIENT_ID !== "");
