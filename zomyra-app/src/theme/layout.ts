/**
 * Shape and rhythm tokens. `radii` covers every corner radius in the app;
 * `spacing` covers every padding, margin and gap.
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

/**
 * Spacing scale. **The key is a step index, not a pixel value** — `spacing[4]`
 * is four steps, which happens to be 16pt. Changing `STEP` below rescales the
 * app's entire rhythm from one line, which is the same property C-4 asks of the
 * colour tokens.
 *
 * ## Why these steps
 * This is **Tailwind's default spacing scale, kept verbatim** — the same
 * reasoning as the grey ramp in `palette.ts`. MIGRATION §3 records that this
 * app was a Vite/React/Tailwind web project before Emergent converted it, and
 * the spacing survived the conversion just as the colours did: counted across
 * 603 literals, the values were 2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 ·
 * 28 · 32 · 40, which is exactly Tailwind's `0.5 1 1.5 2 2.5 3 3.5 4 5 6 7 8 10`.
 *
 * So the app is on a **2pt grid**, not the 4pt one an earlier draft of this file
 * assumed. Adopting the real grid makes the migration a substitution instead of
 * a re-design — forcing 4pt would have meant moving 6 → 8, 10 → 12 and 14 → 16
 * on ~200 elements, which is a visible layout change on every screen.
 *
 * `4.5` is the one step Tailwind does not ship. It is here because 18pt has 17
 * uses in this codebase and snapping them away would have been a change for the
 * sake of matching someone else's table.
 */
const STEP = 4;
const s = (n: number) => n * STEP;

export const spacing = {
  0: s(0),
  /** 2 — hairline gaps: icon-to-label on small chips, badge insets. */
  0.5: s(0.5),
  /** 4 */
  1: s(1),
  /** 6 */
  1.5: s(1.5),
  /** 8 — the most common gap in the app. */
  2: s(2),
  /** 10 */
  2.5: s(2.5),
  /** 12 */
  3: s(3),
  /** 14 */
  3.5: s(3.5),
  /** 16 — the standard screen gutter. */
  4: s(4),
  /** 18 — not a Tailwind step; earned its place, see above. */
  4.5: s(4.5),
  /** 20 */
  5: s(5),
  /** 24 */
  6: s(6),
  /** 28 */
  7: s(7),
  /** 32 */
  8: s(8),
  /** 40 */
  10: s(10),
} as const;

/**
 * Minimum interactive size. Both platforms' guidance lands at 44pt (iOS HIG)
 * / 48dp (Material); 44 is the safe floor. NFR-6 will audit against this.
 */
export const MIN_TOUCH_TARGET = 44;

/**
 * Bottom padding a scrolling screen needs so its last row clears the floating
 * nav (`FloatingNav` is absolutely positioned over the content).
 *
 * It was a bare `120` in three screens and `110` in a fourth — the odd one out
 * being `app/profile.tsx`, where the last row sat 10pt higher than everywhere
 * else for no stated reason.
 */
export const NAV_CLEARANCE = 120;
