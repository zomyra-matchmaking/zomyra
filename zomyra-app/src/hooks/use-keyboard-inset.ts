/**
 * How much of the screen the keyboard is currently covering, in points.
 *
 * ## Why this exists when `KeyboardAvoidingView` already does
 *
 * It does not do it *completely* on this project's Android configuration, and
 * the shortfall is measurable. Module 3 established that `edgeToEdgeEnabled`
 * (mandatory from Android 15) lays the window out **behind** the IME, so
 * `adjustResize` does nothing and `KeyboardAvoidingView` has to shrink the tree
 * itself. What Module 4 measured on the emulator is that it only reclaims
 * *part* of the keyboard's height:
 *
 * | Screen | Element | No keyboard | Keyboard open | Keyboard height |
 * |---|---|---|---|---|
 * | `phone.tsx` | footer text | 1917px | 1317px | 1055px |
 *
 * — a 600px correction for a 1055px keyboard, leaving ~455px unaccounted for.
 * `phone.tsx` survives that because its CTA sits directly beneath the input and
 * had 483px of slack to give. `otp.tsx` did not: its CTA was pinned to the
 * bottom behind a full-height spacer, so the whole shortfall came off the
 * button and it ended up **entirely behind the keypad** — six digits entered
 * and no way to submit.
 *
 * `Keyboard`'s own `endCoordinates.height` is the IME's real height, reported
 * by the platform rather than derived from a window measurement, so it does not
 * inherit that error. Applying it as `paddingBottom` keeps a bottom-anchored
 * CTA anchored when there is no keyboard and lifts it to sit just above one
 * when there is.
 *
 * ⚠️ **Do not combine this with `KeyboardAvoidingView` on the same subtree** —
 * both would apply an offset and the content would jump twice as far. A screen
 * uses one or the other. The five screens Module 3 verified keep the KAV,
 * because it demonstrably works for their layouts and swapping them would be
 * re-opening something already settled on evidence.
 *
 * iOS listens to the `Will` events so the movement rides the keyboard's own
 * animation; Android only emits the `Did` pair.
 */
import { useEffect, useState } from "react";
import { Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { isIOS } from "@/src/utils/platform";

export function useKeyboardInset(): number {
  /*
   * ⚠️ **Android's reported height is short by the navigation bar.**
   *
   * Measured on the emulator: the keypad visually occupies 299dp, and
   * `endCoordinates.height` reports 268dp. The missing ~31dp is the gesture bar
   * — under `edgeToEdgeEnabled` the app draws *beneath* it, so it is part of
   * what the keyboard covers but not part of what the keyboard reports. Without
   * this correction the CTA lands right on the keypad's edge, clipped.
   *
   * **iOS needs no such correction and must not get one**: there
   * `endCoordinates.height` already includes the home-indicator area, so adding
   * the inset again would leave a visible gap.
   */
  const safeArea = useSafeAreaInsets();
  const bottomChrome = isIOS ? 0 : safeArea.bottom;
  /*
   * ⚠️ **Seeded from `Keyboard.metrics()`, and that is not belt-and-braces.**
   *
   * Listeners only report *transitions*. This screen is pushed from
   * `phone.tsx` with the keyboard **already open**, so it mounts, never sees a
   * `keyboardDidShow`, and sits at an inset of 0 — which is the exact state the
   * bug was in. Verified on the emulator: dismissing and re-raising the
   * keyboard made the CTA jump into place, which is what identified this.
   *
   * `Keyboard.metrics()` returns the frame the platform is currently reporting,
   * so a screen that arrives mid-keyboard starts correct instead of one
   * interaction late.
   */
  const [inset, setInset] = useState(() => Keyboard.metrics()?.height ?? 0);

  useEffect(() => {
    const showEvent = isIOS ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = isIOS ? "keyboardWillHide" : "keyboardDidHide";

    const show = Keyboard.addListener(showEvent, (event) => {
      setInset(event.endCoordinates?.height ?? 0);
    });
    const hide = Keyboard.addListener(hideEvent, () => setInset(0));

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Zero stays exactly zero: with no keyboard the screen's own safe-area
  // handling owns the bottom edge, and adding to it here would double it.
  return inset > 0 ? inset + bottomChrome : 0;
}
