/**
 * The design system's public entry point. Import from `@/src/theme`:
 *
 *     import { colors, radii, spacing, fontSize, fontWeight } from "@/src/theme";
 *
 * `src/theme/palette.ts` is the private layer underneath and is off-limits to
 * everything outside this directory (C-4, enforced in `eslint.config.js`).
 */
export { colors, shadows, alpha } from "./colors";
export { radii, spacing, MIN_TOUCH_TARGET, NAV_CLEARANCE } from "./layout";
export {
  typography,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  FONT_FAMILY,
} from "./typography";
