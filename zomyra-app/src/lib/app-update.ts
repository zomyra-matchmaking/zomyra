/**
 * FR-30 / FE TDD §6.14 — turning API-5's response into one of **three**
 * outcomes.
 *
 * Kept out of the gate screen so the ordering rule and the comparison are
 * readable on their own, and so the "fails open" contract is stated in the one
 * place that decides it.
 *
 * ⚠️ **This is the native-binary check only.** JS-bundle staleness (OTA updates
 * via expo-updates / EAS Update) is a separate mechanism with no endpoint,
 * no modal, and no blocking UI at all (§6.14). Do not conflate them: this one
 * can stop the app dead, that one silently downloads and applies on the next
 * launch.
 */
import type { VersionCheckResponse } from "@/src/api";

export type UpdateRequirement =
  /**
   * Below `minSupportedVersion`, or the backend set `forceUpdate`. Full-screen,
   * non-dismissible; the app goes no further (FR-30).
   */
  | "blocked"
  /** Below `latestVersion` but at or above the minimum. Dismissible prompt. */
  | "optional"
  /** At or above `latestVersion`, or the check failed. Proceed silently. */
  | "none";

/**
 * Compares two dotted version strings numerically. Returns `-1` when `a` is
 * older than `b`, `1` when newer, `0` when equal.
 *
 * Missing segments count as zero, so `"1.2"` and `"1.2.0"` compare equal, and a
 * non-numeric segment degrades to zero rather than producing `NaN` — which
 * would make every comparison false and silently disable the gate. A version
 * string this client cannot parse must not be the reason a forced update is
 * skipped.
 */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const parse = (v: string) => v.trim().split(".").map((part) => Number.parseInt(part, 10) || 0);
  const left = parse(a);
  const right = parse(b);
  const length = Math.max(left.length, right.length);

  for (let i = 0; i < length; i += 1) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    if (l < r) return -1;
    if (l > r) return 1;
  }
  return 0;
}

/**
 * The three-way decision, in FR-30's order.
 *
 * ⚠️ **Nothing here can block a client that is already on `latestVersion`.**
 * Both blocking paths are gated on there being a newer build to go to, and that
 * guard is the whole point rather than a detail. An "Update required" screen is
 * non-dismissible and its only control is a store link; showing it to someone
 * already running the newest version gives them a dead end with no action —
 * force-quit, reopen, same screen. That is worse than any staleness it could
 * prevent, and it is reachable two ways: a backend that sets `forceUpdate`
 * broadly, or one that ships `minSupportedVersion > latestVersion` by mistake.
 *
 * `forceUpdate` is otherwise honoured **as well as** the version arithmetic,
 * not instead of it — it is the backend's lever for forcing an update without
 * moving `minSupportedVersion`, and treating it as advisory would make it
 * useless.
 */
export function resolveUpdateRequirement(
  current: string,
  response: VersionCheckResponse,
): UpdateRequirement {
  const behindLatest = compareVersions(current, response.latestVersion) < 0;
  if (!behindLatest) return "none";

  if (response.forceUpdate) return "blocked";
  if (compareVersions(current, response.minSupportedVersion) < 0) return "blocked";
  return "optional";
}

/** How long a dismissed "Update available" prompt stays dismissed. */
export const UPDATE_PROMPT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Whether the **dismissible** prompt should be shown this launch.
 *
 * FR-30 says an optional update is "shown, then the app continues loading
 * normally" and stops there — it sets no frequency. Taken literally that is a
 * modal on *every single cold start* until the user updates, which is nagging
 * rather than informing, and trains people to dismiss it without reading.
 *
 * Owner decision (2026-08-02): **at most once per version, then quiet for a
 * week.** Keyed on `latestVersion` as well as time so a genuinely new release
 * prompts immediately instead of inheriting the previous one's cooldown — the
 * cooldown suppresses repetition, not news.
 *
 * The blocking path deliberately does not consult this. A forced update is not
 * a notification and has nothing to snooze.
 */
export function shouldShowUpdatePrompt(
  latestVersion: string,
  storeUrl: string | undefined,
  lastPrompt: { version: string | null; at: number | null },
  now: number = Date.now(),
): boolean {
  /*
   * ⚠️ **No store link, no prompt.** An optional update the user cannot act on
   * is pure noise: the dialog would offer "Not now" and nothing else, so the
   * only thing it can tell them is that they are out of date and stuck. Owner
   * decision (2026-08-02).
   *
   * Note the asymmetry with the **blocking** screen, which still renders
   * without a URL — there it hides its button but must go on blocking, because
   * the client is genuinely below the minimum and letting it through would be
   * worse than a dead-end message. Optional means optional; required means
   * required, link or no link.
   *
   * Both cases are backend misconfigurations rather than expected states
   * (see `docs/CONTRACT-QUESTIONS.md` — `updateUrl` should be guaranteed
   * non-empty whenever the response is actionable), so this is a guard against
   * a mistake, not a supported flow.
   */
  if (!storeUrl) return false;

  if (lastPrompt.version !== latestVersion) return true;
  if (lastPrompt.at === null) return true;
  return now - lastPrompt.at >= UPDATE_PROMPT_COOLDOWN_MS;
}

/**
 * **API-5 fails open, by contract.**
 *
 * FE §9.1 spells out the negative path: a network or timeout failure *skips the
 * check for this launch* rather than blocking on it. The failure mode this
 * prevents is specific and bad — a user on a flaky Indian mobile network, or a
 * backend having a five-minute outage, being shown an un-dismissible "Update
 * required" screen for an update that does not exist and cannot be escaped.
 *
 * Named here rather than left as a bare `if (error) return "none"` at the call
 * site so the intent survives someone later "fixing" the gate to surface the
 * error.
 */
export const UPDATE_REQUIREMENT_ON_ERROR: UpdateRequirement = "none";
