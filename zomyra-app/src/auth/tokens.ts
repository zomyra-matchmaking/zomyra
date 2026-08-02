/**
 * Access and refresh token storage — NFR-2.
 *
 * Tokens live in **expo-secure-store only** (Keychain on iOS,
 * EncryptedSharedPreferences on Android). They are explicitly excluded from
 * redux-persist and must never be written to AsyncStorage (FE TDD §4.3).
 * `src/utils/storage`'s `secure*` methods have wrapped SecureStore correctly
 * since the prototype and were never called, because until this module there
 * were no tokens to store; this file is their first caller.
 *
 * A synchronous in-memory mirror sits in front of the keychain. Every request
 * needs the access token, and a Keychain read per request is both slow and
 * pointless when the value only changes at sign-in, refresh and sign-out. The
 * keychain stays the durable source of truth; memory is the cache, seeded once
 * per launch by `loadTokens()`.
 */
import { storage } from "@/src/utils/storage";

const ACCESS_TOKEN_KEY = "zomyra.auth.accessToken";
const REFRESH_TOKEN_KEY = "zomyra.auth.refreshToken";

export type TokenPair = { accessToken: string; refreshToken: string };

let cache: Partial<TokenPair> = {};
let loaded = false;
let loading: Promise<void> | null = null;

/**
 * Reads both tokens off the keychain into memory. Idempotent, and safe to call
 * concurrently — the in-flight promise is shared, so a burst of requests at
 * cold start performs one pair of keychain reads, not one pair each.
 */
export async function loadTokens(): Promise<void> {
  if (loaded) return;
  if (!loading) {
    loading = (async () => {
      const [access, refresh] = await Promise.all([
        storage.secureGet<string>(ACCESS_TOKEN_KEY, ""),
        storage.secureGet<string>(REFRESH_TOKEN_KEY, ""),
      ]);
      cache = { accessToken: access || undefined, refreshToken: refresh || undefined };
      loaded = true;
      loading = null;
    })();
  }
  return loading;
}

export async function getAccessToken(): Promise<string | undefined> {
  await loadTokens();
  return cache.accessToken;
}

export async function getRefreshToken(): Promise<string | undefined> {
  await loadTokens();
  return cache.refreshToken;
}

/**
 * Reads the cached access token without touching the keychain. Only valid
 * after `loadTokens()` has resolved; used by the base query, which awaits it.
 */
export function peekAccessToken(): string | undefined {
  return cache.accessToken;
}

export async function setTokens({ accessToken, refreshToken }: TokenPair): Promise<void> {
  cache = { accessToken, refreshToken };
  loaded = true;
  await Promise.all([
    storage.secureSet(ACCESS_TOKEN_KEY, accessToken),
    storage.secureSet(REFRESH_TOKEN_KEY, refreshToken),
  ]);
}

/** Sign-out and the force-logout path (NFR-15) both land here. */
export async function clearTokens(): Promise<void> {
  cache = {};
  loaded = true;
  await Promise.all([
    storage.secureRemove(ACCESS_TOKEN_KEY),
    storage.secureRemove(REFRESH_TOKEN_KEY),
  ]);
}
