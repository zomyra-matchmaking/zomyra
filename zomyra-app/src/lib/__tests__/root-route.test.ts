/**
 * M3-002 — `resolveRootDestination` is a pure function of `GET /me`, and
 * `accountStatus` short-circuits before the `profileComplete` branch.
 *
 * Converts the `static` "read the code" case (TEST-CASES.md M3-002) to `build`.
 * The two load-bearing claims are behavioural, not structural, so they can be
 * asserted rather than read:
 *   - purity: same input → same output, no observable side effect;
 *   - ordering: a non-`active` account reaches `/blocked` even when every field
 *     below it (`profileComplete`, `verificationStatus`, `consents`) would have
 *     routed elsewhere. That is O-4's early return, and a reordering into a
 *     fifth "column" is exactly what this catches.
 */
import { resolveRootDestination } from "@/src/lib/root-route";
import type { Consent, MeResponse } from "@/src/api";

/** A verified, fully-onboarded, Discover-ready account — every field "green". */
function me(overrides: Partial<MeResponse> = {}): MeResponse {
  return {
    userId: "u1",
    firstName: "Ada",
    profileComplete: true,
    verificationStatus: "verified",
    isPremium: false,
    discoveryMode: "all",
    accountStatus: "active",
    consents: [{ consentType: "sensitive_data", version: 1, acceptedAt: "2026-01-01T00:00:00Z" }],
    ...overrides,
  };
}

const consented: Consent[] = [
  { consentType: "sensitive_data", version: 1, acceptedAt: "2026-01-01T00:00:00Z" },
];

describe("resolveRootDestination (M3-002)", () => {
  it("is pure: equal inputs yield equal outputs and mutate nothing", () => {
    const input = me({ profileComplete: false, consents: [] });
    const snapshot = JSON.stringify(input);

    const first = resolveRootDestination(input);
    const second = resolveRootDestination(input);

    expect(first).toBe(second);
    // No field of the argument was written to as a side effect.
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it("accountStatus short-circuits before the profileComplete branch", () => {
    // Suspended AND incomplete AND unconsented: every branch below accountStatus
    // (consent, onboarding) would fire if it were reached. It must not be.
    const suspendedIncomplete = me({
      accountStatus: "suspended",
      profileComplete: false,
      consents: [],
    });
    expect(resolveRootDestination(suspendedIncomplete)).toBe("/blocked");

    // Every non-active status collapses to the same undifferentiated blocker.
    for (const status of ["suspended", "banned", "deleted"] as const) {
      expect(resolveRootDestination(me({ accountStatus: status }))).toBe("/blocked");
    }
  });

  it("routes an active, incomplete, unconsented account to /consent (order after status, before onboarding)", () => {
    expect(
      resolveRootDestination(me({ profileComplete: false, consents: [] })),
    ).toBe("/consent");
  });

  it("routes an active, incomplete, consented account to /onboarding", () => {
    expect(
      resolveRootDestination(me({ profileComplete: false, consents: consented })),
    ).toBe("/onboarding");
  });

  it("maps each verificationStatus of a complete profile to its verify entry", () => {
    expect(resolveRootDestination(me({ verificationStatus: "unverified" }))).toBe(
      "/verify?entry=photos",
    );
    expect(resolveRootDestination(me({ verificationStatus: "pending" }))).toBe(
      "/verify?entry=pending",
    );
    expect(resolveRootDestination(me({ verificationStatus: "mismatch" }))).toBe(
      "/verify?entry=mismatch",
    );
  });

  it("sends a verified account to the mode picker only when discoveryMode is unset", () => {
    expect(resolveRootDestination(me({ discoveryMode: null }))).toBe("/discovery-mode");
    expect(resolveRootDestination(me({ discoveryMode: "all" }))).toBe("/discover");
  });
});
