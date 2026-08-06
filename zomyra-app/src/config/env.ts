/**
 * Environment configuration — which backend this build talks to.
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
 *
 * **Where the values come from:** EAS build profiles (`eas.json` → `build.*.env`)
 * for anything built in the cloud, and a local `.env` for `expo start` /
 * `expo run:*`. `.env.example` is the template.
 */

/**
 * Which backend this build is pointed at.
 *
 * This is a *named environment*, not just a URL, because more than the URL
 * depends on it — Sentry's `environment` tag (FE TDD §10.2), whether dev-only
 * affordances are allowed to exist, and which mistakes are worth refusing to
 * boot over.
 *
 * - `mock`       — no backend. Requests are served in-process by `src/api/mock/`.
 * - `staging`    — the deployed dev/staging API (O-8, §2.3).
 * - `production` — the live API. Real users, real data.
 */
export type AppEnvironment = "mock" | "staging" | "production";

const RAW_APP_ENV = process.env.EXPO_PUBLIC_APP_ENV ?? "";

/**
 * Exported as a testable seam (Module 5.5, M2-005). The dangerous behaviour —
 * an invalid value throwing rather than silently defaulting to `production` —
 * is a property of this function, but `APP_ENV` invokes it at import time off a
 * value Expo inlines at build time, so it cannot be re-exercised per test
 * through that constant. Exposing the pure function is the seam; nothing else
 * about the check moved.
 */
export function parseAppEnvironment(raw: string): AppEnvironment {
  const value = raw.trim().toLowerCase();
  if (value === "staging" || value === "production" || value === "mock") return value;
  if (value === "") return "mock";
  throw new Error(
    `[config] EXPO_PUBLIC_APP_ENV is "${raw}", which is not a known environment. ` +
      `Expected one of: mock, staging, production. Set it in eas.json (build.<profile>.env) ` +
      `for cloud builds, or in .env for local runs.`,
  );
}

/**
 * Defaults to `mock` when unset, so a fresh clone with no `.env` runs against
 * the in-process mocks rather than erroring. Every profile that should talk to
 * a real host sets this explicitly in `eas.json`.
 */
export const APP_ENV: AppEnvironment = parseAppEnvironment(RAW_APP_ENV);

export const IS_PRODUCTION = APP_ENV === "production";

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

/**
 * ⚠️ **Refuses to boot rather than quietly doing the wrong thing.**
 *
 * The dangerous failure this prevents is specific: a `production` build whose
 * `EXPO_PUBLIC_API_URL` was never set. Without this check it would fall back to
 * the mock transport and ship to real users showing **fabricated profiles** —
 * an app that looks like it works, on invented people. A build that dies on
 * launch is caught by whoever installs it first; one that silently serves
 * fixtures might not be caught at all.
 *
 * It throws at import time, which means the very first launch of any staging or
 * production build surfaces it — long before a store submission.
 */
function requireHost(environment: AppEnvironment, host: string): string {
  if (host.trim()) return host;
  throw new Error(
    `[config] EXPO_PUBLIC_APP_ENV is "${environment}" but EXPO_PUBLIC_API_URL is empty. ` +
      `A ${environment} build must have a real host — falling back to mocks here would ship ` +
      `fake data. Set EXPO_PUBLIC_API_URL in eas.json (build.<profile>.env) for cloud builds, ` +
      `or in .env for local runs. Use EXPO_PUBLIC_APP_ENV=mock if you meant to run offline.`,
  );
}

/** Fully-qualified base URL every request resolves against, `/v1` included. */
export const API_BASE_URL: string =
  APP_ENV === "mock" ? resolveApiBaseUrl(API_HOST) : resolveApiBaseUrl(requireHost(APP_ENV, API_HOST));

/**
 * Whether requests are served by the in-process mock transport
 * (`src/api/mock/`) instead of a real host.
 *
 * Three rules, in priority order:
 *
 * 1. **`production` can never use mocks** — not via `EXPO_PUBLIC_API_MOCKS`,
 *    not by omission. That flag is a development tool, and a tool that can
 *    reach a production build is a way to ship fixtures to real users.
 * 2. **`mock` always uses mocks.** The environment is *named*; `mock` means
 *    mock, whether or not a host also happens to be configured.
 * 3. In `staging`, `EXPO_PUBLIC_API_MOCKS=1` forces mocks on. This is how you
 *    build a screen against a backend that is up but incomplete.
 *
 * ⚠️ **Rule 2 was a bug until Module 3, and it was a quiet one.** The rule used
 * to be "mocks are on exactly when there is no host", on the reasoning that no
 * host *is* `APP_ENV=mock`. That equivalence held only while `O-8` had no URL
 * to put anywhere. Once staging came up on 2026-08-02 and `.env` gained
 * `EXPO_PUBLIC_API_URL` **beneath** an `APP_ENV=mock` it was deliberately
 * keeping — precisely the arrangement MIGRATION §6 describes, so that flipping
 * one word switches hosts — the two stopped meaning the same thing and
 * `USE_API_MOCKS` computed `false`. The app then talked to a staging server
 * where phone auth is not deployed, so every login attempt 404'd and the screen
 * silently declined to navigate, looking exactly like a broken button. Module 3
 * lost time to it before spotting it.
 */
const MOCKS_REQUESTED = process.env.EXPO_PUBLIC_API_MOCKS === "1";

export const USE_API_MOCKS: boolean = IS_PRODUCTION
  ? false
  : APP_ENV === "mock" || MOCKS_REQUESTED || API_BASE_URL === "";

/**
 * Per-request ceiling. Deliberately longer than the 3s decision window in
 * FR-11 — that 3s is a *server-side* budget after which verification returns
 * `200 { status: "pending" }`, not a client timeout. Cutting the client off at
 * 3s would turn a normal pending response into a spurious network error.
 */
export const API_TIMEOUT_MS = 20_000;
