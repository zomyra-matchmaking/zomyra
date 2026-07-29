/**
 * Shape and rhythm tokens.
 *
 * `radii` covers every corner radius in the app; `spacing` is a 4pt scale.
 *
 * ⚠️ **Spacing is deliberately not yet applied across the screens.** The
 * prototype holds 603 padding/margin/gap literals across 26 distinct values,
 * including odd ones (2, 3, 5, 7, 9, 11, 13). Unlike colour, spacing had no
 * rival-palette problem to fix, and snapping ~150 off-grid values would change
 * layout on every screen at once with no way to verify them all. The scale
 * exists so new work has something to reach for; Modules 3–9 rewrite most of
 * these screens anyway, and each should adopt it as it goes. See MIGRATION §6.
 */

/** Corner radii. `full` is the pill/circle case. */
export const radii = {
  xs: 6,
  sm: 10,
  md: 12,
  /** The most common radius in the app — cards and inputs. */
  lg: 14,
  xl: 16,
  "2xl": 18,
  "3xl": 20,
  "4xl": 24,
  /** Pills, avatars, circular buttons. */
  full: 9999,
} as const;

/** 4pt spacing scale. */
export const spacing = {
  none: 0,
  /** 4 */
  xs: 4,
  /** 8 */
  sm: 8,
  /** 12 */
  md: 12,
  /** 16 — the standard screen gutter. */
  lg: 16,
  /** 20 */
  xl: 20,
  /** 24 */
  "2xl": 24,
  /** 32 */
  "3xl": 32,
  /** 40 */
  "4xl": 40,
} as const;

/**
 * Minimum interactive size. Both platforms' guidance lands at 44pt (iOS HIG)
 * / 48dp (Material); 44 is the safe floor. NFR-6 will audit against this.
 */
export const MIN_TOUCH_TARGET = 44;
