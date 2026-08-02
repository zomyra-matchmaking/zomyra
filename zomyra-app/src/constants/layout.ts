/**
 * Fixed layout measurements.
 *
 * The line against `src/theme`: **the theme holds scales you choose a step
 * from; constants hold values with exactly one right answer.** `spacing[4]` is
 * a design decision and could reasonably be `spacing[5]`; the floating nav is
 * as tall as it is, and the number that clears it is not a matter of taste.
 *
 * Screen-local measurements stay in their screen — `ROW_ICON_INSET` in
 * `app/profile.tsx` and `MENU_TOP_OFFSET` in `app/chats/[id].tsx` are each used
 * once, and hoisting single-use values here would turn this into a junk drawer.
 * A value earns a place here by being shared, or by being a platform rule.
 */

/**
 * Bottom padding a scrolling screen needs so its last row clears the floating
 * nav (`FloatingTabBar` is absolutely positioned over the content).
 *
 * It was a bare `120` in three screens and `110` in a fourth — the odd one out
 * being `app/profile.tsx`, where the last row sat 10pt higher than everywhere
 * else for no stated reason.
 */
export const NAV_CLEARANCE = 120;

/**
 * Minimum interactive size. Both platforms' guidance lands at 44pt (iOS HIG)
 * / 48dp (Material); 44 is the safe floor. `Touchable` expands `hitSlop` to
 * reach it, and NFR-6 will audit against it in Module 12.
 */
export const MIN_TOUCH_TARGET = 44;
