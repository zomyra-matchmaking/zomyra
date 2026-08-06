/**
 * M2-005 — an invalid `EXPO_PUBLIC_APP_ENV` throws rather than silently
 * defaulting to production.
 *
 * Converts the `runtime` case (TEST-CASES.md M2-005) to `build`. Exercised
 * through the exported `parseAppEnvironment` seam: `APP_ENV` reads a value Expo
 * inlines at build time, so the branch cannot be varied per test via that
 * constant, but the guard it guards with lives entirely in this function.
 *
 * The failure mode this guards is specific and asymmetric — an unknown value
 * must *throw*, not fall through to `production`, because a typo'd env that
 * quietly became production is the worst outcome. An empty value is the one
 * benign default and resolves to `mock` (a fresh clone with no `.env`).
 */
import { parseAppEnvironment } from "@/src/config/env";

describe("parseAppEnvironment (M2-005)", () => {
  it("throws on an unknown value rather than defaulting to production", () => {
    expect(() => parseAppEnvironment("nonsense")).toThrow(/not a known environment/i);
    // The defence is that it does not silently become production.
    let resolved: string | undefined;
    try {
      resolved = parseAppEnvironment("prod"); // near-miss typo, still invalid
    } catch {
      resolved = undefined;
    }
    expect(resolved).not.toBe("production");
  });

  it("accepts the three known environments, case- and whitespace-insensitively", () => {
    expect(parseAppEnvironment("mock")).toBe("mock");
    expect(parseAppEnvironment("staging")).toBe("staging");
    expect(parseAppEnvironment("  PRODUCTION ")).toBe("production");
  });

  it("defaults only the empty value, and only to mock", () => {
    expect(parseAppEnvironment("")).toBe("mock");
  });
});
