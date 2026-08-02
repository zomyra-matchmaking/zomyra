/**
 * **Treatment #1 of five — the shared default loading state** (MIGRATION §13,
 * FR-3b). The generic fallback for anywhere the spec does *not* name a bespoke
 * pattern: the root gate, auth submits, and Module 5's onboarding catalogues.
 *
 *     <Loading />                                  // inline, unlabelled
 *     <Loading label="Checking your account" />    // inline, with copy
 *     <LoadingScreen label="Getting things ready" />   // full-screen
 *
 * ## What this is *not*, so nobody generalises it into the other four
 *
 * FR-3b is explicit that the shared default is **distinct from Chat/Requests'
 * own spinner**, and §13.1 enumerates four further treatments that are owned
 * elsewhere and exist for their own reasons:
 *
 * | # | Treatment | Owner |
 * |---|---|---|
 * | 2 | Plain spinner → error + Retry (Chat list, message history) | Module 9 |
 * | 3 | Shimmer, content-shaped — a *privacy gate* (Requests, FR-23) | Module 8 |
 * | 4 | Shimmer, layout-stabilising (filter row, Premium plans) | Module 7 |
 * | 5 | Branded logo animation (Discover's card slot, §6.5) | Module 7 |
 *
 * 3 and 4 may share an implementation; they must not share a rationale. Do not
 * fold any of them into this file — the spec says 2 is *deliberately* simpler
 * than Discover's, and unifying them loses the distinction on purpose.
 *
 * ## Two requirements met here rather than retrofitted
 *
 * - **NFR-6a (4) — reduce motion.** `ActivityIndicator` spins regardless of the
 *   OS setting, so when {@link useReduceMotion} reports true this renders a
 *   still ring instead: the "minimal-motion equivalent" the NFR asks for, not a
 *   blank space. A loading state that disappears under reduce-motion is worse
 *   than one that spins.
 * - **NFR-6 / NFR-6a (3) — screen readers.** One `progressbar` node with a
 *   label and `busy` state, announced politely on Android. It deliberately does
 *   **not** set `accessibilityViewIsModal` or hide its siblings: this is an
 *   indicator, not a modal, and a spinner that traps VoiceOver focus strands a
 *   screen-reader user for as long as the request takes.
 *
 * ## Artwork (O-17, §13.4)
 * The owner holds Lottie JSON intended for loading visuals. **Decided in Module
 * 3: the shared default stays token-driven and takes no Lottie**, so no native
 * dependency and no dev-client rebuild is spent here. `lottie-react-native`
 * lands with treatment #5 in Module 7 — the one §13.4 says almost certainly
 * needs supplied artwork — batched with any other native addition. Swapping the
 * interior later is a change to {@link Indicator} alone; every call site below
 * is already expressed as "show the shared default".
 */
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { useReduceMotion } from "@/src/hooks/use-reduce-motion";
import { colors, fontSize, fontWeight, radii, spacing } from "@/src/theme";

export type LoadingSize = "sm" | "md" | "lg";

/** Diameter of the still ring, and the matching `ActivityIndicator` step. */
const DIAMETER: Record<LoadingSize, number> = { sm: 16, md: 24, lg: 36 };
const RING_WIDTH: Record<LoadingSize, number> = { sm: 2, md: 3, lg: 4 };
const NATIVE_SIZE: Record<LoadingSize, "small" | "large"> = {
  sm: "small",
  md: "small",
  lg: "large",
};

export type LoadingProps = {
  size?: LoadingSize;
  /**
   * Announced to screen readers, and rendered as visible copy when
   * {@link showLabel} is left on. Defaults to a generic "Loading" — override it
   * wherever the wait has a knowable subject, since "Loading" tells a
   * non-sighted user strictly less than the screen tells everyone else.
   */
  label?: string;
  /** Set false for a bare indicator that still announces its label. */
  showLabel?: boolean;
  /**
   * Drops the `progressbar` node entirely, leaving only the visual.
   *
   * For the case where an **enclosing control already announces the wait** —
   * `Button` sets `accessibilityState={{ busy }}` on itself, so a second
   * progressbar inside it would merge into the button's label and announce
   * "Send OTP, loading, busy". One announcement, from whichever node the user
   * is actually focused on.
   */
  decorative?: boolean;
  /** Overrides the indicator colour. Defaults to the brand purple. */
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * The moving part, isolated so the reduce-motion branch is the only thing this
 * file has to reason about — and so a future Lottie interior replaces one
 * component rather than every call site.
 */
function Indicator({ size, color }: { size: LoadingSize; color: string }) {
  const reduceMotion = useReduceMotion();

  if (!reduceMotion) {
    return <ActivityIndicator size={NATIVE_SIZE[size]} color={color} />;
  }

  // A still ring with one segment picked out in the indicator colour: it reads
  // as "in progress" at a glance while holding completely still. The rotation
  // is a fixed transform, not an animation — nothing here moves.
  return (
    <View
      style={[
        styles.stillRing,
        {
          width: DIAMETER[size],
          height: DIAMETER[size],
          borderWidth: RING_WIDTH[size],
          borderTopColor: color,
        },
      ]}
    />
  );
}

export function Loading({
  size = "md",
  label = "Loading",
  showLabel = true,
  decorative = false,
  color = colors.brand.default,
  style,
}: LoadingProps) {
  const a11y = decorative
    ? ({ accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" } as const)
    : ({
        // One node, so a screen reader announces "Loading, busy" once rather
        // than walking an indicator and a label separately.
        accessible: true,
        accessibilityRole: "progressbar",
        accessibilityLabel: label,
        accessibilityState: { busy: true },
        // Android announces the label when this mounts without moving focus to
        // it. iOS gets the same effect from the `busy` state above. Note what is
        // *not* here: `accessibilityViewIsModal`, which would trap VoiceOver on
        // this node for the whole of the request (NFR-6).
        accessibilityLiveRegion: "polite",
      } as const);

  return (
    <View style={[styles.inline, style]} {...a11y}>
      <Indicator size={size} color={color} />
      {showLabel && label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

/**
 * The whole-screen form — a launch or a route transition with nothing else on
 * screen yet. The root gate's version check and `GET /me` are its first callers.
 */
export function LoadingScreen({ size = "lg", ...rest }: LoadingProps) {
  return (
    <View style={styles.screen}>
      <Loading size={size} {...rest} />
    </View>
  );
}

const styles = StyleSheet.create({
  inline: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[3],
  },
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    padding: spacing[6],
  },
  stillRing: {
    borderRadius: radii.full,
    borderColor: colors.border.strong,
    // Offsets the picked-out segment off the vertical, so the shape reads as a
    // paused indicator rather than a lopsided circle.
    transform: [{ rotate: "45deg" }],
  },
  label: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text.muted,
    textAlign: "center",
  },
});
