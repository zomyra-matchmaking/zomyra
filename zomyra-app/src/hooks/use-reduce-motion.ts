/**
 * The OS "reduce motion" setting, as a boolean that stays current (NFR-6a (4)).
 *
 * Lives here rather than inside `Loading` because **five loading treatments
 * exist across the spec and every one of them animates** (MIGRATION §13.1):
 * the shared default (this module's), Chat's plain spinner (Module 9), two
 * shimmers (Modules 7 and 8) and the branded logo animation (Module 7) — plus
 * the match celebration and card transitions NFR-6a names directly. A hook
 * shared from the start is the difference between one check and seven.
 *
 * ⚠️ **Read the setting; do not infer it.** iOS exposes it as Settings →
 * Accessibility → Motion → Reduce Motion, Android as Settings →
 * Accessibility → Remove animations. Neither is derivable from anything else
 * the app knows, and neither is honoured automatically by `ActivityIndicator`,
 * Reanimated, or Lottie — each has to ask.
 */
import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export function useReduceMotion(): boolean {
  // Starts `false` and corrects itself on the first tick. The alternative —
  // holding render until the async read resolves — would flash a blank frame on
  // every screen that animates, for a setting most users do not have on.
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduceMotion(enabled);
    });

    // The setting is changeable while the app is running — a user who turns it
    // on mid-session gets the still frame without a relaunch.
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
