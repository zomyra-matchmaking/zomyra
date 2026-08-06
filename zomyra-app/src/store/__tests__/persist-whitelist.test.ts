/**
 * M2-001 / M2-003 — what redux-persist actually writes to disk.
 *
 * Converts the two `static` "read `src/store/index.ts`" cases (TEST-CASES.md
 * M2-001, M2-003) to `build`, and tests the behaviour rather than the shape of
 * a constant: the point is not "the whitelist array has N strings" (which breaks
 * the moment someone adds a fourth for a good reason) but "a session/token slice
 * and the RTK Query cache never reach the persisted payload."
 *
 * Driven through the real `store` + `persistor`: dispatching a genuine
 * onboarding action and flushing forces redux-persist to serialize the root to
 * AsyncStorage (the in-memory mock), and the written payload is then inspected.
 *
 * - M2-001 (NFR-2): no `session` slice is persisted — tokens live in
 *   expo-secure-store, and a session record on disk is a security regression.
 * - M2-003 (NFR-11): no `api` (RTK Query cache) is persisted — its cache is
 *   in-memory by design; a full cities table on disk is the failure this guards.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

import { persistor, store } from "@/src/store";
import { setStepIdx } from "@/src/store/slices/onboarding-slice";

const PERSIST_KEY = "persist:zomyra.root";

async function readPersistedRoot(): Promise<Record<string, unknown>> {
  // redux-persist stores the root as a map of slice-name -> JSON string.
  const raw = await AsyncStorage.getItem(PERSIST_KEY);
  expect(raw).toBeTruthy();
  return JSON.parse(raw as string) as Record<string, unknown>;
}

describe("persisted root payload (M2-001, M2-003)", () => {
  it("persists user-work slices but never the session or the API cache", async () => {
    // A real state change on a whitelisted slice, then force the write.
    store.dispatch(setStepIdx(1));
    await persistor.flush();

    const root = await readPersistedRoot();
    const keys = Object.keys(root);

    // The draft (NFR-1) is the thing worth persisting — it must be there, or the
    // absences below would be vacuously true.
    expect(keys).toContain("onboarding");

    // M2-001 — no session/token slice on disk (NFR-2).
    expect(keys).not.toContain("session");

    // M2-003 — no RTK Query cache on disk (NFR-11).
    expect(keys).not.toContain("api");
  });

  it("writes no keychain-style key to AsyncStorage at all", async () => {
    // Tokens are expo-secure-store's job; nothing token-shaped may reach the
    // general KV store. Belt-and-braces against a future slice leaking one.
    const allKeys = await AsyncStorage.getAllKeys();
    expect(allKeys.some((k) => /token|refresh|access/i.test(k))).toBe(false);
  });
});
