/**
 * The two headers FE TDD §9 sends on every request, plus the one the backend
 * sends back.
 *
 * Both are observational only — nothing gates on them today. They exist so a
 * Sentry crash report and a backend log line can be joined to the same client
 * build (FE TDD §10.2).
 */
import Constants from "expo-constants";

export const HEADER_APP_VERSION = "X-App-Version";
export const HEADER_BUNDLE_UPDATE_ID = "X-Bundle-Update-Id";
/** Backend-issued (BE TDD §7.1), echoed on responses. Captured onto errors. */
export const HEADER_REQUEST_ID = "X-Request-Id";

/** Native app version from `app.json`. Falls back rather than throwing. */
export const APP_VERSION: string = Constants.expoConfig?.version ?? "0.0.0";

/**
 * The OTA bundle currently running.
 *
 * FE TDD §9 defines the value for a build that has never received an OTA
 * update as the literal `"embedded"`. **That is exactly this project's state,
 * so this is an accurate value, not a placeholder:** Module 0 deliberately did
 * not install `expo-updates` (it drags in `runtimeVersion` policy decisions),
 * nothing has ever been published to an update channel, and every build runs
 * the JS embedded in the binary.
 *
 * Module 2's explicit decision, rather than leaving the header off by
 * omission: **send both headers now.** The correlation FE TDD §10.2 wants
 * works from day one, and when `expo-updates` is installed this constant
 * becomes `Updates.updateId ?? "embedded"` — a one-line change in one file,
 * with every call site already sending the header.
 */
export const BUNDLE_UPDATE_ID = "embedded";
