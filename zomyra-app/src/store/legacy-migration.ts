/**
 * One-time import of the Zustand-era persisted state.
 *
 * The prototype wrote two AsyncStorage keys directly — `zomyra.onboarding.v1`
 * (the hand-rolled debounced draft) and `zomyra.discovery-mode.v1`. Module 2
 * moves both under redux-persist's single root key, which means anyone
 * upgrading in place would otherwise silently lose a part-finished onboarding
 * draft: NFR-1's exact failure mode, caused by the code meant to prevent it.
 *
 * Runs as redux-persist's `migrate` hook, so it happens **before** rehydration
 * rather than racing it, and only when there is no redux-persist state yet.
 * The legacy keys are removed once read, so this is genuinely one-time.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PersistedState } from "redux-persist";

import { defaultOnboardingState, type OnboardingState } from "@/src/lib/onboarding/types";
import type { CompatibilityDimension } from "@/src/lib/discover/mock";

const LEGACY_ONBOARDING_KEY = "zomyra.onboarding.v1";
const LEGACY_DISCOVERY_MODE_KEY = "zomyra.discovery-mode.v1";

const VALID_MODES: CompatibilityDimension[] = ["all", "personality", "lifestyle", "priorities"];

type LegacyOnboarding = Partial<{
  state: Partial<OnboardingState>;
  stepIdx: number;
  completed: boolean;
}>;

function parse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function importLegacyState(): Promise<PersistedState> {
  const [rawOnboarding, rawMode] = await Promise.all([
    AsyncStorage.getItem(LEGACY_ONBOARDING_KEY).catch(() => null),
    AsyncStorage.getItem(LEGACY_DISCOVERY_MODE_KEY).catch(() => null),
  ]);

  if (!rawOnboarding && !rawMode) return undefined;

  const legacy = parse<LegacyOnboarding>(rawOnboarding);
  const mode = parse<string>(rawMode);

  const imported = {
    ...(legacy
      ? {
          onboarding: {
            draft: { ...defaultOnboardingState, ...(legacy.state ?? {}) },
            stepIdx: typeof legacy.stepIdx === "number" ? legacy.stepIdx : 0,
            completed: !!legacy.completed,
          },
        }
      : {}),
    ...(mode && VALID_MODES.includes(mode as CompatibilityDimension)
      ? { discoveryMode: { mode: mode as CompatibilityDimension } }
      : {}),
  };

  await Promise.all([
    AsyncStorage.removeItem(LEGACY_ONBOARDING_KEY).catch(() => undefined),
    AsyncStorage.removeItem(LEGACY_DISCOVERY_MODE_KEY).catch(() => undefined),
  ]);

  return imported as PersistedState;
}
