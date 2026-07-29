/**
 * Type scale. The prototype had **19 ad-hoc font sizes and 6 weights** spread
 * across 269 and 215 literals respectively (MIGRATION §3), which is what a
 * mechanical web→RN conversion produces when the target has no CSS variables.
 *
 * The scale below keeps every size that was carrying real weight and drops the
 * five one-offs (9, 17, 19, 24, 34 — 16 occurrences between them), snapping
 * each to its nearest step.
 */

/**
 * Plus Jakarta Sans, registered by `useAppFonts`. One variable TTF is loaded
 * under several family aliases, so `fontWeight` resolves correctly without
 * needing a family name per weight — set `fontFamily` once and vary `weight`.
 */
export const FONT_FAMILY = "PlusJakartaSans";

/** Font sizes, named for the role rather than the pixel value (C-4). */
export const fontSize = {
  /** Badge counts, tick labels. Smallest legible step. */
  nano: 10,
  /** Overline labels, pill text. */
  micro: 11,
  /** Captions, helper text, metadata. */
  caption: 12,
  /** Secondary labels and dense list rows. */
  label: 13,
  /** Default body copy. */
  body: 14,
  /** Emphasised body — the size most CTAs and list titles use. */
  bodyLarge: 15,
  /** Section titles, button labels, input text. */
  title: 16,
  /** Card headings. */
  heading: 18,
  /** Screen subheadings. */
  subtitle: 20,
  /** Screen titles. */
  h2: 22,
  /** Large screen titles. */
  h1: 26,
  /** Hero headings. */
  display: 28,
  /** Splash / match-overlay statement type. */
  displayLarge: 32,
  /** Single largest step — the match celebration. */
  displayXl: 36,
} as const;

/**
 * Weights. RN wants these as strings. `light` (one use) was folded into
 * `regular`; everything else was already in use.
 */
export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
} as const;

/**
 * Line-height multipliers, to be applied as `fontSize.x * lineHeight.y`.
 * RN takes an absolute `lineHeight` in points, not a ratio.
 */
export const lineHeight = {
  /** Headings and single-line labels. */
  tight: 1.2,
  /** Default for stacked UI text. */
  snug: 1.35,
  /** Paragraphs — Terms, Privacy, bio copy. */
  relaxed: 1.55,
} as const;

/** Tracking. Negative on display type, positive on small caps-style overlines. */
export const letterSpacing = {
  tight: -0.4,
  normal: 0,
  wide: 0.3,
  wider: 0.6,
} as const;

export const typography = {
  family: FONT_FAMILY,
  size: fontSize,
  weight: fontWeight,
  lineHeight,
  letterSpacing,
} as const;
