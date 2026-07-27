/**
 * Onboarding store with AsyncStorage-backed checkpoint persistence.
 *
 * We persist manually (instead of using `zustand/middleware`'s `persist`)
 * because the middleware's ESM build references `import.meta.env`, which
 * crashes Metro's web bundle at runtime ("Cannot use 'import.meta' outside
 * a module"). The hand-rolled version is small and works identically on
 * web, iOS and Android.
 *
 * Persists:
 *   - `state`     : all answers entered so far
 *   - `stepIdx`   : the screen index the user is currently on
 *   - `completed` : true once the user finishes the entire flow
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { defaultOnboardingState, type OnboardingState } from "@/src/lib/onboarding/types";

type OnboardingStore = {
  state: OnboardingState;
  stepIdx: number;
  completed: boolean;
  _hasHydrated: boolean;
  set: <K extends keyof OnboardingState>(k: K, v: OnboardingState[K]) => void;
  setStepIdx: (idx: number) => void;
  markCompleted: () => void;
  reset: () => void;
};

const STORAGE_KEY = "zomyra.onboarding.v1";

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  state: defaultOnboardingState,
  stepIdx: 0,
  completed: false,
  _hasHydrated: false,
  set: (k, v) => {
    set((s) => ({ state: { ...s.state, [k]: v } }));
    schedulePersist();
  },
  setStepIdx: (idx) => {
    set({ stepIdx: idx });
    schedulePersist();
  },
  markCompleted: () => {
    set({ completed: true });
    schedulePersist();
  },
  reset: () => {
    set({ state: defaultOnboardingState, stepIdx: 0, completed: false });
    schedulePersist();
  },
}));

// ---- Hydration ----
// Run once on first import: read the persisted snapshot and merge into the
// store. We always flip `_hasHydrated` to true, even on error, so consumers
// don't get stuck on a loading screen.
(async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<{
        state: OnboardingState;
        stepIdx: number;
        completed: boolean;
      }>;
      useOnboardingStore.setState({
        state: { ...defaultOnboardingState, ...(parsed.state ?? {}) },
        stepIdx: typeof parsed.stepIdx === "number" ? parsed.stepIdx : 0,
        completed: !!parsed.completed,
      });
    }
  } catch {
    // ignore — fall back to defaults
  } finally {
    useOnboardingStore.setState({ _hasHydrated: true });
  }
})();

// ---- Debounced persistence ----
let saveTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersist() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const { state, stepIdx, completed } = useOnboardingStore.getState();
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ state, stepIdx, completed }),
      );
    } catch {
      // ignore write errors silently — non-critical
    }
  }, 200);
}
