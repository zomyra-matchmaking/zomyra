/**
 * M2-006 — retargeted (see the note below), a returning user keeps their draft.
 *
 * ⚠️ **This case originally described `legacy-migration.ts`** importing the
 * Zustand-era AsyncStorage keys exactly once. That file was **deliberately
 * removed on 2026-08-02** (MIGRATION §6, "Module 2 addendum — legacy-migration.ts
 * removed"): with no shipped users and a slice shape that Module 5's FR-3b made
 * un-portable, a "successful" import would have pre-filled a form with
 * unsubmittable values. So the original assertion tests behaviour that was
 * removed by design — a *wrong test* under MIGRATION §2.4.2's one exception, and
 * the fix is to the test.
 *
 * What replaced it is a two-part NFR-1 contract, and this suite pins the half
 * M2-006 was really about — *a returning user does not lose their draft to the
 * port*:
 *   - a **same-version** persisted draft rehydrates intact (this case);
 *   - a **pre-v2** draft is discarded rather than silently pass-through
 *     rehydrated — that half is M5-023, and is asserted here too because the two
 *     only make sense together.
 *
 * Driven through the real `store` + `persistor` against seeded AsyncStorage,
 * re-imported per seed with `jest.isolateModulesAsync` so each starts clean.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const PERSIST_KEY = "persist:zomyra.root";

/** redux-persist stores the root as a map of slice-name -> JSON string. */
function seedRoot(version: number, slices: Record<string, unknown>): Record<string, string> {
  const root: Record<string, string> = {};
  for (const [name, value] of Object.entries(slices)) root[name] = JSON.stringify(value);
  root._persist = JSON.stringify({ version, rehydrated: true });
  return root;
}

async function loadStoreWith(persistedRoot: Record<string, string>) {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(PERSIST_KEY, JSON.stringify(persistedRoot));

  let mod!: typeof import("@/src/store");
  await jest.isolateModulesAsync(async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- a dynamic require is the point: a fresh store per seed inside module isolation
    mod = require("@/src/store");
  });

  // Wait for redux-persist to finish reading storage and dispatch REHYDRATE.
  await new Promise<void>((resolve) => {
    if ((mod.store.getState() as any)._persist?.rehydrated) return resolve();
    const unsub = mod.store.subscribe(() => {
      if ((mod.store.getState() as any)._persist?.rehydrated) {
        unsub();
        resolve();
      }
    });
  });
  return mod.store;
}

describe("onboarding draft rehydration (M2-006, cross-ref M5-023)", () => {
  it("keeps a same-version draft across a cold start (returning user)", async () => {
    const store = await loadStoreWith(
      seedRoot(2, { onboarding: { draft: { firstName: "Ada" }, stepIdx: 3, completed: false } }),
    );

    const onboarding = (store.getState() as any).onboarding;
    // The user resumes exactly where they left off — the port did not cost them
    // their progress.
    expect(onboarding.stepIdx).toBe(3);
    expect(onboarding.draft.firstName).toBe("Ada");
  });

  it("discards a pre-v2 draft rather than pass-through rehydrating it (M5-023)", async () => {
    const store = await loadStoreWith(
      seedRoot(1, { onboarding: { draft: { firstName: "Ada" }, stepIdx: 3, completed: false } }),
    );

    const onboarding = (store.getState() as any).onboarding;
    // A v1 draft holds labels where v2 holds catalogue keys and cannot be
    // repaired; createMigrate({ 2: () => undefined }) turns the mismatch into a
    // visible fresh start instead of a silent bad-shape rehydrate.
    expect(onboarding.stepIdx).toBe(0);
    expect(onboarding.draft.firstName).not.toBe("Ada");
  });
});
