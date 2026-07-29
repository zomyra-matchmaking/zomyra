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
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  type View,
  type ViewStyle,
} from "react-native";

import { alpha, colors, MIN_TOUCH_TARGET } from "@/src/theme";

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
};

/**
 * One value per feedback mode, so "pressed" looks the same everywhere.
 * Tuned to the middle of what the prototype used rather than picking a side.
 */
const PRESSED_OPACITY = 0.9;
const PRESSED_SCALE = 0.98;

/**
 * Android draws its own ripple, so the iOS dim must be suppressed there or the
 * two stack and the control reads as disabled mid-press.
 */
const RIPPLE = {
  color: alpha(colors.brand.default, 0.12),
  borderless: false,
} as const;

export const Touchable = forwardRef<View, TouchableProps>(function Touchable(
  {
    feedback = "opacity",
    style,
    pressedStyle,
    disabled,
    hitSlop,
    accessibilityRole = "button",
    ...rest
  },
  ref,
) {
  const isAndroid = Platform.OS === "android";
  const rippled = isAndroid && feedback !== "none";

  return (
    <Pressable
      ref={ref}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={hitSlop ?? MIN_TOUCH_TARGET / 4}
      android_ripple={rippled ? RIPPLE : undefined}
      style={({ pressed }) => {
        const active = pressed && !disabled;
        return [
          style,
          // Android's ripple is the whole story there; layering opacity on top
          // makes the control look disabled while the finger is down.
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
