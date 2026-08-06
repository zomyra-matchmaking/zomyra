/**
 * The client's own description of itself — platform, OS, model, install id.
 *
 * Sent as one compact `X-Client-Info` header on every request (FE §9, BE §7.1)
 * and as `platform` on `POST /consents` (API-40). Two consumers, one source, so
 * a consent row and a Sentry event can never disagree about what the client was.
 *
 * **Why a header rather than a `POST /devices` endpoint** (owner's decision,
 * 2026-08-06): a backend Sentry event has no client context of its own. A
 * client-side Sentry SDK attaches device data to *its* events, but it cannot
 * annotate a 500 raised inside the server — and Sentry is not even installed on
 * this client yet, so today the backend's is the only one that exists. A header
 * is the only channel that carries client context into a backend error report.
 * The backend puts it on the Sentry scope and upserts a `devices` row when the
 * tuple changes, so the analytics table is still deduplicated; request-scoped
 * rows keep only the device id.
 *
 * **What is deliberately *not* here:**
 *
 * - **`Constants.deviceName` on iOS.** It returns the user-assigned device name,
 *   which is very often the owner's real name ("Priya's iPhone"). Putting that
 *   in a header on every request would leak a legal name into every backend log
 *   line and Sentry event. iOS therefore reports no model at all — see
 *   {@link deviceModel}.
 * - **Manufacturer, model and OS build on iOS.** Those need `expo-device`, which
 *   is a native module and so a dev-client rebuild on both devices (C-2). Not
 *   worth it until something concrete needs the field.
 * - **IDFV / `ANDROID_ID`.** {@link loadDeviceId} generates a random id instead;
 *   see there for why.
 */
import Constants from "expo-constants";
import { Platform } from "react-native";

import { storage } from "@/src/utils/storage";

/**
 * `app.json` declares `"platforms": ["ios", "android"]`, so `Platform.OS` cannot
 * return `web` here and this narrowing is exact rather than optimistic. If web
 * is ever added as a build target this becomes a lie, and the backend's enum
 * needs a third value before it can stop being one.
 */
export type ClientPlatform = "ios" | "android";
export const CLIENT_PLATFORM: ClientPlatform = Platform.OS === "ios" ? "ios" : "android";

const DEVICE_ID_KEY = "zomyra.device.id";

/**
 * Header values are a constrained grammar, and device strings are not: a model
 * can carry spaces (`Redmi Note 12 Pro+`), punctuation, or non-ASCII. An
 * unescaped `\r\n` in a header value is header injection, and `;` would split a
 * field in the grammar below. Everything outside a conservative set collapses to
 * `_`, and the result is capped — a header no backend can parse is worse than a
 * missing one.
 */
function headerSafe(value: string, maxLength = 32): string {
  return value.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, maxLength) || "unknown";
}

/**
 * OS version, as a human reads it.
 *
 * Android's `Platform.Version` is the **SDK level** (`34`), not the release the
 * user would recognise (`14`); `Platform.constants.Release` is the latter. iOS's
 * `Platform.Version` is already the release string.
 */
function osVersion(): string {
  if (Platform.OS === "android") {
    const constants = Platform.constants as { Release?: string };
    return headerSafe(constants.Release ?? String(Platform.Version));
  }
  return headerSafe(String(Platform.Version));
}

/**
 * Brand and model, Android only.
 *
 * `Platform.constants` carries `Brand`/`Model` on Android at no cost — no extra
 * dependency, no rebuild. iOS exposes no equivalent without `expo-device`, and
 * the one free iOS signal (`Constants.deviceName`) is the owner's name more
 * often than not, so iOS reports nothing rather than reporting a person.
 */
function deviceModel(): string | undefined {
  if (Platform.OS !== "android") return undefined;
  const constants = Platform.constants as { Brand?: string; Model?: string };
  const parts = [constants.Brand, constants.Model].filter(Boolean).join("_");
  return parts ? headerSafe(parts) : undefined;
}

/** Native app version from `app.json` — the same value `X-App-Version` carries. */
const APP_VERSION: string = Constants.expoConfig?.version ?? "0.0.0";

/**
 * Everything that cannot change while the process is alive, resolved once.
 * `Platform` is a native constant table; re-reading it per request buys nothing.
 */
const STATIC_FIELDS: string = [
  `p=${CLIENT_PLATFORM}`,
  `os=${osVersion()}`,
  ...(deviceModel() ? [`m=${deviceModel()}`] : []),
  `a=${headerSafe(APP_VERSION)}`,
].join("; ");

/**
 * A random, resettable install id — **not** IDFV and **not** `ANDROID_ID`.
 *
 * A hardware identifier survives uninstall, is shared across every app by the
 * same vendor, and cannot be reset by the user; under the DPDP Act that is a
 * much harder collection to justify for a matrimony app than a value the user
 * clears by reinstalling. This one is generated on first use and is meaningless
 * outside our own logs.
 *
 * ⚠️ **Not cryptographically random, and that is correct here.** `uuid` is a
 * declared dependency but is imported nowhere and would need
 * `crypto.getRandomValues`, which this runtime does not polyfill — reaching for
 * it would trade a correlation id for a crash on every request. This value is
 * never a credential, never authenticates anything, and never gates access; it
 * only has to be unique. If a Web Crypto polyfill lands later, swap the
 * generator and leave everything else alone.
 *
 * It lives in secure store beside the tokens but is **deliberately not cleared
 * by `clearTokens()`** — the device is the same device after a sign-out, and
 * regenerating the id on every logout would make the `devices` table grow one
 * row per session and break exactly the correlation it exists for.
 */
function generateId(): string {
  const block = () => Math.random().toString(16).slice(2, 10).padStart(8, "0");
  return `${block()}-${block()}-${block()}-${block()}`;
}

let cachedId: string | undefined;
let loading: Promise<string> | null = null;

/**
 * Reads the install id, generating and persisting one on first launch.
 *
 * Shares its in-flight promise for the same reason `loadTokens` does: a burst of
 * requests at cold start must not race to generate four different ids and have
 * the last write win.
 */
export async function loadDeviceId(): Promise<string> {
  if (cachedId) return cachedId;
  if (!loading) {
    loading = (async () => {
      const stored = await storage.secureGet<string>(DEVICE_ID_KEY, "");
      const id = stored || generateId();
      if (!stored) await storage.secureSet(DEVICE_ID_KEY, id);
      cachedId = id;
      loading = null;
      return id;
    })();
  }
  return loading;
}

/**
 * The `X-Client-Info` value, e.g. `p=android; os=14; m=google_Pixel_7;
 * a=1.0.0; d=1a2b3c4d-…`.
 *
 * Key-value rather than JSON on purpose: JSON in a header means quoting and
 * escaping every consumer has to get right, and it lands in every log line at
 * several times the size. This is ~60 bytes and, because the value is identical
 * on every request in a session, HTTP/2 header compression makes repeats
 * effectively free.
 */
export function clientInfoHeader(deviceId: string): string {
  return `${STATIC_FIELDS}; d=${headerSafe(deviceId, 40)}`;
}
