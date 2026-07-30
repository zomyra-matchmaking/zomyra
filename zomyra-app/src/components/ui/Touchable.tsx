/**
 * The single press primitive. **Every other touchable in the app builds on
 * this** — screens should not reach for `Pressable` or `TouchableOpacity`
 * directly.
 *
 * ## Why this exists
 * Press feedback is platform convention, not decoration: iOS dims, Android
 * draws a ripple from the touch point. Resolved at the call site, it drifts —
 * the prototype had **7 different press opacities** (0.7 / 0.8 / 0.85 / 0.9 /
 * 0.92 / 0.95 / 1), **5 different scales**, and **no `android_ripple` at all**,
 * so every Android tap got iOS feedback. Deciding it once here means a screen
 * cannot get it wrong, and a future change to how the app responds to touch is
 * a one-file edit — the same argument as C-4, applied to interaction.
 *
 * ## Accessibility (NFR-6)
 * `hitSlop` is expanded to `MIN_TOUCH_TARGET` automatically, so a visually
 * small control still has a 44pt target. Pass `hitSlop={0}` to opt out when the
 * element is already large enough and the slop would overlap a neighbour.
 */
import { forwardRef } from "react";
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from "react-native";

import { alpha, colors } from "@/src/theme";
import { MIN_TOUCH_TARGET } from "@/src/constants";
import { isAndroid } from "@/src/utils/platform";

/** How the control should respond to touch. */
export type TouchableFeedback =
  /** Dim on iOS, ripple on Android. The default, and right for most things. */
  | "opacity"
  /** Dim *and* shrink slightly. For large tappable surfaces — cards, tiles. */
  | "scale"
  /** Tint the background instead of dimming. For list rows on white. */
  | "highlight"
  /** No visual response. Only for controls that animate their own state. */
  | "none";

export type TouchableProps = Omit<PressableProps, "style"> & {
  feedback?: TouchableFeedback;
  style?: StyleProp<ViewStyle>;
  /** Style merged in only while pressed, on top of the feedback. */
  pressedStyle?: StyleProp<ViewStyle>;
  /**
   * The control sits on a dark surface, so the Android ripple must be light.
   * Filled `Button` variants set this; a ripple that matches its background is
   * the same as no feedback at all.
   */
  rippleOnDark?: boolean;
};

/**
 * One value per feedback mode, so "pressed" looks the same everywhere.
 * Tuned to the middle of what the prototype used rather than picking a side.
 */
const PRESSED_OPACITY = 0.9;
const PRESSED_SCALE = 0.98;

/**
 * Ripple colour. Two of them, because a ripple has to contrast with whatever it
 * lands on: a dark wash reads on white surfaces, and disappears entirely on the
 * brand fill. Callers on a dark surface pass `rippleOnDark`.
 */
const RIPPLE_ON_LIGHT = alpha(colors.text.primary, 0.12);
const RIPPLE_ON_DARK = alpha(colors.brand.onBrand, 0.24);


export const Touchable = forwardRef<View, TouchableProps>(function Touchable(
  {
    feedback = "opacity",
    style,
    pressedStyle,
    rippleOnDark,
    disabled,
    hitSlop,
    accessibilityRole = "button",
    ...rest
  },
  ref,
) {
  // `android_ripple` renders as the view's *background drawable*, so an opaque
  // `backgroundColor` on the same view paints straight over it. Verified on the
  // emulator: a primary Button had **no** press feedback at all, because the
  // ripple was hidden behind the brand fill and the dim was being suppressed.
  //
  // Restructuring into a clipping wrapper + transparent inner Pressable does
  // make the ripple show, but it means splitting arbitrary caller styles across
  // two views, which broke layout on the first screen it touched. So: ripple
  // only where it can actually render — on a transparent surface — and fall
  // back to the dim everywhere else. Feedback that works beats feedback that is
  // native but invisible.
  const flat = StyleSheet.flatten(style) as ViewStyle | undefined;
  const bg = flat?.backgroundColor;
  const opaqueSurface = bg !== undefined && bg !== "transparent";
  const rippled = isAndroid && feedback !== "none" && !disabled && !opaqueSurface;

  return (
    <Pressable
      ref={ref}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={hitSlop ?? MIN_TOUCH_TARGET / 4}
      android_ripple={
        rippled
          ? { color: rippleOnDark ? RIPPLE_ON_DARK : RIPPLE_ON_LIGHT, borderless: false }
          : undefined
      }
      style={({ pressed }) => {
        const active = pressed && !disabled;
        return [
          style,
          // Where the ripple renders it is the whole story; layering a dim on
          // top makes the control read as disabled mid-press.
          active && !rippled && feedbackStyle(feedback),
          active && pressedStyle,
        ];
      }}
      {...rest}
    />
  );
});

function feedbackStyle(feedback: TouchableFeedback): ViewStyle | undefined {
  switch (feedback) {
    case "opacity":
      return { opacity: PRESSED_OPACITY };
    case "scale":
      return { opacity: PRESSED_OPACITY, transform: [{ scale: PRESSED_SCALE }] };
    case "highlight":
      return { backgroundColor: colors.surface.brand };
    case "none":
      return undefined;
  }
}
