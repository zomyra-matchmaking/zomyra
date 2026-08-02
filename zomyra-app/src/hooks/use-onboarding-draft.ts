/**
 * The onboarding draft, as a controller hook.
 *
 * FE TDD §4.1 puts business logic in hooks rather than in screens, with the
 * store as the model underneath. This one exists mainly so screens keep the
 * one-line `set("city", value)` call they had under Zustand — the generic
 * signature is what makes that assignment type-safe, and reconstructing it at
 * every call site would mean either a cast or a `dispatch(setField({...}))`
 * whose key and value are unrelated as far as the compiler is concerned.
 */
import { useCallback } from "react";

import type { OnboardingState } from "@/src/lib/onboarding/types";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import { setField, type FieldPayload } from "@/src/store/slices/onboarding-slice";

export function useOnboardingDraft() {
  const dispatch = useAppDispatch();
  const draft = useAppSelector((s) => s.onboarding.draft);

  const set = useCallback(
    <K extends keyof OnboardingState>(key: K, value: OnboardingState[K]) => {
      dispatch(setField({ key, value } as FieldPayload));
    },
    [dispatch],
  );

  return { draft, set };
}
