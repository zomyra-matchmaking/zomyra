/**
 * Environment configuration.
 *
 * Everything here comes from `EXPO_PUBLIC_*` variables, which Expo **inlines
 * into the shipped bundle at build time** (MIGRATION §11). That is correct for
 * a base URL and feature flags; it is never acceptable for a secret. Anything
 * that must stay private belongs on the backend, not here.
 *
 * The inlining also means `process.env.EXPO_PUBLIC_X` has to be written out
 * literally — Expo's Babel transform substitutes the exact member expression.
 * `process.env[name]` is not substituted and resolves to `undefined` in a
 * release bundle, so do not refactor these reads into a lookup helper.
 */

/**
 * Every backend route lives under `/v1` (BE TDD §7.1), while the frontend TDD
 * writes its paths without the prefix (`/auth/otp/verify`, not
 * `/v1/auth/otp/verify`). The prefix is carried here, once, so endpoint
 * definitions can be transcribed straight out of FE TDD §9 — and so a future
 * `/v2` is a one-line change rather than 37 of them (MIGRATION §5).
 */
export const API_VERSION_PREFIX = "/v1";

/**
 * Joins the configured host with {@link API_VERSION_PREFIX}, tolerating a URL
 * that already carries the prefix (or a trailing slash) so a correct-looking
 * `.env` value cannot silently produce `/v1/v1/...`.
 *
 * Exported so it can be exercised directly; use {@link API_BASE_URL} at call
 * sites.
 */
export function resolveApiBaseUrl(raw: string): string {
  const host = raw.trim().replace(/\/+$/, "");
  if (!host) return "";
  if (host.endsWith(API_VERSION_PREFIX)) return host;
  return `${host}${API_VERSION_PREFIX}`;
}

/** Host only, e.g. `https://api-staging.zomyra.com` — no `/v1`, no trailing slash. */
const API_HOST = process.env.EXPO_PUBLIC_API_URL ?? "";

/** Fully-qualified base URL every request is resolved against, `/v1` included. */
export const API_BASE_URL = resolveApiBaseUrl(API_HOST);

/**
 * Whether requests are served by the in-process mock transport instead of a
 * real host (see `src/api/mock/`).
 *
 * Defaults to **on when no host is configured**, which is the state O-8 leaves
 * the project in: the backend's base URL is not yet known. Set
 * `EXPO_PUBLIC_API_URL` and the app talks to it; set `EXPO_PUBLIC_API_MOCKS=1`
 * to force mocks back on even with a host present, which is how you develop a
 * screen against a backend that is up but incomplete.
 */
export const USE_API_MOCKS =
  process.env.EXPO_PUBLIC_API_MOCKS === "1" || API_BASE_URL === "";

/**
 * Per-request ceiling. Deliberately longer than the 3s decision window in
 * FR-11 — that 3s is a *server-side* budget after which verification returns
 * `200 { status: "pending" }`, not a client timeout. Cutting the client off at
 * 3s would turn a normal pending response into a spurious network error.
 */
export const API_TIMEOUT_MS = 20_000;
