/**
 * M2-004 — concurrent 401s await one in-flight refresh promise.
 *
 * Converts the `static` "read `src/api/base-query.ts`" case (TEST-CASES.md
 * M2-004) to `build`. The property is behavioural — *two requests that 401 at
 * the same moment must trigger exactly one `POST /auth/refresh`* — so it is
 * driven rather than read: fire two `baseQuery` calls without awaiting between
 * them, and count how many times the transport is asked to refresh.
 *
 * The single-use rotating refresh token (BE §9.2) is the reason this matters: a
 * second, parallel refresh replays an already-rotated token and force-logs-out a
 * healthy session, so a regression here is silent until two requests race.
 *
 * The transport (`src/api/mock`) and the token helpers are mocked so the refresh
 * can be counted and made to "succeed" deterministically. `base-query.ts`
 * selects the mock transport under the default `mock` env, so the mocked module
 * is the one it actually calls.
 */
// `mock`-prefixed so jest's hoisted factory may reference them (see jest docs).
const mockRefreshCalls = { count: 0 };
// Per-url attempt counter: a data request 401s the first time and succeeds on
// the retry that follows a refresh.
const mockSeen = new Map<string, number>();

jest.mock("@/src/api/mock", () => ({
  mockBaseQuery: jest.fn(async (args: any) => {
    const url = typeof args === "string" ? args : args.url;
    if (url === "/auth/refresh") {
      mockRefreshCalls.count += 1;
      // Resolve on a later microtask so both callers are parked on the same
      // promise before it settles — the exact race the code guards against.
      await Promise.resolve();
      return { data: { accessToken: "a2", refreshToken: "r2" } };
    }
    const n = (mockSeen.get(url) ?? 0) + 1;
    mockSeen.set(url, n);
    if (n === 1) return { error: { status: 401, data: { error: { code: "unauthorized" } } } };
    return { data: { ok: url } };
  }),
}));

jest.mock("@/src/auth/tokens", () => ({
  loadTokens: jest.fn(async () => {}),
  getRefreshToken: jest.fn(async () => "r1"),
  peekAccessToken: jest.fn(() => "a1"),
  setTokens: jest.fn(async () => {}),
  clearTokens: jest.fn(async () => {}),
}));

// eslint-disable-next-line import/first -- must follow the jest.mock() calls above; they are hoisted, this import must not be
import { baseQuery } from "@/src/api/base-query";

function fakeApi() {
  return {
    getState: () => ({ session: { status: "authenticated" } }),
    dispatch: jest.fn(),
    signal: new AbortController().signal,
    abort: jest.fn(),
    endpoint: "test",
    type: "query" as const,
    forced: false,
    extra: undefined,
  } as any;
}

describe("single in-flight refresh (M2-004)", () => {
  beforeEach(() => {
    mockRefreshCalls.count = 0;
    mockSeen.clear();
  });

  it("triggers exactly one refresh for two concurrent 401s", async () => {
    // Two different endpoints 401 at the same instant.
    const a = baseQuery("/counts", fakeApi(), {});
    const b = baseQuery("/discover", fakeApi(), {});
    const [ra, rb] = await Promise.all([a, b]);

    // Both recovered after the shared refresh…
    expect((ra as any).data).toEqual({ ok: "/counts" });
    expect((rb as any).data).toEqual({ ok: "/discover" });
    // …and the rotating refresh token was spent exactly once.
    expect(mockRefreshCalls.count).toBe(1);
  });
});
