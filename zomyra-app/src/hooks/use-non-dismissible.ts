/**
 * Swallows the Android hardware back button while a screen is focused.
 *
 * Two screens in this app are specified as **non-dismissible**, and both mean
 * it literally: FR-30's "Update required" and FE §8.1's account-status blocker.
 * Removing the back-stack entry (`router.replace`) and disabling the iOS swipe
 * gesture covers everything except Android's hardware/gesture back, which is
 * still live and would pop the user out to whatever was underneath.
 *
 * ⚠️ **This does not — and must not — prevent leaving the app.** Returning
 * `true` from the handler stops the *navigation*; the user can still background
 * or force-quit. FE §8 records that as the accepted trade-off for the blocker:
 * a deliberate dead end with no in-app escape, flagged in the spec's own open
 * items in case a minimal exit is wanted later. Do not "fix" it here — it is a
 * product decision, not an oversight.
 */
import { useEffect } from "react";
import { BackHandler } from "react-native";

export function useNonDismissible(): void {
  useEffect(() => {
    // `true` = handled, stop propagating. The default handler, which pops the
    // stack or exits, never runs.
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => subscription.remove();
  }, []);
}
