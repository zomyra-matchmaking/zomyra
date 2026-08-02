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
 * `forceUpdate` is honoured **as well as** the version arithmetic, not instead
 * of it: it is the backend's escape hatch for forcing an update without moving
 * `minSupportedVersion`, and treating it as advisory would make it useless.
 */
export function resolveUpdateRequirement(
  current: string,
  response: VersionCheckResponse,
): UpdateRequirement {
  if (response.forceUpdate) return "blocked";
  if (compareVersions(current, response.minSupportedVersion) < 0) return "blocked";
  if (compareVersions(current, response.latestVersion) < 0) return "optional";
  return "none";
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
